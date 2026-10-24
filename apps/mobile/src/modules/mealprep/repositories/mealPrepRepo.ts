import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { MealType } from "@/modules/nutrition/types/foodLog";
import { dayKey, defaultMeal } from "@/modules/nutrition/services/mealTime";
import type {
  AvailableCookedFood,
  CreateMealPrepInput,
  MealPrep,
  MealPrepItem,
} from "../types/mealPrep";

type MealPrepRow = {
  id: string;
  name: string;
  tupperware_count: number;
  tupperwares_left: number;
  net_weight_g: number;
  kcal_per_box: number;
  protein_per_box: number;
  carbs_per_box: number;
  fat_per_box: number;
  partition_method: "equal" | "manual" | "ai";
  ai_prompt: string | null;
  created_at: string;
  updated_at: string;
};

type MealPrepItemRow = {
  id: string;
  meal_prep_id: string;
  food_name: string;
  grams_per_box: number;
  product_id: string | null;
  batch_id: string | null;
  pantry_item_id: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const mealPrepRepo = {
  async listActive(db: SQLiteDatabase): Promise<MealPrep[]> {
    const rows = await db.getAllAsync<MealPrepRow>(`
      SELECT id, name, tupperware_count, tupperwares_left, net_weight_g,
        kcal_per_box, protein_per_box, carbs_per_box, fat_per_box,
        partition_method, ai_prompt, created_at, updated_at
      FROM meal_preps
      WHERE tupperwares_left > 0 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `);

    const result: MealPrep[] = [];
    for (const r of rows) {
      const items = await this.getItems(db, r.id);
      result.push({
        id: r.id,
        name: r.name,
        tupperwareCount: r.tupperware_count,
        tupperwaresLeft: r.tupperwares_left,
        netWeightG: r.net_weight_g,
        kcalPerBox: r.kcal_per_box,
        proteinPerBox: r.protein_per_box,
        carbsPerBox: r.carbs_per_box,
        fatPerBox: r.fat_per_box,
        partitionMethod: r.partition_method,
        aiPrompt: r.ai_prompt,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        items,
      });
    }

    return result;
  },

  async getItems(db: SQLiteDatabase, mealPrepId: string): Promise<MealPrepItem[]> {
    const itemRows = await db.getAllAsync<MealPrepItemRow>(`
      SELECT id, meal_prep_id, food_name, grams_per_box, product_id, batch_id, pantry_item_id,
        kcal, protein, carbs, fat
      FROM meal_prep_items
      WHERE meal_prep_id = ? AND deleted_at IS NULL
    `, [mealPrepId]);

    return itemRows.map((i) => ({
      id: i.id,
      mealPrepId: i.meal_prep_id,
      foodName: i.food_name,
      gramsPerBox: i.grams_per_box,
      productId: i.product_id,
      batchId: i.batch_id,
      pantryItemId: i.pantry_item_id,
      kcal: i.kcal,
      protein: i.protein,
      carbs: i.carbs,
      fat: i.fat,
    }));
  },

  async create(db: SQLiteDatabase, input: CreateMealPrepInput): Promise<string> {
    const mealPrepId = randomUUID();
    const now = new Date().toISOString();

    await db.withExclusiveTransactionAsync(async (tx) => {
      // 1. Insert meal_prep
      await tx.runAsync(`
        INSERT INTO meal_preps (
          id, name, tupperware_count, tupperwares_left, net_weight_g,
          kcal_per_box, protein_per_box, carbs_per_box, fat_per_box,
          partition_method, ai_prompt, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        mealPrepId,
        input.name.trim(),
        input.tupperwareCount,
        input.tupperwareCount,
        input.netWeightG,
        input.kcalPerBox,
        input.proteinPerBox,
        input.carbsPerBox,
        input.fatPerBox,
        input.partitionMethod,
        input.aiPrompt ?? null,
        now,
        now,
      ]);

      // 2. Insert items and deduct from pantry inventory if linked
      for (const item of input.items) {
        const itemId = randomUUID();
        await tx.runAsync(`
          INSERT INTO meal_prep_items (
            id, meal_prep_id, food_name, grams_per_box, product_id, batch_id, pantry_item_id,
            kcal, protein, carbs, fat, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId,
          mealPrepId,
          item.foodName,
          item.gramsPerBox,
          item.productId ?? null,
          item.batchId ?? null,
          item.pantryItemId ?? null,
          item.kcal,
          item.protein,
          item.carbs,
          item.fat,
          now,
          now,
        ]);

        // Deduct from bulk pantry stock movement if pantry item exists
        if (item.pantryItemId) {
          const totalUsedGrams = item.gramsPerBox * input.tupperwareCount;
          await tx.runAsync(`
            INSERT INTO stock_movements (
              id, pantry_item_id, occurred_at, delta_grams, reason, batch_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'used_in_cooking', ?, ?, ?)
          `, [randomUUID(), item.pantryItemId, now, -totalUsedGrams, item.batchId ?? null, now, now]);
        }
      }

      // 3. Register as product in products table for search and 1-tap/text log compatibility
      const existingProduct = await tx.getFirstAsync<{ id: string }>(`
        SELECT id FROM products WHERE LOWER(name) = LOWER(?) AND deleted_at IS NULL
      `, [input.name.trim()]);

      if (!existingProduct) {
        const kcalPer100 = Math.round((input.kcalPerBox / input.netWeightG) * 100);
        const pPer100 = Number(((input.proteinPerBox / input.netWeightG) * 100).toFixed(1));
        const cPer100 = Number(((input.carbsPerBox / input.netWeightG) * 100).toFixed(1));
        const fPer100 = Number(((input.fatPerBox / input.netWeightG) * 100).toFixed(1));

        await tx.runAsync(`
          INSERT INTO products (
            id, name, serving_name, serving_grams, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
            created_at, updated_at
          ) VALUES (?, ?, 'tupperware', ?, ?, ?, ?, ?, ?, ?)
        `, [
          randomUUID(),
          input.name.trim(),
          input.netWeightG,
          kcalPer100,
          pPer100,
          cPer100,
          fPer100,
          now,
          now,
        ]);
      }
    });

    return mealPrepId;
  },

  async eatOneBox(
    db: SQLiteDatabase,
    mealPrepId: string,
    targetMeal?: MealType,
    targetDay?: string,
  ): Promise<{ remaining: number; loggedKcal: number }> {
    const meal = targetMeal || defaultMeal(new Date());
    const day = targetDay || dayKey(new Date());
    const now = new Date().toISOString();

    let remaining = 0;
    let loggedKcal = 0;

    await db.withExclusiveTransactionAsync(async (tx) => {
      const row = await tx.getFirstAsync<MealPrepRow>(`
        SELECT * FROM meal_preps WHERE id = ? AND deleted_at IS NULL
      `, [mealPrepId]);

      if (!row) throw new Error("Meal prep not found.");
      if (row.tupperwares_left <= 0) throw new Error("No tupperwares remaining in this batch.");

      remaining = row.tupperwares_left - 1;
      loggedKcal = row.kcal_per_box;

      // 1. Decrement tupperwares_left
      await tx.runAsync(`
        UPDATE meal_preps SET tupperwares_left = ?, updated_at = ? WHERE id = ?
      `, [remaining, now, mealPrepId]);

      // 2. Add entry to food_log_entries
      const entryId = randomUUID();
      await tx.runAsync(`
        INSERT INTO food_log_entries (
          id, day, meal, food_name, grams, unit, amount, calories, protein, carbs, fat,
          logged_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'tupperware', 1, ?, ?, ?, ?, ?, ?, ?)
      `, [
        entryId,
        day,
        meal,
        `🍱 ${row.name}`,
        row.net_weight_g,
        row.kcal_per_box,
        row.protein_per_box,
        row.carbs_per_box,
        row.fat_per_box,
        now,
        now,
        now,
      ]);
    });

    return { remaining, loggedKcal };
  },

  async delete(db: SQLiteDatabase, mealPrepId: string): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(`
      UPDATE meal_preps SET deleted_at = ? WHERE id = ?
    `, [now, mealPrepId]);
  },

  async listAvailableCookedFoods(db: SQLiteDatabase): Promise<AvailableCookedFood[]> {
    // Look up cooked batches in fridge with active stock
    const batchRows = await db.getAllAsync<{
      id: string;
      name: string;
      grams_left: number;
      kcal_per_100g: number;
      protein_per_100g: number;
      carbs_per_100g: number;
      fat_per_100g: number;
      pantry_item_id: string;
    }>(`
      SELECT b.id, b.name, b.kcal_per_100g, b.protein_per_100g, b.carbs_per_100g, b.fat_per_100g,
        pi.id AS pantry_item_id,
        (SELECT SUM(m.delta_grams) FROM stock_movements m WHERE m.pantry_item_id = pi.id AND m.deleted_at IS NULL) AS grams_left
      FROM batches b
      JOIN pantry_items pi ON pi.batch_id = b.id AND pi.deleted_at IS NULL
      WHERE b.deleted_at IS NULL
      HAVING grams_left > 0.5
      ORDER BY b.cooked_at DESC
    `);

    const result: AvailableCookedFood[] = batchRows.map((r) => ({
      id: `batch-${r.id}`,
      name: r.name,
      gramsAvailable: Math.round(r.grams_left),
      kcalPer100g: r.kcal_per_100g,
      proteinPer100g: r.protein_per_100g,
      carbsPer100g: r.carbs_per_100g,
      fatPer100g: r.fat_per_100g,
      batchId: r.id,
      pantryItemId: r.pantry_item_id,
    }));

    // If no batches exist yet, provide standard high-protein cooked food presets from prototype
    if (result.length === 0) {
      return [
        {
          id: "preset-chicken",
          name: "🍗 Cooked Chicken Breast",
          gramsAvailable: 500,
          kcalPer100g: 165,
          proteinPer100g: 31.0,
          carbsPer100g: 0.0,
          fatPer100g: 3.6,
        },
        {
          id: "preset-okra",
          name: "🥦 Steamed Okra",
          gramsAvailable: 250,
          kcalPer100g: 33,
          proteinPer100g: 2.0,
          carbsPer100g: 7.0,
          fatPer100g: 0.2,
        },
        {
          id: "preset-eggs",
          name: "🥚 Boiled Whole Eggs",
          gramsAvailable: 500,
          kcalPer100g: 155,
          proteinPer100g: 12.6,
          carbsPer100g: 1.1,
          fatPer100g: 10.6,
        },
        {
          id: "preset-rice",
          name: "🍚 Cooked Jasmine Rice",
          gramsAvailable: 1000,
          kcalPer100g: 130,
          proteinPer100g: 2.5,
          carbsPer100g: 28.2,
          fatPer100g: 0.3,
        },
      ];
    }

    return result;
  },
};
