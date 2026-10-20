import type { SQLiteDatabase } from "expo-sqlite";

import type { BmiScale, BodyProfile } from "../types/body";

export async function get(db: SQLiteDatabase): Promise<BodyProfile> {
  const row = await db.getFirstAsync<{ height_cm: number | null; bmi_scale: BmiScale }>(
    "SELECT height_cm, bmi_scale FROM body_profile WHERE id = 1",
  );
  return { heightCm: row?.height_cm ?? null, bmiScale: row?.bmi_scale ?? "asia_pacific" };
}

export async function save(db: SQLiteDatabase, profile: { heightCm: number; bmiScale: BmiScale }): Promise<void> {
  await db.runAsync(
    `INSERT INTO body_profile (id, height_cm, bmi_scale, updated_at) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET height_cm = excluded.height_cm, bmi_scale = excluded.bmi_scale,
       updated_at = excluded.updated_at`,
    profile.heightCm,
    profile.bmiScale,
    new Date().toISOString(),
  );
}
