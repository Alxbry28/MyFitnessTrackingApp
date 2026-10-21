import type { SQLiteDatabase } from "expo-sqlite";

import type { BmiScale, BodyProfile, SetupProfile } from "../types/body";

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

type SetupRow = {
  height_cm: number | null;
  bmi_scale: BmiScale;
  sex: SetupProfile["sex"];
  birth_date: string | null;
  activity_level: SetupProfile["activityLevel"];
  goal: SetupProfile["goal"];
};

export async function getSetup(db: SQLiteDatabase): Promise<SetupProfile> {
  const row = await db.getFirstAsync<SetupRow>(
    "SELECT height_cm, bmi_scale, sex, birth_date, activity_level, goal FROM body_profile WHERE id = 1",
  );
  return {
    heightCm: row?.height_cm ?? null,
    bmiScale: row?.bmi_scale ?? "asia_pacific",
    sex: row?.sex ?? null,
    birthDate: row?.birth_date ?? null,
    activityLevel: row?.activity_level ?? null,
    goal: row?.goal ?? null,
  };
}

export type SetupInput = {
  heightCm: number;
  bmiScale: BmiScale;
  sex: NonNullable<SetupProfile["sex"]>;
  birthDate: string;
  activityLevel: NonNullable<SetupProfile["activityLevel"]>;
  goal: NonNullable<SetupProfile["goal"]>;
};

export async function saveSetup(db: SQLiteDatabase, input: SetupInput): Promise<void> {
  await db.runAsync(
    `INSERT INTO body_profile (id, height_cm, bmi_scale, sex, birth_date, activity_level, goal, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET height_cm = excluded.height_cm, bmi_scale = excluded.bmi_scale,
       sex = excluded.sex, birth_date = excluded.birth_date, activity_level = excluded.activity_level,
       goal = excluded.goal, updated_at = excluded.updated_at`,
    input.heightCm,
    input.bmiScale,
    input.sex,
    input.birthDate,
    input.activityLevel,
    input.goal,
    new Date().toISOString(),
  );
}
