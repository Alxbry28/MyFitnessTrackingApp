import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { MealType } from "@/modules/nutrition/types/foodLog";

import {
  calculateCookedPer100g,
  calculateCookedRatio,
  calculateRawTotals,
  updateLearnedRatio,
  type RawTotals,
} from "../services/recipeCalc";
import type { Batch, BatchDetail, BatchIngredient, BatchInput } from "../types/recipes";

type BatchRow = {
  id: string;
  recipe_id: string | null;
  name: string;
  cooked_at: string;
  cooked_weight_g: number;
  weight_method: "settled" | "weighed_parts" | "estimated";
  is_settled: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  created_at: string;
  updated_at: string;
  pantry_item_id: string | null;
  grams_left: number | null;
};

type BatchIngredientRow = {
  id: string;
  batch_id: string;
  product_id: string;
  product_name: string | null;
  raw_grams: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  is_estimated: number;
};

export const batchRepo = {
  async create(
    db: SQLiteDatabase,
    input: BatchInput,
  ): Promise<{ batchId: string; pantryItemId: string }> {
    const batchId = randomUUID();
    const pantryItemId = randomUUID();
    const now = new Date().toISOString();

    const rawTotals = calculateRawTotals(
      input.ingredients.map((i) => ({
        rawGrams: i.rawGrams,
        kcalPer100g: i.kcalPer100g,
        proteinPer100g: i.proteinPer100g,
        carbsPer100g: i.carbsPer100g,
        fatPer100g: i.fatPer100g,
      })),
    );

    const cookedNutrition = calculateCookedPer100g(rawTotals, input.cookedWeightG);

    await db.withExclusiveTransactionAsync(async (tx) => {
      // 1. Insert batch
      await tx.runAsync(`
        INSERT INTO batches (
          id, recipe_id, name, cooked_at, cooked_weight_g, weight_method, is_settled,
          kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        batchId,
        input.recipeId ?? null,
        input.name.trim(),
        input.cookedAt,
        input.cookedWeightG,
        input.weightMethod,
        input.isSettled ? 1 : 0,
        cookedNutrition.kcalPer100g,
        cookedNutrition.proteinPer100g,
        cookedNutrition.carbsPer100g,
        cookedNutrition.fatPer100g,
        now,
        now,
      ]);

      // 2. Insert batch ingredients
      for (const ing of input.ingredients) {
        await tx.runAsync(`
          INSERT INTO batch_ingredients (
            id, batch_id, product_id, raw_grams, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_estimated, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          randomUUID(),
          batchId,
          ing.productId,
          ing.rawGrams,
          ing.kcalPer100g,
          ing.proteinPer100g,
          ing.carbsPer100g,
          ing.fatPer100g,
          ing.isEstimated ? 1 : 0,
          now,
          now,
        ]);
      }

      // 3. Create pantry item (kind = 'batch', location = 'fridge')
      await tx.runAsync(`
        INSERT INTO pantry_items (
          id, kind, batch_id, product_id, status, location, created_at, updated_at
        ) VALUES (?, 'batch', ?, NULL, 'active', 'fridge', ?, ?)
      `, [pantryItemId, batchId, now, now]);

      // 4. Initial movement: 'cooked' adds batch cooked weight to pantry
      await tx.runAsync(`
        INSERT INTO stock_movements (
          id, pantry_item_id, occurred_at, delta_grams, reason, batch_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'cooked', ?, ?, ?)
      `, [randomUUID(), pantryItemId, input.cookedAt, input.cookedWeightG, batchId, now, now]);

      // 5. Deduct tracked pantry ingredients used in cooking (Story M7)
      for (const ing of input.ingredients) {
        const pantryMatch = await tx.getFirstAsync<{ id: string; stock: number }>(`
          SELECT i.id,
            COALESCE((SELECT SUM(m.delta_grams) FROM stock_movements m WHERE m.pantry_item_id = i.id AND m.deleted_at IS NULL), 0) AS stock
          FROM pantry_items i
          WHERE i.product_id = ? AND i.kind IN ('packaged', 'supplement') AND i.deleted_at IS NULL
        `, [ing.productId]);

        if (pantryMatch && pantryMatch.stock > 0) {
          const deductGrams = Math.min(pantryMatch.stock, ing.rawGrams);
          await tx.runAsync(`
            INSERT INTO stock_movements (
              id, pantry_item_id, occurred_at, delta_grams, reason, batch_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'used_in_cooking', ?, ?, ?)
          `, [randomUUID(), pantryMatch.id, input.cookedAt, -deductGrams, batchId, now, now]);
        }
      }

      // 6. Foreign key safety check
      const fkErrors = await tx.getAllAsync<{ table: string }>("PRAGMA foreign_key_check;");
      if (fkErrors.length > 0) {
        throw new Error(`Foreign key violation in batch creation: ${JSON.stringify(fkErrors)}`);
      }
    });

    return { batchId, pantryItemId };
  },

  async get(db: SQLiteDatabase, batchId: string): Promise<BatchDetail | null> {
    const row = await db.getFirstAsync<BatchRow>(`
      SELECT b.id, b.recipe_id, b.name, b.cooked_at, b.cooked_weight_g, b.weight_method,
        b.is_settled, b.kcal_per_100g, b.protein_per_100g, b.carbs_per_100g, b.fat_per_100g,
        b.created_at, b.updated_at, pi.id AS pantry_item_id,
        (SELECT SUM(m.delta_grams) FROM stock_movements m WHERE m.pantry_item_id = pi.id AND m.deleted_at IS NULL) AS grams_left
      FROM batches b
      LEFT JOIN pantry_items pi ON pi.batch_id = b.id AND pi.deleted_at IS NULL
      WHERE b.id = ? AND b.deleted_at IS NULL
    `, [batchId]);

    if (!row) return null;

    const ingRows = await db.getAllAsync<BatchIngredientRow>(`
      SELECT bi.id, bi.batch_id, bi.product_id, p.name AS product_name, bi.raw_grams,
        bi.kcal_per_100g, bi.protein_per_100g, bi.carbs_per_100g, bi.fat_per_100g, bi.is_estimated
      FROM batch_ingredients bi
      LEFT JOIN products p ON p.id = bi.product_id
      WHERE bi.batch_id = ? AND bi.deleted_at IS NULL
    `, [batchId]);

    const ingredients: BatchIngredient[] = ingRows.map((r) => ({
      id: r.id,
      batchId: r.batch_id,
      productId: r.product_id,
      productName: r.product_name ?? "Ingredient",
      rawGrams: r.raw_grams,
      kcalPer100g: r.kcal_per_100g,
      proteinPer100g: r.protein_per_100g,
      carbsPer100g: r.carbs_per_100g,
      fatPer100g: r.fat_per_100g,
      isEstimated: r.is_estimated === 1,
    }));

    return {
      id: row.id,
      recipeId: row.recipe_id,
      name: row.name,
      cookedAt: row.cooked_at,
      cookedWeightG: row.cooked_weight_g,
      weightMethod: row.weight_method,
      isSettled: row.is_settled === 1,
      kcalPer100g: row.kcal_per_100g,
      proteinPer100g: row.protein_per_100g,
      carbsPer100g: row.carbs_per_100g,
      fatPer100g: row.fat_per_100g,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      pantryItemId: row.pantry_item_id ?? undefined,
      gramsLeft: row.grams_left ?? 0,
      ingredients,
    };
  },

  async listActive(db: SQLiteDatabase): Promise<Batch[]> {
    const rows = await db.getAllAsync<BatchRow>(`
      SELECT b.id, b.recipe_id, b.name, b.cooked_at, b.cooked_weight_g, b.weight_method,
        b.is_settled, b.kcal_per_100g, b.protein_per_100g, b.carbs_per_100g, b.fat_per_100g,
        b.created_at, b.updated_at, pi.id AS pantry_item_id,
        (SELECT SUM(m.delta_grams) FROM stock_movements m WHERE m.pantry_item_id = pi.id AND m.deleted_at IS NULL) AS grams_left
      FROM batches b
      JOIN pantry_items pi ON pi.batch_id = b.id AND pi.deleted_at IS NULL
      WHERE b.deleted_at IS NULL
      HAVING grams_left > 0.5
      ORDER BY b.cooked_at ASC
    `);

    return rows.map((r) => ({
      id: r.id,
      recipeId: r.recipe_id,
      name: r.name,
      cookedAt: r.cooked_at,
      cookedWeightG: r.cooked_weight_g,
      weightMethod: r.weight_method,
      isSettled: r.is_settled === 1,
      kcalPer100g: r.kcal_per_100g,
      proteinPer100g: r.protein_per_100g,
      carbsPer100g: r.carbs_per_100g,
      fatPer100g: r.fat_per_100g,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      pantryItemId: r.pantry_item_id ?? undefined,
      gramsLeft: r.grams_left ?? 0,
    }));
  },

  async logPortion(
    db: SQLiteDatabase,
    input: {
      batchId: string;
      pantryItemId: string;
      batchName: string;
      grams: number;
      mealType: MealType;
      day: string;
    },
  ): Promise<string> {
    const entryId = randomUUID();
    const movementId = randomUUID();
    const now = new Date().toISOString();

    await db.withExclusiveTransactionAsync(async (tx) => {
      // Get batch per-100 values
      const batch = await tx.getFirstAsync<{
        kcal_per_100g: number;
        protein_per_100g: number;
        carbs_per_100g: number;
        fat_per_100g: number;
      }>("SELECT kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g FROM batches WHERE id = ?", [input.batchId]);

      if (!batch) throw new Error("Batch not found");

      const factor = input.grams / 100;
      const kcal = Math.round(batch.kcal_per_100g * factor);
      const proteinG = Math.round(batch.protein_per_100g * factor * 10) / 10;
      const carbsG = Math.round(batch.carbs_per_100g * factor * 10) / 10;
      const fatG = Math.round(batch.fat_per_100g * factor * 10) / 10;

      // 1. Insert food log entry
      await tx.runAsync(`
        INSERT INTO food_log_entries (
          id, day, logged_at, meal_type, product_id, product_name, grams,
          kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
          kcal, protein_g, carbs_g, fat_g, pantry_item_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        entryId,
        input.day,
        now,
        input.mealType,
        input.batchName,
        input.grams,
        batch.kcal_per_100g,
        batch.protein_per_100g,
        batch.carbs_per_100g,
        batch.fat_per_100g,
        kcal,
        proteinG,
        carbsG,
        fatG,
        input.pantryItemId,
        now,
        now,
      ]);

      // 2. Insert stock movement 'eaten'
      await tx.runAsync(`
        INSERT INTO stock_movements (
          id, pantry_item_id, occurred_at, delta_grams, reason, food_log_entry_id, batch_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'eaten', ?, ?, ?, ?)
      `, [movementId, input.pantryItemId, now, -input.grams, entryId, input.batchId, now, now]);

      // 3. Check if pantry item is finished
      const stockRow = await tx.getFirstAsync<{ stock: number }>(`
        SELECT SUM(delta_grams) AS stock FROM stock_movements WHERE pantry_item_id = ? AND deleted_at IS NULL
      `, [input.pantryItemId]);

      if (stockRow && stockRow.stock <= 0.5) {
        await tx.runAsync(`UPDATE pantry_items SET status = 'finished', updated_at = ? WHERE id = ?`, [now, input.pantryItemId]);
      }
    });

    return entryId;
  },

  async settle(
    db: SQLiteDatabase,
    batchId: string,
    actualCookedWeightG?: number,
  ): Promise<{
    settledCookedWeightG: number;
    newKcalPer100g: number;
    portionsUpdated: number;
  }> {
    const now = new Date().toISOString();
    let settledCookedWeightG = actualCookedWeightG ?? 0;
    let newKcalPer100g = 0;
    let portionsUpdated = 0;

    await db.withExclusiveTransactionAsync(async (tx) => {
      // 1. Get batch & pantry item
      const batch = await tx.getFirstAsync<{
        recipe_id: string | null;
        cooked_weight_g: number;
        pantry_item_id: string | null;
      }>(`
        SELECT b.recipe_id, b.cooked_weight_g, pi.id AS pantry_item_id
        FROM batches b
        LEFT JOIN pantry_items pi ON pi.batch_id = b.id AND pi.deleted_at IS NULL
        WHERE b.id = ?
      `, [batchId]);

      if (!batch) throw new Error("Batch not found");

      // If actual weight was not provided, calculate total grams taken out
      if (!settledCookedWeightG || settledCookedWeightG <= 0) {
        const outRow = await tx.getFirstAsync<{ total_out: number }>(`
          SELECT -SUM(delta_grams) AS total_out
          FROM stock_movements
          WHERE pantry_item_id = ? AND delta_grams < 0 AND deleted_at IS NULL
        `, [batch.pantry_item_id]);
        settledCookedWeightG = outRow?.total_out && outRow.total_out > 0 ? outRow.total_out : batch.cooked_weight_g;
      }

      // 2. Recalculate raw totals from batch ingredients
      const ingRows = await tx.getAllAsync<{
        raw_grams: number;
        kcal_per_100g: number;
        protein_per_100g: number;
        carbs_per_100g: number;
        fat_per_100g: number;
      }>(`
        SELECT raw_grams, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g
        FROM batch_ingredients
        WHERE batch_id = ? AND deleted_at IS NULL
      `, [batchId]);

      const rawTotals = calculateRawTotals(
        ingRows.map((r) => ({
          rawGrams: r.raw_grams,
          kcalPer100g: r.kcal_per_100g,
          proteinPer100g: r.protein_per_100g,
          carbsPer100g: r.carbs_per_100g,
          fatPer100g: r.fat_per_100g,
        })),
      );

      const cookedNutrition = calculateCookedPer100g(rawTotals, settledCookedWeightG);
      newKcalPer100g = cookedNutrition.kcalPer100g;

      // 3. Update batch to settled
      await tx.runAsync(`
        UPDATE batches
        SET cooked_weight_g = ?,
            is_settled = 1,
            kcal_per_100g = ?,
            protein_per_100g = ?,
            carbs_per_100g = ?,
            fat_per_100g = ?,
            updated_at = ?
        WHERE id = ?
      `, [
        settledCookedWeightG,
        cookedNutrition.kcalPer100g,
        cookedNutrition.proteinPer100g,
        cookedNutrition.carbsPer100g,
        cookedNutrition.fatPer100g,
        now,
        batchId,
      ]);

      // 4. Update all food log entries linked to this batch's pantry item
      if (batch.pantry_item_id) {
        const entries = await tx.getAllAsync<{ id: string; grams: number }>(`
          SELECT id, grams FROM food_log_entries
          WHERE pantry_item_id = ? AND deleted_at IS NULL
        `, [batch.pantry_item_id]);

        portionsUpdated = entries.length;

        for (const entry of entries) {
          const factor = entry.grams / 100;
          const kcal = Math.round(cookedNutrition.kcalPer100g * factor);
          const proteinG = Math.round(cookedNutrition.proteinPer100g * factor * 10) / 10;
          const carbsG = Math.round(cookedNutrition.carbsPer100g * factor * 10) / 10;
          const fatG = Math.round(cookedNutrition.fatPer100g * factor * 10) / 10;

          await tx.runAsync(`
            UPDATE food_log_entries
            SET kcal_per_100g = ?,
                protein_per_100g = ?,
                carbs_per_100g = ?,
                fat_per_100g = ?,
                kcal = ?,
                protein_g = ?,
                carbs_g = ?,
                fat_g = ?,
                updated_by_settle = 1,
                updated_at = ?
            WHERE id = ?
          `, [
            cookedNutrition.kcalPer100g,
            cookedNutrition.proteinPer100g,
            cookedNutrition.carbsPer100g,
            cookedNutrition.fatPer100g,
            kcal,
            proteinG,
            carbsG,
            fatG,
            now,
            entry.id,
          ]);
        }
      }

      // 5. Update recipe learned ratio if from a saved recipe
      if (batch.recipe_id && rawTotals.rawWeightG > 0) {
        const newRatio = calculateCookedRatio(settledCookedWeightG, rawTotals.rawWeightG);
        const recipe = await tx.getFirstAsync<{ learned_cooked_ratio: number | null }>(`
          SELECT learned_cooked_ratio FROM recipes WHERE id = ?
        `, [batch.recipe_id]);

        const settledCountRow = await tx.getFirstAsync<{ count: number }>(`
          SELECT COUNT(*) AS count FROM batches WHERE recipe_id = ? AND is_settled = 1 AND deleted_at IS NULL
        `, [batch.recipe_id]);

        const updatedRatio = updateLearnedRatio(
          recipe?.learned_cooked_ratio ?? null,
          settledCountRow?.count ?? 0,
          newRatio,
        );

        await tx.runAsync(`
          UPDATE recipes SET learned_cooked_ratio = ?, updated_at = ? WHERE id = ?
        `, [updatedRatio, now, batch.recipe_id]);
      }
    });

    return { settledCookedWeightG, newKcalPer100g, portionsUpdated };
  },

  async getSettlePreview(
    db: SQLiteDatabase,
    batchId: string,
  ): Promise<{
    batch: BatchDetail;
    totalTakenOutG: number;
    portions: {
      id: string;
      mealType: string;
      day: string;
      grams: number;
      estKcal: number;
    }[];
    rawTotals: RawTotals;
  } | null> {
    const batch = await batchRepo.get(db, batchId);
    if (!batch || !batch.pantryItemId) return null;

    const outRow = await db.getFirstAsync<{ total_out: number }>(`
      SELECT -SUM(delta_grams) AS total_out
      FROM stock_movements
      WHERE pantry_item_id = ? AND delta_grams < 0 AND deleted_at IS NULL
    `, [batch.pantryItemId]);

    const portions = await db.getAllAsync<{
      id: string;
      meal_type: string;
      day: string;
      grams: number;
      kcal: number;
    }>(`
      SELECT id, meal_type, day, grams, kcal
      FROM food_log_entries
      WHERE pantry_item_id = ? AND deleted_at IS NULL
      ORDER BY logged_at ASC
    `, [batch.pantryItemId]);

    const rawTotals = calculateRawTotals(
      batch.ingredients.map((i) => ({
        rawGrams: i.rawGrams,
        kcalPer100g: i.kcalPer100g,
        proteinPer100g: i.proteinPer100g,
        carbsPer100g: i.carbsPer100g,
        fatPer100g: i.fatPer100g,
      })),
    );

    return {
      batch,
      totalTakenOutG: outRow?.total_out ?? 0,
      portions: portions.map((p) => ({
        id: p.id,
        mealType: p.meal_type,
        day: p.day,
        grams: p.grams,
        estKcal: p.kcal,
      })),
      rawTotals,
    };
  },
};
