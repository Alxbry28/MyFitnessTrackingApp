import { dayFromKey } from "@/modules/nutrition/services/mealTime";
import { formatKcal } from "@/modules/nutrition/services/nutritionCalc";

import type { PantryKind, PantryLocation, PantryStock } from "../types/pantry";

// Kept free of React and SQLite so it can get unit tests once a runner exists.

// Below this a "unit" is rounding noise from grams, not food.
const EMPTY_GRAMS = 0.5;

export function inStock(item: PantryStock): boolean {
  return item.gramsLeft > EMPTY_GRAMS;
}

// "3", "2 + 1 open" or "1 open" for whole units of the net weight plus a part one.
export function unitsText(gramsLeft: number, netWeightG: number | null): string {
  if (netWeightG === null || netWeightG <= 0) return `${Math.round(gramsLeft)} g`;
  const whole = Math.floor(gramsLeft / netWeightG + 1e-9);
  const part = gramsLeft - whole * netWeightG;
  if (part > EMPTY_GRAMS) return whole > 0 ? `${whole} + 1 open` : "1 open";
  return String(whole);
}

export function gramsLeftText(gramsLeft: number): string {
  // formatKcal is the shared whole-number formatter with thousands separators.
  return `≈ ${formatKcal(gramsLeft)} g left`;
}

// Whole local days from today to the expiry day (YYYY-MM-DD); negative once past.
export function daysUntil(expiresAt: string, today: string): number {
  return Math.round((dayFromKey(expiresAt).getTime() - dayFromKey(today).getTime()) / 86_400_000);
}

export type ExpiryBadge = { text: string; tone: "over" | "est" };

export function expiryBadge(expiresAt: string | null, today: string): ExpiryBadge | null {
  if (!expiresAt) return null;
  const days = daysUntil(expiresAt, today);
  if (days < 0) return { text: "expired", tone: "over" };
  if (days === 0) return { text: "expires today", tone: "over" };
  const text = days === 1 ? "expires tomorrow" : `expires in ${days} days`;
  return { text, tone: days <= 3 ? "over" : "est" };
}

export type PantryGroup = "cooked" | "groceries" | "supplements";
export const GROUP_ORDER: PantryGroup[] = ["cooked", "groceries", "supplements"];
export const GROUP_LABELS: Record<PantryGroup, string> = {
  cooked: "Cooked",
  groceries: "Groceries",
  supplements: "Supplements",
};

const GROUP_OF: Record<PantryKind, PantryGroup> = {
  batch: "cooked",
  packaged: "groceries",
  supplement: "supplements",
};

export function groupOf(kind: PantryKind): PantryGroup {
  return GROUP_OF[kind];
}

// "cupboard · fridge": the distinct locations in a group, in first-seen order.
export function locationsText(items: { location: PantryLocation }[]): string {
  return [...new Set(items.map((i) => i.location))].join(" · ");
}
