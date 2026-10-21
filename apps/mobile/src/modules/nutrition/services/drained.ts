import type { Per100g } from "../types/foodLog";
import type { Product } from "../types/product";

// Kept free of React and SQLite so it can get unit tests once a runner exists.

// Drained values only apply once the drained kcal is known.
export function isDrained(product: Product): boolean {
  return product.eatenDrained && product.drainedKcalPer100g !== null;
}

// The values a log entry copies: drained ones when the product is eaten drained, since the
// label counts the oil or brine that gets thrown away (BA decision D4).
export function loggedPer100(product: Product): Per100g {
  if (isDrained(product)) {
    return {
      kcalPer100g: product.drainedKcalPer100g ?? product.kcalPer100g,
      proteinPer100g: product.drainedProteinPer100g,
      carbsPer100g: product.drainedCarbsPer100g,
      fatPer100g: product.drainedFatPer100g,
    };
  }
  return {
    kcalPer100g: product.kcalPer100g,
    proteinPer100g: product.proteinPer100g,
    carbsPer100g: product.carbsPer100g,
    fatPer100g: product.fatPer100g,
  };
}

export type DrainedReference = { label: string; values: Per100g };

// Generic USDA SR Legacy drained solids (15119, 15121) until an online lookup exists.
export const DRAINED_REFERENCES: DrainedReference[] = [
  { label: "Tuna in oil", values: { kcalPer100g: 198, proteinPer100g: 29.13, carbsPer100g: 0, fatPer100g: 8.21 } },
  { label: "Tuna in water", values: { kcalPer100g: 116, proteinPer100g: 25.51, carbsPer100g: 0, fatPer100g: 0.82 } },
];
