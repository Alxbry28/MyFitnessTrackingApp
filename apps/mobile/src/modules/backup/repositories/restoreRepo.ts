import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { migrations } from "@/db/migrations";

import { BACKUP_TABLES, type BackupRows, type BackupTable } from "./backupRepo";

type Cell = string | number | null;

// Column names come from the schema, never from the backup file, so they're safe to interpolate.
async function columnsOf(db: SQLiteDatabase, table: BackupTable): Promise<string[]> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return columns.map((c) => c.name);
}

function cell(row: Record<string, unknown>, column: string): Cell {
  const value = Object.hasOwn(row, column) ? row[column] : null;
  return typeof value === "string" || typeof value === "number" ? value : null;
}

// Rebuilds the backup's schema in memory, loads its rows, then runs the newer
// migrations so an older backup comes out in today's shape (DATABASE.md §6).
export async function migrateRows(tables: BackupRows, schemaVersion: number): Promise<BackupRows> {
  const scratch = await openDatabaseAsync(":memory:");
  try {
    for (const m of migrations) if (m.version <= schemaVersion) await m.up(scratch);
    for (const table of BACKUP_TABLES) {
      const rows = tables[table];
      if (rows.length === 0) continue;
      const columns = await columnsOf(scratch, table);
      if (columns.length === 0) throw new Error(`Backup has rows for ${table} before it existed`);
      for (const row of rows) {
        // Only the columns this schema version has; anything else in the file is ignored.
        const keys = columns.filter((c) => Object.hasOwn(row, c));
        if (keys.length === 0) continue;
        await scratch.runAsync(
          `INSERT INTO ${table} (${keys.map((k) => `"${k}"`).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`,
          keys.map((k) => cell(row, k)),
        );
      }
    }
    for (const m of migrations) if (m.version > schemaVersion) await m.up(scratch);

    const migrated = {} as BackupRows;
    for (const table of BACKUP_TABLES) {
      migrated[table] = await scratch.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
    }
    return migrated;
  } finally {
    await scratch.closeAsync();
  }
}

// One exclusive transaction: children are deleted before parents and inserted after them,
// references are checked before commit, and any failure leaves the phone's data untouched.
export async function replaceAll(db: SQLiteDatabase, tables: BackupRows): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const table of [...BACKUP_TABLES].reverse()) {
      await txn.runAsync(`DELETE FROM ${table}`);
    }
    for (const table of BACKUP_TABLES) {
      const rows = tables[table];
      if (rows.length === 0) continue;
      const columns = await columnsOf(txn, table);
      const statement = await txn.prepareAsync(
        `INSERT INTO ${table} (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
      );
      try {
        for (const row of rows) await statement.executeAsync(columns.map((c) => cell(row, c)));
      } finally {
        await statement.finalizeAsync();
      }
    }
    // The exclusive transaction runs on its own connection, where foreign keys are off and
    // can't be switched on mid-transaction, so broken references are checked before commit.
    const broken = await txn.getAllAsync("PRAGMA foreign_key_check");
    if (broken.length > 0) throw new Error("Backup rows reference missing rows");
  });
}
