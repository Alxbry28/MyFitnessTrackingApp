import { gramsToText } from "@/modules/nutrition/services/entrySchema";
import { dayFromKey, MEAL_LABELS } from "@/modules/nutrition/services/mealTime";
import { formatKcal } from "@/modules/nutrition/services/nutritionCalc";

import type { PantryKind, PantryLocation, PantryStock, StockMovement, StockReason } from "../types/pantry";

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

// The whole units and the part one, as "2 sealed 1 opened" on the item screen.
export function unitSplit(gramsLeft: number, netWeightG: number | null): { sealed: number; opened: boolean } {
  if (gramsLeft <= EMPTY_GRAMS) return { sealed: 0, opened: false };
  if (netWeightG === null || netWeightG <= 0) return { sealed: 0, opened: true };
  const sealed = Math.floor(gramsLeft / netWeightG + 1e-9);
  return { sealed, opened: gramsLeft - sealed * netWeightG > EMPTY_GRAMS };
}

const MOVEMENT_NAMES: Record<StockReason, string> = {
  bought: "Bought",
  cooked: "Cooked",
  eaten: "Eaten",
  used_in_cooking: "Used in cooking",
  shared: "Shared",
  discarded: "Discarded",
  spilled: "Spilled",
  adjustment: "Adjusted",
};

export function movementName(m: StockMovement): string {
  const name = MOVEMENT_NAMES[m.reason];
  return m.reason === "eaten" && m.mealType ? `${name} · ${MEAL_LABELS[m.mealType]}` : name;
}

// U+2212 minus, as in the prototype's "−50 g".
function signed(value: number): string {
  return value < 0 ? `−${gramsToText(-value)}` : `+${gramsToText(value)}`;
}

export function changeText(m: StockMovement): string {
  if (m.reason === "bought" && m.deltaUnits !== null) {
    return `${signed(m.deltaUnits)} ${Math.abs(m.deltaUnits) === 1 ? "unit" : "units"}`;
  }
  return `${signed(m.deltaGrams)} g`;
}

export type ChangeTone = "ok" | "text" | "over";

export function changeTone(m: StockMovement): ChangeTone {
  if (m.deltaGrams >= 0) return "ok";
  return m.reason === "eaten" || m.reason === "used_in_cooking" ? "text" : "over";
}

// "465 → 265 g" in the sheet's result box.
export function transitionText(from: number, to: number): string {
  return `${formatKcal(from)} → ${formatKcal(to)} g`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "Oct 20, 12:35" in local time, as in the history rows.
export function movementTime(iso: string): string {
  const date = new Date(iso);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${hh}:${mm}`;
}

export const MAX_GRAMS = 100_000;

export type AmountCheck = { ok: true; grams: number } | { ok: false; error: string | null };

function parseGrams(text: string): number | null {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(value) ? value : null;
}

// Remove takes out more than 0 and at most what's left; empty text has no error yet.
export function checkRemove(text: string, gramsLeft: number): AmountCheck {
  if (text.trim() === "") return { ok: false, error: null };
  const grams = parseGrams(text);
  if (grams === null || grams <= 0) return { ok: false, error: "Enter an amount" };
  if (grams > gramsLeft + EMPTY_GRAMS) return { ok: false, error: `Only ${formatKcal(gramsLeft)} g left` };
  return { ok: true, grams };
}

// Adjust sets the actual grams, 0 included.
export function checkAdjust(text: string): AmountCheck {
  if (text.trim() === "") return { ok: false, error: null };
  const grams = parseGrams(text);
  if (grams === null || grams < 0 || grams > MAX_GRAMS) return { ok: false, error: "Enter 0 to 100,000 g" };
  return { ok: true, grams };
}

// Eating more than the ledger holds would hide a drift that Adjust should fix.
export function fitsStock(grams: number, gramsLeft: number): boolean {
  return grams <= gramsLeft + EMPTY_GRAMS;
}

export function portionDefault(gramsLeft: number, netWeightG: number | null): number {
  if (netWeightG === null || netWeightG <= 0 || gramsLeft < netWeightG) return Math.round(gramsLeft * 100) / 100;
  return netWeightG;
}

export const ADJUST_MIN_CHANGE = EMPTY_GRAMS;
