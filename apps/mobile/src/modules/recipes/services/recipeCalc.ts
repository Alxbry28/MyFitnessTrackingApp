import type { ParsedNoteLine } from "../types/recipes";

// Raw nutrition totals from a list of ingredients.
export type RawTotals = {
  rawWeightG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  incomplete: boolean;
};

export function calculateRawTotals(
  ingredients: {
    rawGrams: number;
    kcalPer100g: number | null;
    proteinPer100g: number | null;
    carbsPer100g: number | null;
    fatPer100g: number | null;
  }[],
): RawTotals {
  let rawWeightG = 0;
  let kcal = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let incomplete = false;

  for (const ing of ingredients) {
    rawWeightG += ing.rawGrams;
    if (ing.kcalPer100g === null) {
      incomplete = true;
    } else {
      const factor = ing.rawGrams / 100;
      kcal += ing.kcalPer100g * factor;
      protein += (ing.proteinPer100g ?? 0) * factor;
      carbs += (ing.carbsPer100g ?? 0) * factor;
      fat += (ing.fatPer100g ?? 0) * factor;
    }
  }

  return {
    rawWeightG: Math.round(rawWeightG * 10) / 10,
    kcal: Math.round(kcal),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    incomplete,
  };
}

// Computes per-100 g cooked calories and macros from total raw nutrition and cooked weight.
export function calculateCookedPer100g(
  rawTotals: { kcal: number; protein: number; carbs: number; fat: number },
  cookedWeightG: number,
): {
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
} {
  if (cookedWeightG <= 0) {
    return { kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 };
  }
  const factor = 100 / cookedWeightG;
  return {
    kcalPer100g: Math.round(rawTotals.kcal * factor),
    proteinPer100g: Math.round(rawTotals.protein * factor * 10) / 10,
    carbsPer100g: Math.round(rawTotals.carbs * factor * 10) / 10,
    fatPer100g: Math.round(rawTotals.fat * factor * 10) / 10,
  };
}

// Ratio = cooked weight / raw weight, rounded to 2 decimals (e.g. 0.87).
export function calculateCookedRatio(cookedWeightG: number, rawWeightG: number): number {
  if (rawWeightG <= 0 || cookedWeightG <= 0) return 1;
  return Math.round((cookedWeightG / rawWeightG) * 100) / 100;
}

// Running average of learned ratio across settled batches.
export function updateLearnedRatio(
  currentRatio: number | null,
  settledCount: number,
  newRatio: number,
): number {
  if (currentRatio === null || settledCount <= 0) {
    return Math.round(newRatio * 100) / 100;
  }
  const avg = (currentRatio * settledCount + newRatio) / (settledCount + 1);
  return Math.round(avg * 100) / 100;
}

// Estimate cooked weight from raw weight and learned ratio.
export function estimateCookedWeight(rawWeightG: number, learnedRatio: number | null): number {
  if (learnedRatio !== null && learnedRatio > 0) {
    return Math.round(rawWeightG * learnedRatio);
  }
  return Math.round(rawWeightG);
}

// Check if any ingredient is an oil or fat (for the "No oil listed" warning banner).
const OIL_KEYWORDS = ["oil", "butter", "margarine", "ghee", "lard", "tallow", "fat", "shortening"];

export function hasOilOrFat(ingredientNames: string[]): boolean {
  return ingredientNames.some((name) => {
    const lower = name.toLowerCase();
    return OIL_KEYWORDS.some((kw) => lower.includes(kw));
  });
}

// Parse lines pasted from notes (e.g. "32g broccoli stem", "Total cooked: 532g").
export function parseNotesText(text: string): ParsedNoteLine[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const result: ParsedNoteLine[] = [];

  for (const line of lines) {
    // Cooked weight line check
    const cookedMatch = line.match(/^(?:total\s+cooked|cooked\s+weight|cooked)[:\s]+(\d+(?:[.,]\d+)?)\s*g?$/i);
    if (cookedMatch) {
      const g = parseFloat(cookedMatch[1].replace(",", "."));
      result.push({
        rawLine: line,
        grams: isNaN(g) ? null : g,
        foodQuery: "Cooked weight",
        isEstimated: false,
        isCookedWeight: true,
        isNote: false,
      });
      continue;
    }

    // Weight at start: e.g. "32g broccoli stem", "194.8 g carrots", "100ml soy sauce"
    const weightPrefixMatch = line.match(/^(\d+(?:[.,]\d+)?)\s*(?:g|ml|grams?)\s+(.+)$/i);
    if (weightPrefixMatch) {
      const g = parseFloat(weightPrefixMatch[1].replace(",", "."));
      result.push({
        rawLine: line,
        grams: isNaN(g) ? null : g,
        foodQuery: weightPrefixMatch[2].trim(),
        isEstimated: false,
        isCookedWeight: false,
        isNote: false,
      });
      continue;
    }

    // Weight at end: e.g. "broccoli stem 32g", "carrots - 194.8g"
    const weightSuffixMatch = line.match(/^(.+?)(?:\s*[-–—:]\s*|\s+)(\d+(?:[.,]\d+)?)\s*(?:g|ml|grams?)$/i);
    if (weightSuffixMatch) {
      const g = parseFloat(weightSuffixMatch[2].replace(",", "."));
      result.push({
        rawLine: line,
        grams: isNaN(g) ? null : g,
        foodQuery: weightSuffixMatch[1].trim(),
        isEstimated: false,
        isCookedWeight: false,
        isNote: false,
      });
      continue;
    }

    // Line without specific weight
    result.push({
      rawLine: line,
      grams: null,
      foodQuery: line,
      isEstimated: true,
      isCookedWeight: false,
      isNote: true,
    });
  }

  return result;
}
