import type { SQLiteDatabase } from "expo-sqlite";

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE body_profile ADD COLUMN tracked_sites TEXT DEFAULT '["chest","waist","arm_left","arm_right","thigh_left","thigh_right"]';

    CREATE TABLE measurement_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      measured_on TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE body_measurements (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL REFERENCES measurement_sessions(id) ON DELETE CASCADE,
      site TEXT NOT NULL,
      side TEXT NOT NULL DEFAULT 'none' CHECK (side IN ('left', 'right', 'none')),
      value_cm REAL NOT NULL CHECK (value_cm > 0),
      state TEXT NOT NULL DEFAULT 'relaxed' CHECK (state IN ('relaxed', 'flexed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE INDEX idx_measurement_sessions_date ON measurement_sessions(measured_on);
    CREATE INDEX idx_body_measurements_session ON body_measurements(session_id);
    CREATE INDEX idx_body_measurements_site ON body_measurements(site);
  `);
}
