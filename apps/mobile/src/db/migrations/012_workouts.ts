import type { SQLiteDatabase } from "expo-sqlite";

// Feature 19: Workouts.
// Tables: exercises, workout_sessions, workout_sets.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE exercises (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      muscle_group   TEXT NOT NULL CHECK (muscle_group IN ('chest','back','legs','shoulders','arms','core','full_body')),
      equipment      TEXT NOT NULL CHECK (equipment IN ('barbell','dumbbell','machine','cable','bodyweight','other')),
      is_bodyweight  INTEGER NOT NULL DEFAULT 0,
      guide_id       TEXT,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL,
      deleted_at     TEXT
    );

    CREATE INDEX ix_exercises_muscle ON exercises(muscle_group) WHERE deleted_at IS NULL;
    CREATE INDEX ix_exercises_name ON exercises(name COLLATE NOCASE) WHERE deleted_at IS NULL;

    CREATE TABLE workout_sessions (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      started_at  TEXT NOT NULL,
      ended_at    TEXT,
      notes       TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      deleted_at  TEXT
    );

    CREATE INDEX ix_workout_sessions_started ON workout_sessions(started_at DESC) WHERE deleted_at IS NULL;

    CREATE TABLE workout_sets (
      id            TEXT PRIMARY KEY,
      session_id    TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      exercise_id   TEXT NOT NULL REFERENCES exercises(id),
      set_number    INTEGER NOT NULL,
      reps          INTEGER,
      weight_kg     REAL,
      duration_sec  INTEGER,
      rpe           REAL,
      is_warmup     INTEGER NOT NULL DEFAULT 0,
      is_completed  INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      deleted_at    TEXT
    );

    CREATE INDEX ix_workout_sets_session ON workout_sets(session_id) WHERE deleted_at IS NULL;
    CREATE INDEX ix_workout_sets_exercise ON workout_sets(exercise_id, created_at DESC) WHERE deleted_at IS NULL;
  `);

  const now = new Date().toISOString();
  const defaultExercises = [
    { id: "ex_bench_press", name: "Barbell Bench Press", muscle: "chest", equip: "barbell", bw: 0, guide: "bench-press" },
    { id: "ex_incline_db_press", name: "Incline Dumbbell Press", muscle: "chest", equip: "dumbbell", bw: 0, guide: "incline-dumbbell-bench-press" },
    { id: "ex_push_up", name: "Push-up", muscle: "chest", equip: "bodyweight", bw: 1, guide: "push-up" },
    { id: "ex_squat", name: "Barbell Back Squat", muscle: "legs", equip: "barbell", bw: 0, guide: "squat" },
    { id: "ex_leg_press", name: "Leg Press", muscle: "legs", equip: "machine", bw: 0, guide: "leg-press" },
    { id: "ex_rdl", name: "Romanian Deadlift", muscle: "legs", equip: "barbell", bw: 0, guide: "romanian-deadlift" },
    { id: "ex_deadlift", name: "Conventional Deadlift", muscle: "back", equip: "barbell", bw: 0, guide: "deadlift" },
    { id: "ex_pull_up", name: "Pull-up", muscle: "back", equip: "bodyweight", bw: 1, guide: "pull-up" },
    { id: "ex_barbell_row", name: "Barbell Bent Over Row", muscle: "back", equip: "barbell", bw: 0, guide: "bent-over-row" },
    { id: "ex_lat_pulldown", name: "Lat Pulldown", muscle: "back", equip: "cable", bw: 0, guide: "lat-pulldown" },
    { id: "ex_ohp", name: "Overhead Press", muscle: "shoulders", equip: "barbell", bw: 0, guide: "shoulder-press" },
    { id: "ex_lateral_raise", name: "Dumbbell Lateral Raise", muscle: "shoulders", equip: "dumbbell", bw: 0, guide: "lateral-raise" },
    { id: "ex_bicep_curl", name: "Dumbbell Bicep Curl", muscle: "arms", equip: "dumbbell", bw: 0, guide: "bicep-curl" },
    { id: "ex_tricep_pushdown", name: "Tricep Pushdown", muscle: "arms", equip: "cable", bw: 0, guide: "tricep-pushdown" },
    { id: "ex_dip", name: "Parallel Bar Dip", muscle: "arms", equip: "bodyweight", bw: 1, guide: "dip" },
    { id: "ex_leg_raise", name: "Hanging Leg Raise", muscle: "core", equip: "bodyweight", bw: 1, guide: "hanging-leg-raise" },
    { id: "ex_plank", name: "Plank", muscle: "core", equip: "bodyweight", bw: 1, guide: "plank" },
  ];

  for (const ex of defaultExercises) {
    await db.runAsync(
      `INSERT INTO exercises (id, name, muscle_group, equipment, is_bodyweight, guide_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ex.id, ex.name, ex.muscle, ex.equip, ex.bw, ex.guide, now, now],
    );
  }
}
