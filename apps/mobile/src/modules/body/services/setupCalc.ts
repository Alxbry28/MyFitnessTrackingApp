// Kept free of React and SQLite so it can get unit tests once a runner exists.
// Formulas from 1_docs/plan/10_body_progress.md §2; paces from prototypes/onboarding.html.

export const SEXES = ["male", "female"] as const;
export type Sex = (typeof SEXES)[number];

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "very", "extra"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

export const GOALS = ["cut", "maintain", "bulk"] as const;
export type Goal = (typeof GOALS)[number];

export const PACES = ["gentle", "steady", "fast"] as const;
export type Pace = (typeof PACES)[number];

const CUT_OFFSETS: Record<Pace, number> = { gentle: -250, steady: -400, fast: -600 };
const BULK_OFFSET = 250;
const KCAL_PER_KG = 7700;
export const GOAL_MIN_KCAL = 800;
export const GOAL_MAX_KCAL = 6000;

export const LB_KG = 0.45359237;
const IN_CM = 2.54;

// Full years on the given local day; both are YYYY-MM-DD.
export function ageOn(birthDay: string, today: string): number {
  const [by, bm, bd] = birthDay.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

export function bmr(sex: Sex, kg: number, cm: number, age: number): number {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === "male" ? 5 : -161);
}

export function tdee(bmrKcal: number, activity: ActivityLevel): number {
  return bmrKcal * ACTIVITY_FACTORS[activity];
}

export function goalOffset(goal: Goal, pace: Pace): number {
  if (goal === "cut") return CUT_OFFSETS[pace];
  return goal === "bulk" ? BULK_OFFSET : 0;
}

// Nearest 10 kcal, kept inside the range the Settings goal form accepts.
export function targetKcal(tdeeKcal: number, offset: number): number {
  const rounded = Math.round((tdeeKcal + offset) / 10) * 10;
  return Math.min(GOAL_MAX_KCAL, Math.max(GOAL_MIN_KCAL, rounded));
}

// About 7,700 kcal per kg of body weight, rounded to 0.05 kg.
export function kgPerWeek(offset: number): number {
  return Math.round(((Math.abs(offset) * 7) / KCAL_PER_KG) * 20) / 20;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "mid-January 2027"; null when there's no pace to reach the target.
export function etaLabel(today: Date, currentKg: number, targetKg: number, kgWeek: number): string | null {
  if (kgWeek <= 0) return null;
  const weeks = Math.abs(currentKg - targetKg) / kgWeek;
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + Math.round(weeks * 7), 12);
  const day = date.getDate();
  const part = day <= 10 ? "early" : day <= 20 ? "mid" : "late";
  return `${part}-${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function lbToKg(lb: number): number {
  return lb * LB_KG;
}

export function kgToLb(kg: number): number {
  return kg / LB_KG;
}

export function ftInToCm(ft: number, inches: number): number {
  return (ft * 12 + inches) * IN_CM;
}

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const total = Math.round(cm / IN_CM);
  return { ft: Math.floor(total / 12), inches: total % 12 };
}
