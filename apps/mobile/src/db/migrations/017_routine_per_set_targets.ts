import type { SQLiteDatabase } from "expo-sqlite";

// Feature 19 / Routine per-set target weight and reps customization.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE workout_routine_exercises ADD COLUMN sets_data TEXT;
  `);
}
