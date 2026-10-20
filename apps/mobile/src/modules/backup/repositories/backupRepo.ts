import type { SQLiteDatabase } from "expo-sqlite";

// Fixed list: table names are never built from input. Order matches DATABASE.md §6.
export const BACKUP_TABLES = [
  "products",
  "food_log_entries",
  "settings",
  "body_profile",
  "import_runs",
  "body_weight_entries",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];
export type BackupRows = Record<BackupTable, Record<string, unknown>[]>;

// Reads every row, soft-deleted ones included, so a restore and later sync stay consistent.
export async function readAll(db: SQLiteDatabase): Promise<{ tables: BackupRows; schemaVersion: number }> {
  const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const tables = {} as BackupRows;
  for (const table of BACKUP_TABLES) {
    tables[table] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
  }
  return { tables, schemaVersion: version?.user_version ?? 0 };
}
