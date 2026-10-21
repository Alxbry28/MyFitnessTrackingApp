import type { SQLiteDatabase } from "expo-sqlite";

// Adds unit column to pantry_items so supplements can be counted in grams (powder),
// tabs (tablets) or caps (capsules).
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE pantry_items ADD COLUMN unit TEXT NOT NULL DEFAULT 'g';
  `);
}
