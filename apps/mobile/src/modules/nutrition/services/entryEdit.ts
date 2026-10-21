import type { FoodLogEntry, MealType } from "../types/foodLog";
import { gramsToText } from "./entrySchema";
import { dayFromKey, formatDayShort, MEAL_LABELS } from "./mealTime";

// Kept free of React and SQLite so it can get unit tests once a runner exists.

export type EntryDraft = { mealType: MealType; day: string; minutes: number; grams: number | null };

export function minutesOf(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

// "7:42 AM", as in prototypes/entry-edit.html.
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// Local day plus minutes after midnight as an ISO UTC timestamp, the logged_at format.
export function loggedAtFor(day: string, minutes: number): string {
  const d = dayFromKey(day);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(minutes / 60), minutes % 60).toISOString();
}

// "Today", otherwise "Mon, Oct 19" (entry-edit.html frame 4).
export function dayText(day: string, today: string): string {
  return day === today ? "Today" : formatDayShort(day);
}

// The When date field: "Today, Oct 20" or "Mon, Oct 19" (entry-edit.html frames 1 and 4).
export function dateFieldText(day: string, today: string): string {
  const short = formatDayShort(day);
  return day === today ? `Today, ${short.slice(short.indexOf(", ") + 2)}` : short;
}

export function originalDraft(entry: FoodLogEntry): EntryDraft {
  return { mealType: entry.mealType, day: entry.day, minutes: minutesOf(entry.loggedAt), grams: entry.grams };
}

// The "old → new" lines for the discard dialog; empty when nothing changed.
export function changeList(entry: FoodLogEntry, draft: EntryDraft, today: string): string[] {
  const original = originalDraft(entry);
  const lines: string[] = [];
  if (draft.mealType !== original.mealType) {
    lines.push(`Meal: ${MEAL_LABELS[original.mealType]} → ${MEAL_LABELS[draft.mealType]}`);
  }
  if (draft.day !== original.day) {
    lines.push(`Date: ${dayText(original.day, today)} → ${dayText(draft.day, today)}`);
  }
  if (draft.minutes !== original.minutes) {
    lines.push(`Time: ${formatTime(original.minutes)} → ${formatTime(draft.minutes)}`);
  }
  if (draft.grams !== original.grams) {
    const now = draft.grams === null ? "empty" : `${gramsToText(draft.grams)} g`;
    lines.push(`Amount: ${gramsToText(entry.grams)} g → ${now}`);
  }
  return lines;
}

export type AmountChip = { label: string; grams: (current: number | null) => number };

// −10 and +10 step from the typed amount; then the product's serving and the original amount.
export function amountChips(originalGrams: number, servingGrams: number | null): AmountChip[] {
  const chips: AmountChip[] = [
    { label: "−10", grams: (g) => Math.max(1, (g ?? originalGrams) - 10) },
    { label: "+10", grams: (g) => (g ?? originalGrams) + 10 },
  ];
  if (servingGrams !== null && servingGrams > 0 && servingGrams !== originalGrams) {
    chips.push({ label: `${gramsToText(servingGrams)} g`, grams: () => servingGrams });
  }
  chips.push({ label: `${gramsToText(originalGrams)} g`, grams: () => originalGrams });
  return chips;
}
