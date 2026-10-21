import type { ActivityLevel, Goal, Sex } from "../services/setupCalc";

export const BMI_SCALES = ["asia_pacific", "who"] as const;
export type BmiScale = (typeof BMI_SCALES)[number];

export type WeightSource = "manual" | "health_connect" | "apple_health" | "csv_import";

export type WeighIn = {
  id: string;
  day: string;
  measuredAt: string;
  weightKg: number;
  source: WeightSource;
  updatedAt: string;
};

export type BodyProfile = { heightCm: number | null; bmiScale: BmiScale };

// The first-run setup answers; every field is null until setup has been finished once.
export type SetupProfile = BodyProfile & {
  sex: Sex | null;
  birthDate: string | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
};

export type ImportRun = {
  id: string;
  fileName: string | null;
  startedAt: string;
  added: number;
  undoneAt: string | null;
};
