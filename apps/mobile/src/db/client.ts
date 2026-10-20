import type { SQLiteDatabase } from "expo-sqlite";

import { migrations } from "./migrations";

export const DATABASE_NAME = "fitness.db";

// Passed to SQLiteProvider's onInit, so it runs once before any screen renders.
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  // foreign_keys is per connection and is a no-op inside a transaction, so set it first.
  await db.execAsync("PRAGMA foreign_keys = ON");

  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  let current = row?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= current) continue;
    // user_version lives in the file header and rolls back with the transaction,
    // so a failed migration leaves both the schema and the version untouched.
    // Nothing else queries during onInit, so the shared connection is safe here.
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
    current = migration.version;
  }
}
