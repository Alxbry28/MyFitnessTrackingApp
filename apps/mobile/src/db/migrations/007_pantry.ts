import type { SQLiteDatabase } from "expo-sqlite";

// batch_id has no foreign key yet: the batches table arrives with feature 12.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE pantry_items (
      id          TEXT PRIMARY KEY,
      kind        TEXT NOT NULL CHECK (kind IN ('packaged','supplement','batch')),
      product_id  TEXT REFERENCES products(id),
      batch_id    TEXT,
      status      TEXT NOT NULL DEFAULT 'sealed'
                  CHECK (status IN ('sealed','opened','active','finished','discarded','expired')),
      location    TEXT NOT NULL DEFAULT 'cupboard' CHECK (location IN ('fridge','freezer','cupboard')),
      opened_at   TEXT,
      expires_at  TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      deleted_at  TEXT
    );
    CREATE UNIQUE INDEX ux_pantry_packaged_product ON pantry_items(product_id)
      WHERE kind = 'packaged' AND deleted_at IS NULL;
    CREATE TABLE stock_movements (
      id                 TEXT PRIMARY KEY,
      pantry_item_id     TEXT NOT NULL REFERENCES pantry_items(id),
      occurred_at        TEXT NOT NULL,
      delta_units        REAL,
      delta_grams        REAL NOT NULL,
      reason             TEXT NOT NULL CHECK (reason IN ('bought','cooked','eaten','used_in_cooking',
                           'shared','discarded','spilled','adjustment')),
      food_log_entry_id  TEXT REFERENCES food_log_entries(id),
      batch_id           TEXT,
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL,
      deleted_at         TEXT
    );
    CREATE INDEX ix_movements_item ON stock_movements(pantry_item_id) WHERE deleted_at IS NULL;
    ALTER TABLE food_log_entries ADD COLUMN pantry_item_id TEXT REFERENCES pantry_items(id);
  `);
}
