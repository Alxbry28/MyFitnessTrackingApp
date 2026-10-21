import type { MealType } from "@/modules/nutrition/types/foodLog";

export const PANTRY_KINDS = ["packaged", "supplement", "batch"] as const;
export type PantryKind = (typeof PANTRY_KINDS)[number];
// The kinds a library product can be stocked as; batches come from cooking.
export type ProductStockKind = Exclude<PantryKind, "batch">;

export const LOCATIONS = ["cupboard", "fridge", "freezer"] as const;
export type PantryLocation = (typeof LOCATIONS)[number];

// One row of the Pantry list: an item with its ledger sums (stock is never stored, ADR-7).
export type PantryStock = {
  id: string;
  kind: PantryKind;
  productId: string | null;
  name: string;
  netWeightG: number | null;
  // Eaten drained with drained values; usualDrainedG then turns net grams into drained ones.
  drained: boolean;
  usualDrainedG: number | null;
  // The product's serving grams: a supplement's scoop.
  servingGrams: number | null;
  location: PantryLocation;
  expiresAt: string | null;
  openedAt: string | null;
  gramsLeft: number;
  // Grams eaten in the last 14 days and the first movement, for a supplement's days left.
  eatenRecentG: number;
  firstMovementAt: string | null;
};

export const STOCK_REASONS = [
  "bought",
  "cooked",
  "eaten",
  "used_in_cooking",
  "shared",
  "discarded",
  "spilled",
  "adjustment",
] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

// The reasons offered by Remove; eating has its own path and adjustments their own tab.
export const REMOVE_REASONS = ["shared", "discarded", "spilled"] as const;
export type RemoveReason = (typeof REMOVE_REASONS)[number];

// One ledger row for the item's history; mealType comes from the linked log entry.
export type StockMovement = {
  id: string;
  occurredAt: string;
  deltaUnits: number | null;
  deltaGrams: number;
  reason: StockReason;
  mealType: MealType | null;
};
