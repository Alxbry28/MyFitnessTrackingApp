import { z } from "zod";

import { BMI_SCALES } from "../types/body";

const HEIGHT_ERROR = "Enter a height from 100 to 250 cm";

export const profileSchema = z.object({
  heightCm: z
    .string()
    .trim()
    .min(1, HEIGHT_ERROR)
    .transform((v) => Number(v.replace(",", ".")))
    .pipe(z.number({ error: HEIGHT_ERROR }).min(100, HEIGHT_ERROR).max(250, HEIGHT_ERROR)),
  bmiScale: z.enum(BMI_SCALES),
});

export type ProfileFormValues = z.input<typeof profileSchema>;
export type ProfileInput = z.output<typeof profileSchema>;
