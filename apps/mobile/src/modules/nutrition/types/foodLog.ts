export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export type Nutrients = {
  kcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type Per100g = {
  kcalPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
};

// Name and per-100 g values are copies taken at log time (ADR-6), so later
// product edits never change a logged day.
export type FoodLogEntry = Per100g &
  Nutrients & {
    id: string;
    day: string;
    loggedAt: string;
    mealType: MealType;
    productId: string | null;
    productName: string;
    grams: number;
    createdAt: string;
    updatedAt: string;
  };

export type EntryInput = { mealType: MealType; grams: number };
