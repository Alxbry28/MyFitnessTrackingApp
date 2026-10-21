import type { SQLiteDatabase } from "expo-sqlite";

// Feature 12: Recipes and cooked batches.
// Adds recipes, recipe_ingredients, batches, batch_ingredients and updated_by_settle flag.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE recipes (
      id                    TEXT PRIMARY KEY,
      name                  TEXT NOT NULL,
      notes                 TEXT,
      learned_cooked_ratio  REAL,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL,
      deleted_at            TEXT
    );

    CREATE TABLE recipe_ingredients (
      id            TEXT PRIMARY KEY,
      recipe_id     TEXT NOT NULL REFERENCES recipes(id),
      product_id    TEXT NOT NULL REFERENCES products(id),
      raw_grams     REAL NOT NULL,
      is_estimated  INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      deleted_at    TEXT
    );

    CREATE INDEX ix_recipe_ingredients_recipe ON recipe_ingredients(recipe_id) WHERE deleted_at IS NULL;

    CREATE TABLE batches (
      id                TEXT PRIMARY KEY,
      recipe_id         TEXT REFERENCES recipes(id),
      name              TEXT NOT NULL,
      cooked_at         TEXT NOT NULL,
      cooked_weight_g   REAL NOT NULL,
      weight_method     TEXT NOT NULL CHECK (weight_method IN ('settled','weighed_parts','estimated')),
      is_settled        INTEGER NOT NULL DEFAULT 0,
      kcal_per_100g     REAL NOT NULL,
      protein_per_100g  REAL NOT NULL,
      carbs_per_100g    REAL NOT NULL,
      fat_per_100g      REAL NOT NULL,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL,
      deleted_at        TEXT
    );

    CREATE TABLE batch_ingredients (
      id                TEXT PRIMARY KEY,
      batch_id          TEXT NOT NULL REFERENCES batches(id),
      product_id        TEXT NOT NULL REFERENCES products(id),
      raw_grams         REAL NOT NULL,
      kcal_per_100g     REAL NOT NULL,
      protein_per_100g  REAL NOT NULL,
      carbs_per_100g    REAL NOT NULL,
      fat_per_100g      REAL NOT NULL,
      is_estimated      INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL,
      deleted_at        TEXT
    );

    CREATE INDEX ix_batch_ingredients_batch ON batch_ingredients(batch_id) WHERE deleted_at IS NULL;

    ALTER TABLE food_log_entries ADD COLUMN updated_by_settle INTEGER NOT NULL DEFAULT 0;
  `);
}
