export type Recipe = {
  id: string;
  name: string;
  notes: string | null;
  learnedCookedRatio: number | null;
  createdAt: string;
  updatedAt: string;
  ingredientCount?: number;
  timesCooked?: number;
  kcalPer100g?: number | null;
};

export type RecipeIngredient = {
  id: string;
  recipeId: string;
  productId: string;
  productName: string;
  rawGrams: number;
  isEstimated: boolean;
  kcalPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
};

export type RecipeDetail = Recipe & {
  ingredients: RecipeIngredient[];
};

export const WEIGHT_METHODS = ["settled", "weighed_parts", "estimated"] as const;
export type WeightMethod = (typeof WEIGHT_METHODS)[number];

export type Batch = {
  id: string;
  recipeId: string | null;
  name: string;
  cookedAt: string;
  cookedWeightG: number;
  weightMethod: WeightMethod;
  isSettled: boolean;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  createdAt: string;
  updatedAt: string;
  pantryItemId?: string;
  gramsLeft?: number;
};

export type BatchIngredient = {
  id: string;
  batchId: string;
  productId: string;
  productName?: string;
  rawGrams: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  isEstimated: boolean;
};

export type BatchDetail = Batch & {
  ingredients: BatchIngredient[];
};

export type RecipeInput = {
  name: string;
  notes?: string | null;
  ingredients: {
    productId: string;
    rawGrams: number;
    isEstimated?: boolean;
  }[];
};

export type BatchInput = {
  recipeId?: string | null;
  name: string;
  cookedAt: string;
  cookedWeightG: number;
  weightMethod: WeightMethod;
  isSettled: boolean;
  ingredients: {
    productId: string;
    rawGrams: number;
    isEstimated?: boolean;
    kcalPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  }[];
};

export type ParsedNoteLine = {
  rawLine: string;
  grams: number | null;
  foodQuery: string;
  isEstimated: boolean;
  isCookedWeight: boolean;
  isNote: boolean;
};

export type MatchedNoteIngredient = {
  rawLine: string;
  grams: number;
  productId: string | null;
  productName: string;
  isEstimated: boolean;
  isCookedWeight: boolean;
  kcalPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
};
