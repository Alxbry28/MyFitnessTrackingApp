import type { Nutrients, Per100g } from "../types/foodLog";

// Kept free of React and SQLite so it can get unit tests once a runner exists.

function scale(per100: number | null, grams: number): number | null {
  return per100 === null ? null : (per100 * grams) / 100;
}

export function forGrams(per100: Per100g, grams: number): Nutrients {
  return {
    kcal: (per100.kcalPer100g * grams) / 100,
    proteinG: scale(per100.proteinPer100g, grams),
    carbsG: scale(per100.carbsPer100g, grams),
    fatG: scale(per100.fatPer100g, grams),
  };
}

// A missing macro counts as 0 in a total, so one unknown fat value doesn't blank the day.
export function sumTotals(items: Nutrients[]): Nutrients {
  return items.reduce<Nutrients>(
    (sum, n) => ({
      kcal: sum.kcal + n.kcal,
      proteinG: (sum.proteinG ?? 0) + (n.proteinG ?? 0),
      carbsG: (sum.carbsG ?? 0) + (n.carbsG ?? 0),
      fatG: (sum.fatG ?? 0) + (n.fatG ?? 0),
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export function formatKcal(kcal: number): string {
  return String(Math.round(kcal));
}

// One decimal only below 10 g (DESIGN_SYSTEM §9).
export function formatGrams(grams: number): string {
  const value = grams < 10 ? Math.round(grams * 10) / 10 : Math.round(grams);
  return `${value} g`;
}

export function formatMacro(grams: number | null): string {
  return grams === null ? "-" : String(Math.round(grams * 10) / 10);
}
