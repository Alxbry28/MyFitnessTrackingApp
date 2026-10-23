import { MEAL_TYPES, type FoodLogEntry, type MealType } from "../types/foodLog";
import type {
  LineMatch,
  PastedLine,
  PastedSection,
  PastedUnit,
  RememberedMatch,
} from "../types/pasteLog";
import type { Product } from "../types/product";
import { gramsToText } from "./entrySchema";
import { MEAL_LABELS } from "./mealTime";

// Kept free of React and SQLite so it can get unit tests once a runner exists.

const BULLET = /^[-*•]\s+/;
const FOOD = /^(\d+(?:[.,]\d+)?)\s*(g|ml|oz|caps?|tabs?|tablets?|capsules?|scoops?)\s+(.+)$/i;
const OZ_GRAMS = 28.35;

const HEADING_MEALS: Record<string, MealType> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snack: "snack",
  snacks: "snack",
  supplement: "snack",
  supplements: "snack",
};

// One key for typed names, product names, remembered matches and choices.
export function nameKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function mealForHeading(heading: string): MealType | null {
  return HEADING_MEALS[nameKey(heading)] ?? null;
}

function cleanLine(rawLine: string): string {
  return rawLine.trim().replace(BULLET, "").trim();
}

function isHeading(line: string): boolean {
  return line.endsWith(":") && line.length > 1;
}

function readFood(line: string): PastedLine {
  const food = FOOD.exec(line);
  const amount = food ? Number(food[1].replace(",", ".")) : NaN;
  if (!food || !Number.isFinite(amount) || amount <= 0) return { kind: "unread", raw: line };
  const unit = food[2].toLowerCase() as PastedUnit;
  const name = food[3].trim();
  const grams = unit === "oz" ? amount * OZ_GRAMS : amount;
  return { kind: "food", raw: line, amount, unit, grams, name, key: nameKey(name) };
}

// Food before the first heading logs to fallbackMeal (the time-of-day meal);
// a heading that isn't a meal, like "Pre-Workout:", logs as Snack until changed.
export function parsePastedLog(text: string, fallbackMeal: MealType): PastedSection[] {
  const sections: PastedSection[] = [];
  let current: PastedSection | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    if (!line) continue;
    if (isHeading(line)) {
      const heading = line.slice(0, -1).trim();
      const meal = mealForHeading(heading);
      current = { heading, meal: meal ?? "snack", mealFromHeading: meal !== null, lines: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { heading: null, meal: fallbackMeal, mealFromHeading: false, lines: [] };
      sections.push(current);
    }
    current.lines.push(readFood(line));
  }
  return sections;
}

export function matchLine(
  key: string,
  products: Product[],
  remembered: RememberedMatch[],
  choices: ReadonlyMap<string, Product>,
): LineMatch {
  const candidates = products.filter((p) => nameKey(p.name).includes(key));

  const chosen = choices.get(key);
  if (chosen) return { status: "matched", product: chosen, candidates };

  const rememberedId = remembered.find((r) => r.nameKey === key)?.productId;
  const rememberedProduct = rememberedId ? products.find((p) => p.id === rememberedId) : undefined;
  if (rememberedProduct) return { status: "matched", product: rememberedProduct, candidates };

  const exact = candidates.filter((p) => nameKey(p.name) === key);
  if (exact.length === 1) return { status: "matched", product: exact[0], candidates };

  // products arrive in library order (favorites, then name), so the first is the best guess.
  if (candidates.length > 0) return { status: "check", product: candidates[0], candidates };
  return { status: "not_found", product: null, candidates };
}

export type EditorSpan = { text: string; tone: "heading" | "amount" | "plain" };

const RAW_FOOD = /^(\s*(?:[-*•]\s+)?)(\d+(?:[.,]\d+)?\s*(?:g|ml|oz|caps?|tabs?|tablets?|capsules?|scoops?))(\s+.+)$/i;

// Splits the editor text into styled runs (frame 1: headings in accent, amounts muted),
// keeping every character so the TextInput's text is unchanged.
export function editorSpans(text: string): EditorSpan[][] {
  return text.split("\n").map((rawLine) => {
    const line = cleanLine(rawLine);
    if (isHeading(line)) return [{ text: rawLine, tone: "heading" }];
    const parts = RAW_FOOD.exec(rawLine);
    if (parts && readFood(line).kind === "food") {
      return [
        { text: parts[1], tone: "plain" },
        { text: parts[2], tone: "amount" },
        { text: parts[3], tone: "plain" },
      ];
    }
    return [{ text: rawLine, tone: "plain" }];
  });
}

// Yesterday's or current log written back in the paste format, meals in their usual order.
export function textFromEntries(
  entries: FoodLogEntry[],
  pantryItems?: { id: string; productId: string | null; kind: string; unit: string }[],
): string {
  const isSupp = (e: FoodLogEntry) => {
    if (!pantryItems) return false;
    const item = pantryItems.find((p) => p.id === e.pantryItemId || (e.productId && p.productId === e.productId));
    return item?.kind === "supplement";
  };

  const suppEntries = entries.filter(isSupp);
  const normalEntries = entries.filter((e) => !isSupp(e));

  const mealSections = MEAL_TYPES.flatMap((meal) => {
    const lines = normalEntries
      .filter((e) => e.mealType === meal)
      .map((e) => `${gramsToText(e.grams)}g ${e.productName}`);
    return lines.length > 0 ? [`${MEAL_LABELS[meal]}:\n${lines.join("\n")}`] : [];
  });

  if (suppEntries.length > 0) {
    const suppLines = suppEntries.map((e) => {
      const item = pantryItems?.find((p) => p.id === e.pantryItemId || (e.productId && p.productId === e.productId));
      const unit = item?.unit;
      const unitStr =
        unit === "caps" ? (e.grams === 1 ? "cap" : "caps") : unit === "tabs" ? (e.grams === 1 ? "tab" : "tabs") : "g";
      const space = unitStr === "g" ? "" : " ";
      return `${gramsToText(e.grams)}${space}${unitStr} ${e.productName}`;
    });
    mealSections.push(`Supplements:\n${suppLines.join("\n")}`);
  }

  return mealSections.join("\n\n");
}

// Appends a Dinner: copy of the first Lunch: section's food lines, or null when it has none.
export function copyLunchToDinner(text: string): string | null {
  const lunch: string[] = [];
  let inLunch = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    if (isHeading(line)) {
      if (lunch.length > 0) break;
      inLunch = mealForHeading(line.slice(0, -1)) === "lunch";
      continue;
    }
    if (inLunch && line && readFood(line).kind === "food") lunch.push(line);
  }
  if (lunch.length === 0) return null;
  return `${text.trimEnd()}\n\nDinner:\n${lunch.join("\n")}`;
}
