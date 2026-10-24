export type PartitionMethod = "equal" | "manual" | "ai";

export type MealPrepItem = {
  id: string;
  mealPrepId: string;
  foodName: string;
  gramsPerBox: number;
  productId?: string | null;
  batchId?: string | null;
  pantryItemId?: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealPrep = {
  id: string;
  name: string;
  tupperwareCount: number;
  tupperwaresLeft: number;
  netWeightG: number;
  kcalPerBox: number;
  proteinPerBox: number;
  carbsPerBox: number;
  fatPerBox: number;
  partitionMethod: PartitionMethod;
  aiPrompt?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: MealPrepItem[];
};

export type CreateMealPrepInput = {
  name: string;
  tupperwareCount: number;
  netWeightG: number;
  kcalPerBox: number;
  proteinPerBox: number;
  carbsPerBox: number;
  fatPerBox: number;
  partitionMethod: PartitionMethod;
  aiPrompt?: string | null;
  items: {
    foodName: string;
    gramsPerBox: number;
    productId?: string | null;
    batchId?: string | null;
    pantryItemId?: string | null;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
};

export type AvailableCookedFood = {
  id: string;
  name: string;
  gramsAvailable: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  batchId?: string;
  pantryItemId?: string;
  productId?: string;
};
