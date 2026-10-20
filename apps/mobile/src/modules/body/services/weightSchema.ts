import { z } from "zod";

const RANGE_ERROR = "Enter a weight from 20 to 300 kg";

// Android decimal keyboards can type a comma depending on locale.
export const weightSchema = z.object({
  weightKg: z
    .string()
    .trim()
    .min(1, RANGE_ERROR)
    .transform((v) => Number(v.replace(",", ".")))
    .pipe(z.number({ error: RANGE_ERROR }).min(20, RANGE_ERROR).max(300, RANGE_ERROR)),
});

export type WeightFormValues = z.input<typeof weightSchema>;
export type WeightInput = z.output<typeof weightSchema>;

export function kgToText(value: number): string {
  return String(Math.round(value * 10) / 10);
}
