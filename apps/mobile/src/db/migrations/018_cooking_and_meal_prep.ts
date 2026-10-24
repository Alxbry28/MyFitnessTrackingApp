import type { SQLiteDatabase } from "expo-sqlite";

// Feature 18: Cooking workflow and Meal Prep tupperware inventory.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE batches ADD COLUMN cook_time_seconds INTEGER;

    CREATE TABLE IF NOT EXISTS meal_preps (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      tupperware_count  INTEGER NOT NULL,
      tupperwares_left  INTEGER NOT NULL,
      net_weight_g      REAL NOT NULL,
      kcal_per_box      REAL NOT NULL,
      protein_per_box   REAL NOT NULL,
      carbs_per_box     REAL NOT NULL,
      fat_per_box       REAL NOT NULL,
      partition_method  TEXT NOT NULL CHECK (partition_method IN ('equal','manual','ai')),
      ai_prompt         TEXT,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL,
      deleted_at        TEXT
    );

    CREATE TABLE IF NOT EXISTS meal_prep_items (
      id              TEXT PRIMARY KEY,
      meal_prep_id    TEXT NOT NULL REFERENCES meal_preps(id),
      food_name       TEXT NOT NULL,
      grams_per_box   REAL NOT NULL,
      product_id      TEXT REFERENCES products(id),
      batch_id        TEXT REFERENCES batches(id),
      pantry_item_id  TEXT REFERENCES pantry_items(id),
      kcal            REAL NOT NULL,
      protein         REAL NOT NULL,
      carbs           REAL NOT NULL,
      fat             REAL NOT NULL,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      deleted_at      TEXT
    );

    CREATE INDEX IF NOT EXISTS ix_meal_prep_items_prep ON meal_prep_items(meal_prep_id) WHERE deleted_at IS NULL;
  `);
}
