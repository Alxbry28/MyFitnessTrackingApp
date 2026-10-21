import type { SQLiteDatabase } from "expo-sqlite";

// Fixed list: table names are never built from input. Parents come before the tables that
// reference them, because restore inserts in this order and deletes in reverse.
export const BACKUP_TABLES = [
  "products",
  "pantry_items",
  "food_log_entries",
  "stock_movements",
  "settings",
  "body_profile",
  "import_runs",
  "body_weight_entries",
  "text_log_matches",
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
