import type { SQLiteDatabase } from "expo-sqlite";

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE food_log_entries (
      id                TEXT PRIMARY KEY,
      day               TEXT NOT NULL,
      logged_at         TEXT NOT NULL,
      meal_type         TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
      product_id        TEXT REFERENCES products(id),
      product_name      TEXT NOT NULL,
      grams             REAL NOT NULL CHECK (grams > 0),
      kcal_per_100g     REAL NOT NULL,
      protein_per_100g  REAL,
      carbs_per_100g    REAL,
      fat_per_100g      REAL,
      kcal              REAL NOT NULL,
      protein_g         REAL,
      carbs_g           REAL,
      fat_g             REAL,
      notes             TEXT,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL,
      deleted_at        TEXT
    );
    CREATE INDEX ix_log_day ON food_log_entries(day) WHERE deleted_at IS NULL;
    CREATE INDEX ix_log_product_recent ON food_log_entries(product_id, logged_at);
  `);
}
