import { z } from "zod";

const RANGE_ERROR = "Enter a whole number from 800 to 6000";

// Range from UX_FLOWS §7.
export const goalSchema = z.object({
  kcal: z
    .string()
    .trim()
    .min(1, RANGE_ERROR)
    .transform(Number)
    .pipe(z.number({ error: RANGE_ERROR }).int(RANGE_ERROR).min(800, RANGE_ERROR).max(6000, RANGE_ERROR)),
});

export type GoalFormValues = z.input<typeof goalSchema>;
export type GoalInput = z.output<typeof goalSchema>;
