import type { SQLiteDatabase } from "expo-sqlite";

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE products (
      id                TEXT PRIMARY KEY,
      barcode           TEXT,
      name              TEXT NOT NULL,
      brand             TEXT,
      serving_size      TEXT,
      serving_grams     REAL,
      kcal_per_100g     REAL NOT NULL CHECK (kcal_per_100g >= 0),
      protein_per_100g  REAL CHECK (protein_per_100g >= 0),
      carbs_per_100g    REAL CHECK (carbs_per_100g >= 0),
      fat_per_100g      REAL CHECK (fat_per_100g >= 0),
      net_weight_g      REAL,
      source            TEXT NOT NULL CHECK (source IN ('manual','open_food_facts','ai_estimate')),
      is_favorite       INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL,
      deleted_at        TEXT
    );
    CREATE UNIQUE INDEX ux_products_barcode ON products(barcode)
      WHERE barcode IS NOT NULL AND deleted_at IS NULL;
    CREATE INDEX ix_products_name ON products(name COLLATE NOCASE);
  `);
}
