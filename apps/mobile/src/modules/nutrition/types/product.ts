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
>;
