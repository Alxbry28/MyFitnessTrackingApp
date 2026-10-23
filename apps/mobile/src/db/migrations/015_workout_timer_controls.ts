import type { SQLiteDatabase } from "expo-sqlite";

// Feature 19 / Workout timer controls: pause, resume, restart, and elapsed time tracking.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE workout_sessions ADD COLUMN is_paused INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE workout_sessions ADD COLUMN elapsed_sec INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE workout_sessions ADD COLUMN last_resumed_at TEXT;
  `);

  // Initialize existing active sessions with last_resumed_at = started_at
  await db.runAsync(
    `UPDATE workout_sessions SET last_resumed_at = started_at WHERE last_resumed_at IS NULL`,
  );
}
