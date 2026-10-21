import { gramsToText } from "@/modules/nutrition/services/entrySchema";
import { dayFromKey, MEAL_LABELS } from "@/modules/nutrition/services/mealTime";
import { formatKcal } from "@/modules/nutrition/services/nutritionCalc";

import type { PantryKind, PantryLocation, PantryStock, StockMovement, StockReason, SupplementUnit } from "../types/pantry";

// Kept free of React and SQLite so it can get unit tests once a runner exists.

// Below this a "unit" is rounding noise from grams, not food.
const EMPTY_GRAMS = 0.5;

// Net grams per drained gram. The ledger counts the can's net weight (ADR-7) while a drained
// product is logged in drained grams; without both weights a drained gram counts as net.
function drainedRatio(netWeightG: number | null, usualDrainedG: number | null): number {
  return netWeightG !== null && netWeightG > 0 && usualDrainedG !== null && usualDrainedG > 0
    ? netWeightG / usualDrainedG
    : 1;
}

export function drainedToNet(drainedG: number, netWeightG: number | null, usualDrainedG: number | null): number {
  return drainedG * drainedRatio(netWeightG, usualDrainedG);
}

export function netToDrained(netG: number, netWeightG: number | null, usualDrainedG: number | null): number {
  return netG / drainedRatio(netWeightG, usualDrainedG);
}

// Net grams the ledger takes for a portion: a whole unit is exactly one net weight, and a
// drained portion (usualDrainedG set) converts its drained grams.
export function stockGramsFor(
  grams: number,
  wholeUnit: boolean,
  netWeightG: number | null,
  usualDrainedG: number | null,
): number {
  if (wholeUnit && netWeightG !== null && netWeightG > 0) return netWeightG;
  return usualDrainedG === null ? grams : drainedToNet(grams, netWeightG, usualDrainedG);
}

// Net grams in the opened unit, 0 when every unit is sealed.
export function openedGrams(gramsLeft: number, netWeightG: number | null): number {
  if (netWeightG === null || netWeightG <= 0 || gramsLeft <= EMPTY_GRAMS) return 0;
  const part = gramsLeft - Math.floor(gramsLeft / netWeightG + 1e-9) * netWeightG;
  return part > EMPTY_GRAMS ? part : 0;
}

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

// Supplements are counted in grams: "1.24 kg" from 1,000 g up, whole grams below.
export function weightText(grams: number): string {
  if (grams >= 1000) return `${Math.round(grams / 10) / 100} kg`;
  return `${formatKcal(grams)} g`;
}

// Format amount based on supplement unit: grams, tabs or caps.
export function formatAmount(amount: number, unit: SupplementUnit = "g"): string {
  if (unit === "tabs") return `${Math.round(amount)} ${Math.round(amount) === 1 ? "tab" : "tabs"}`;
  if (unit === "caps") return `${Math.round(amount)} ${Math.round(amount) === 1 ? "cap" : "caps"}`;
  return weightText(amount);
}

const USE_WINDOW_DAYS = 14;
const LOW_STOCK_DAYS = 7;
const DAY_MS = 86_400_000;

// Average grams a day over the last 14 days, or over the days the item has existed when it's
// newer (story K3). Null until something was eaten in that window.
export function dailyUseG(eatenRecentG: number, firstMovementAt: string | null, now: Date): number | null {
  if (eatenRecentG <= 0 || firstMovementAt === null) return null;
  const age = Math.ceil((now.getTime() - new Date(firstMovementAt).getTime()) / DAY_MS);
  return eatenRecentG / Math.min(USE_WINDOW_DAYS, Math.max(1, age));
}

export function daysLeft(gramsLeft: number, dailyUse: number | null): number | null {
  return dailyUse === null || dailyUse <= 0 ? null : Math.floor(Math.max(0, gramsLeft) / dailyUse);
}

// Story K4's warning level.
export function lowStock(days: number | null): boolean {
  return days !== null && days < LOW_STOCK_DAYS;
}

export function daysText(days: number): string {
  return `~${days} ${days === 1 ? "day" : "days"}`;
}

export type SupplementView = {
  dailyUse: number | null;
  days: number | null;
  low: boolean;
  amount: string;
  meta: string;
};

