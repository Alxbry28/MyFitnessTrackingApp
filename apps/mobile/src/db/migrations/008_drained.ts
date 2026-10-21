import type { SQLiteDatabase } from "expo-sqlite";

// Drained values are what counts when a product is eaten drained (canned tuna); the label
// values stay for the record and for stock in net weight.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE products ADD COLUMN eaten_drained INTEGER NOT NULL DEFAULT 0 CHECK (eaten_drained IN (0,1));
    ALTER TABLE products ADD COLUMN drained_kcal_per_100g REAL;
    ALTER TABLE products ADD COLUMN drained_protein_per_100g REAL;
    ALTER TABLE products ADD COLUMN drained_carbs_per_100g REAL;
    ALTER TABLE products ADD COLUMN drained_fat_per_100g REAL;
    ALTER TABLE products ADD COLUMN usual_drained_g REAL;
  `);
}
