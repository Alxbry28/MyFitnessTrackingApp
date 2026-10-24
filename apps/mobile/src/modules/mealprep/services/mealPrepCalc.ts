import type { AvailableCookedFood } from "../types/mealPrep";

export type CompartmentPortion = {
  foodId: string;
  foodName: string;
  gramsPerBox: number;
  totalGramsUsed: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  batchId?: string;
  pantryItemId?: string;
};

export type PartitionSummary = {
  tupperwareCount: number;
  netWeightPerBox: number;
  kcalPerBox: number;
  proteinPerBox: number;
  carbsPerBox: number;
  fatPerBox: number;
  compartments: CompartmentPortion[];
};

export function calculateEqualPartition(
  selectedFoods: AvailableCookedFood[],
  tupperwareCount: number,
): PartitionSummary {
  const n = Math.max(1, tupperwareCount);
  const compartments: CompartmentPortion[] = selectedFoods.map((f) => {
    const gramsPerBox = Math.round(f.gramsAvailable / n);
    const kcal = Math.round((f.kcalPer100g * gramsPerBox) / 100);
    const protein = Number(((f.proteinPer100g * gramsPerBox) / 100).toFixed(1));
    const carbs = Number(((f.carbsPer100g * gramsPerBox) / 100).toFixed(1));
    const fat = Number(((f.fatPer100g * gramsPerBox) / 100).toFixed(1));

    return {
      foodId: f.id,
      foodName: f.name,
      gramsPerBox,
      totalGramsUsed: gramsPerBox * n,
      kcal,
      protein,
      carbs,
      fat,
      batchId: f.batchId,
      pantryItemId: f.pantryItemId,
    };
  });

  const netWeightPerBox = compartments.reduce((sum, c) => sum + c.gramsPerBox, 0);
  const kcalPerBox = Math.round(compartments.reduce((sum, c) => sum + c.kcal, 0));
  const proteinPerBox = Number(compartments.reduce((sum, c) => sum + c.protein, 0).toFixed(1));
  const carbsPerBox = Number(compartments.reduce((sum, c) => sum + c.carbs, 0).toFixed(1));
  const fatPerBox = Number(compartments.reduce((sum, c) => sum + c.fat, 0).toFixed(1));

  return {
    tupperwareCount: n,
    netWeightPerBox,
    kcalPerBox,
    proteinPerBox,
    carbsPerBox,
    fatPerBox,
    compartments,
  };
}

export function calculateManualPartition(
  selectedFoods: AvailableCookedFood[],
  manualGramsMap: Record<string, number>,
  tupperwareCount: number,
): PartitionSummary {
  const n = Math.max(1, tupperwareCount);
  const compartments: CompartmentPortion[] = selectedFoods.map((f) => {
    const gramsPerBox = Math.max(0, manualGramsMap[f.id] ?? Math.round(f.gramsAvailable / n));
    const kcal = Math.round((f.kcalPer100g * gramsPerBox) / 100);
    const protein = Number(((f.proteinPer100g * gramsPerBox) / 100).toFixed(1));
    const carbs = Number(((f.carbsPer100g * gramsPerBox) / 100).toFixed(1));
    const fat = Number(((f.fatPer100g * gramsPerBox) / 100).toFixed(1));

    return {
      foodId: f.id,
      foodName: f.name,
      gramsPerBox,
      totalGramsUsed: gramsPerBox * n,
      kcal,
      protein,
      carbs,
      fat,
      batchId: f.batchId,
      pantryItemId: f.pantryItemId,
    };
  });

  const netWeightPerBox = compartments.reduce((sum, c) => sum + c.gramsPerBox, 0);
  const kcalPerBox = Math.round(compartments.reduce((sum, c) => sum + c.kcal, 0));
  const proteinPerBox = Number(compartments.reduce((sum, c) => sum + c.protein, 0).toFixed(1));
  const carbsPerBox = Number(compartments.reduce((sum, c) => sum + c.carbs, 0).toFixed(1));
  const fatPerBox = Number(compartments.reduce((sum, c) => sum + c.fat, 0).toFixed(1));

  return {
    tupperwareCount: n,
    netWeightPerBox,
    kcalPerBox,
    proteinPerBox,
    carbsPerBox,
    fatPerBox,
    compartments,
  };
}
