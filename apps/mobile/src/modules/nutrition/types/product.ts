export type ProductSource = "manual" | "open_food_facts" | "ai_estimate";

export type Product = {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  servingSize: string | null;
  servingGrams: number | null;
  kcalPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  netWeightG: number | null;
  eatenDrained: boolean;
  drainedKcalPer100g: number | null;
  drainedProteinPer100g: number | null;
  drainedCarbsPer100g: number | null;
  drainedFatPer100g: number | null;
  usualDrainedG: number | null;
  source: ProductSource;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

// The fields the product form edits. Source, favorite and timestamps are owned by the repository.
export type ProductInput = Pick<
  Product,
  | "barcode"
  | "name"
  | "brand"
  | "servingSize"
  | "servingGrams"
  | "kcalPer100g"
  | "proteinPer100g"
  | "carbsPer100g"
  | "fatPer100g"
  | "netWeightG"
  | "eatenDrained"
  | "drainedKcalPer100g"
  | "drainedProteinPer100g"
  | "drainedCarbsPer100g"
  | "drainedFatPer100g"
  | "usualDrainedG"
>;
