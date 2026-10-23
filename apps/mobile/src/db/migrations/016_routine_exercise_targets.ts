import type { SQLiteDatabase } from "expo-sqlite";

// Feature 19 / Routine exercise target sets, reps, and weight.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE workout_routine_exercises ADD COLUMN target_reps INTEGER NOT NULL DEFAULT 10;
    ALTER TABLE workout_routine_exercises ADD COLUMN target_weight_kg REAL NOT NULL DEFAULT 0;
  `);
}