// What the list and item screen show for a supplement (pantry.html frame 1 Supplements rows).
export function supplementView(item: PantryStock, now: Date): SupplementView {
  const unit = item.unit ?? "g";
  const dailyUse = dailyUseG(item.eatenRecentG, item.firstMovementAt, now);
  const days = daysLeft(item.gramsLeft, dailyUse);
  const unitSuffix = unit === "tabs" ? "tabs" : unit === "caps" ? "caps" : "g";
  const use =
    dailyUse !== null
      ? `${formatKcal(dailyUse)} ${unitSuffix}/day`
      : item.servingGrams !== null && `${gramsToText(item.servingGrams)} ${unit === "g" ? "g/scoop" : `${unitSuffix}/serving`}`;
  const containerWord = unit === "g" ? "container" : "bottle";
  const meta = [item.netWeightG !== null && `${formatAmount(item.netWeightG, unit)} ${containerWord}`, use].filter(Boolean).join(" · ");
  return { dailyUse, days, low: lowStock(days), amount: formatAmount(item.gramsLeft, unit), meta };
}

export function gramsLeftText(gramsLeft: number): string {
  // formatKcal is the shared whole-number formatter with thousands separators.
  return `≈ ${formatKcal(gramsLeft)} g left`;
}

// The list's small line: a drained product counts drained grams, in the opened unit when
// there is one (pantry.html frame 1 "≈ 60 g drained left").
export function stockLeftText(item: PantryStock): string {
  if (!item.drained || item.usualDrainedG === null) return gramsLeftText(item.gramsLeft);
  const opened = openedGrams(item.gramsLeft, item.netWeightG);
  if (opened > 0) return `≈ ${formatKcal(netToDrained(opened, item.netWeightG, item.usualDrainedG))} g drained left`;
  return `≈ ${formatKcal(netToDrained(item.gramsLeft, item.netWeightG, item.usualDrainedG))} g drained`;
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

// The opened unit's date after a ledger change: today when a part unit appears or a new unit
// is broken into, kept while the same unit stays open, null once no part is left. Eating a
// whole sealed unit drops the sealed count but leaves the opened part as it was, so only a
// fuller part with fewer sealed units means a new unit was opened.
export function openedAfter(
  gramsBefore: number,
  gramsAfter: number,
  netWeightG: number | null,
  openedAt: string | null,
  today: string,
): string | null {
  const partAfter = openedGrams(gramsAfter, netWeightG);
  if (partAfter === 0) return null;
  const partBefore = openedGrams(gramsBefore, netWeightG);
  if (partBefore === 0 || openedAt === null) return today;
  const brokeNewUnit =
    unitSplit(gramsAfter, netWeightG).sealed < unitSplit(gramsBefore, netWeightG).sealed && partAfter > partBefore;
  return brokeNewUnit ? today : openedAt;
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

export function changeText(m: StockMovement, unit: SupplementUnit = "g"): string {
  if (m.deltaUnits !== null) {
    const word =
      unit === "tabs" || unit === "caps"
        ? Math.abs(m.deltaUnits) === 1
          ? "bottle"
          : "bottles"
        : Math.abs(m.deltaUnits) === 1
          ? "unit"
          : "units";
    return `${signed(m.deltaUnits)} ${word}`;
  }
  const suffix = unit === "tabs" ? " tabs" : unit === "caps" ? " caps" : " g";
  return `${signed(m.deltaGrams)}${suffix}`;
}

export type ChangeTone = "ok" | "text" | "over";

export function changeTone(m: StockMovement): ChangeTone {
  if (m.deltaGrams >= 0) return "ok";
  return m.reason === "eaten" || m.reason === "used_in_cooking" ? "text" : "over";
}

// "465 → 265 g" in the sheet's result box.
export function transitionText(from: number, to: number, unit: SupplementUnit = "g"): string {
  const suffix = unit === "tabs" ? " tabs" : unit === "caps" ? " caps" : " g";
  return `${formatKcal(from)} → ${formatKcal(to)}${suffix}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "Oct 20" for a YYYY-MM-DD day, as in "Opened Oct 20".
export function monthDay(day: string): string {
  const date = dayFromKey(day);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

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

// A supplement defaults to one scoop (its serving grams) while that much is left.
export function scoopDefault(gramsLeft: number, scoopG: number | null): number {
  if (scoopG !== null && scoopG > 0 && fitsStock(scoopG, gramsLeft)) return scoopG;
  return Math.round(Math.max(0, gramsLeft) * 100) / 100;
}

// The opened unit is eaten before a sealed one (story L5).
export function portionDefault(gramsLeft: number, netWeightG: number | null): number {
  const opened = openedGrams(gramsLeft, netWeightG);
  if (opened > 0) return Math.round(opened * 100) / 100;
  if (netWeightG === null || netWeightG <= 0 || gramsLeft < netWeightG) return Math.round(gramsLeft * 100) / 100;
  return netWeightG;
}

export const ADJUST_MIN_CHANGE = EMPTY_GRAMS;
