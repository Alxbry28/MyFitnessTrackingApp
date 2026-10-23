import type { SQLiteDatabase } from "expo-sqlite";

// Feature 19 / H5: Workout routines and custom splits (PPL, Upper/Lower, custom).
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE workout_routines (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      folder      TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      deleted_at  TEXT
    );

    CREATE INDEX ix_workout_routines_name ON workout_routines(name COLLATE NOCASE) WHERE deleted_at IS NULL;

    CREATE TABLE workout_routine_exercises (
      id            TEXT PRIMARY KEY,
      routine_id    TEXT NOT NULL REFERENCES workout_routines(id) ON DELETE CASCADE,
      exercise_id   TEXT NOT NULL REFERENCES exercises(id),
      order_index   INTEGER NOT NULL,
      target_sets   INTEGER NOT NULL DEFAULT 3,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      deleted_at    TEXT
    );

    CREATE INDEX ix_workout_routine_exercises ON workout_routine_exercises(routine_id, order_index ASC) WHERE deleted_at IS NULL;
  `);

  const now = new Date().toISOString();

  // Presets: Upper/Lower & PPL
  const presets = [
    {
      id: "rtn_upper",
      name: "Upper Body",
      folder: "Upper / Lower",
      exercises: [
        "ex_bench_press",
        "ex_barbell_row",
        "ex_ohp",
        "ex_lat_pulldown",
        "ex_bicep_curl",
        "ex_tricep_pushdown",
      ],
    },
    {
      id: "rtn_lower",
      name: "Lower Body",
      folder: "Upper / Lower",
      exercises: [
        "ex_squat",
        "ex_rdl",
        "ex_leg_press",
        "ex_leg_raise",
        "ex_plank",
      ],
    },
    {
      id: "rtn_push",
      name: "Push Day",
      folder: "PPL",
      exercises: [
        "ex_bench_press",
        "ex_incline_db_press",
        "ex_ohp",
        "ex_dip",
        "ex_tricep_pushdown",
      ],
    },
    {
      id: "rtn_pull",
      name: "Pull Day",
      folder: "PPL",
      exercises: [
        "ex_deadlift",
        "ex_barbell_row",
        "ex_pull_up",
        "ex_lat_pulldown",
        "ex_bicep_curl",
      ],
    },
    {
      id: "rtn_legs",
      name: "Leg Day",
      folder: "PPL",
      exercises: [
        "ex_squat",
        "ex_rdl",
        "ex_leg_press",
        "ex_leg_raise",
        "ex_plank",
      ],
    },
  ];

  for (const p of presets) {
    await db.runAsync(
      `INSERT INTO workout_routines (id, name, folder, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [p.id, p.name, p.folder, now, now],
    );
    for (let i = 0; i < p.exercises.length; i++) {
      const exId = p.exercises[i]!;
      await db.runAsync(
        `INSERT INTO workout_routine_exercises (id, routine_id, exercise_id, order_index, target_sets, created_at, updated_at)
         VALUES (?, ?, ?, ?, 3, ?, ?)`,
        [`${p.id}_${i}`, p.id, exId, i, now, now],
      );
    }
  }
}
