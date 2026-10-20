import { z } from "zod";

import { MEAL_TYPES } from "../types/foodLog";

// Android decimal keyboards can type a comma depending on locale.
const grams = z
  .string()
  .trim()
  .min(1, "Enter grams above 0")
  .transform((v) => Number(v.replace(",", ".")))
  .pipe(z.number({ error: "Enter grams above 0" }).positive("Enter grams above 0"));

export const entrySchema = z.object({
  mealType: z.enum(MEAL_TYPES),
  grams,
});

export type EntryFormValues = z.input<typeof entrySchema>;

// Shows grams without float noise, so 180 stays "180" and 7.25 stays "7.25".
export function gramsToText(value: number): string {
  return String(Math.round(value * 100) / 100);
}
