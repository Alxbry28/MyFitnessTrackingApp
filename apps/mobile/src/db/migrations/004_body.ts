import type { SQLiteDatabase } from "expo-sqlite";

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE body_profile (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      height_cm   REAL CHECK (height_cm BETWEEN 100 AND 250),
      bmi_scale   TEXT NOT NULL DEFAULT 'asia_pacific' CHECK (bmi_scale IN ('asia_pacific','who')),
      updated_at  TEXT NOT NULL
    );
    CREATE TABLE import_runs (
      id          TEXT PRIMARY KEY,
      source      TEXT NOT NULL CHECK (source IN ('csv_import')),
      file_name   TEXT,
      started_at  TEXT NOT NULL,
      found       INTEGER NOT NULL,
      added       INTEGER NOT NULL,
      skipped     INTEGER NOT NULL,
      undone_at   TEXT
    );
    CREATE TABLE body_weight_entries (
      id                TEXT PRIMARY KEY,
      day               TEXT NOT NULL,
      measured_at       TEXT NOT NULL,
      weight_kg         REAL NOT NULL CHECK (weight_kg > 0),
      source            TEXT NOT NULL
                        CHECK (source IN ('manual','health_connect','apple_health','csv_import')),
      source_record_id  TEXT,
      import_run_id     TEXT REFERENCES import_runs(id),
      note              TEXT,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL,
      deleted_at        TEXT
    );
    CREATE INDEX ix_weight_day ON body_weight_entries(day) WHERE deleted_at IS NULL;
    CREATE INDEX ix_weight_import_run ON body_weight_entries(import_run_id);
  `);
}
