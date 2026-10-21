import type { MealType } from "../types/foodLog";

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

// Log entries group by the user's local day, not the UTC date of logged_at.
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Noon keeps day arithmetic clear of DST shifts at midnight.
export function dayFromKey(day: string): Date {
  const [, y, m, d] = DAY_KEY.exec(day) ?? [];
  return new Date(Number(y), Number(m) - 1, Number(d), 12);
}

export function addDays(day: string, n: number): string {
  const date = dayFromKey(day);
  return dayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + n, 12));
}

// A real calendar day in YYYY-MM-DD form; rejects shapes like 2026-02-30.
export function isDayKey(value: string): boolean {
  return DAY_KEY.test(value) && dayKey(dayFromKey(value)) === value;
}

// A day from a route counts only if it's a real date that isn't in the future.
export function logDay(requested: string | undefined): string {
  const today = dayKey(new Date());
  return requested && isDayKey(requested) && requested <= today ? requested : today;
}

// "Tue, Oct 20", as in the Today app bar.
export function formatDayShort(day: string): string {
  const date = dayFromKey(day);
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function formatDayLabel(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  const date = dayFromKey(day);
  const label = formatDayShort(day);
  return day.slice(0, 4) === today.slice(0, 4) ? label : `${label}, ${date.getFullYear()}`;
}

// Cutoffs from UX_FLOWS §2: before 10:30 breakfast, 15:00 lunch, 20:00 dinner.
export function defaultMeal(date: Date): MealType {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes < 10 * 60 + 30) return "breakfast";
  if (minutes < 15 * 60) return "lunch";
  if (minutes < 20 * 60) return "dinner";
  return "snack";
}
