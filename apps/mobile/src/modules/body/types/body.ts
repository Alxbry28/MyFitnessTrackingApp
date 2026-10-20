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

export type ImportRun = {
  id: string;
  fileName: string | null;
  startedAt: string;
  added: number;
  undoneAt: string | null;
};
