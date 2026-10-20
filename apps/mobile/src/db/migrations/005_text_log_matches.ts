import type { SQLiteDatabase } from "expo-sqlite";

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE text_log_matches (
      id          TEXT PRIMARY KEY,
      name_key    TEXT NOT NULL,
      product_id  TEXT NOT NULL REFERENCES products(id),
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      deleted_at  TEXT
    );
    CREATE UNIQUE INDEX ux_text_log_match_key ON text_log_matches(name_key) WHERE deleted_at IS NULL;
  `);
}
