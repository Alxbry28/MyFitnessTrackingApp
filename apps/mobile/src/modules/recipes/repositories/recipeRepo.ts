import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { calculateCookedPer100g, calculateRawTotals } from "../services/recipeCalc";
import type { Recipe, RecipeDetail, RecipeIngredient, RecipeInput } from "../types/recipes";

type RecipeRow = {
  id: string;
  name: string;
  notes: string | null;
  learned_cooked_ratio: number | null;
  created_at: string;
  updated_at: string;
  ingredient_count: number;
  times_cooked: number;
};

type IngredientRow = {
  id: string;
  recipe_id: string;
  product_id: string;
  product_name: string;
  raw_grams: number;
  is_estimated: number;
  kcal_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
};

export const recipeRepo = {
  async list(db: SQLiteDatabase): Promise<Recipe[]> {
    const rows = await db.getAllAsync<RecipeRow>(`
      SELECT r.id, r.name, r.notes, r.learned_cooked_ratio, r.created_at, r.updated_at,
        (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id AND ri.deleted_at IS NULL) AS ingredient_count,
        (SELECT COUNT(*) FROM batches b WHERE b.recipe_id = r.id AND b.deleted_at IS NULL) AS times_cooked
      FROM recipes r
      WHERE r.deleted_at IS NULL
      ORDER BY r.name COLLATE NOCASE ASC
    `);

    // Calculate approximate kcal/100g for each recipe
    const recipes: Recipe[] = [];
    for (const row of rows) {
      const ingRows = await db.getAllAsync<{
        raw_grams: number;
        kcal_per_100g: number | null;
        protein_per_100g: number | null;
        carbs_per_100g: number | null;
        fat_per_100g: number | null;
      }>(`
        SELECT ri.raw_grams, p.kcal_per_100g, p.protein_per_100g, p.carbs_per_100g, p.fat_per_100g
        FROM recipe_ingredients ri
        JOIN products p ON p.id = ri.product_id
        WHERE ri.recipe_id = ? AND ri.deleted_at IS NULL
      `, [row.id]);

      let kcalPer100g: number | null = null;
      if (ingRows.length > 0) {
        const totals = calculateRawTotals(
          ingRows.map((i) => ({
            rawGrams: i.raw_grams,
            kcalPer100g: i.kcal_per_100g,
            proteinPer100g: i.protein_per_100g,
            carbsPer100g: i.carbs_per_100g,
            fatPer100g: i.fat_per_100g,
          })),
        );
        const cookedWeight = row.learned_cooked_ratio && row.learned_cooked_ratio > 0
          ? totals.rawWeightG * row.learned_cooked_ratio
          : totals.rawWeightG;
        if (cookedWeight > 0) {
          kcalPer100g = calculateCookedPer100g(totals, cookedWeight).kcalPer100g;
        }
      }

      recipes.push({
        id: row.id,
        name: row.name,
        notes: row.notes,
        learnedCookedRatio: row.learned_cooked_ratio,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ingredientCount: row.ingredient_count,
        timesCooked: row.times_cooked,
        kcalPer100g,
      });
    }

    return recipes;
  },

  async get(db: SQLiteDatabase, id: string): Promise<RecipeDetail | null> {
    const row = await db.getFirstAsync<RecipeRow>(`
      SELECT r.id, r.name, r.notes, r.learned_cooked_ratio, r.created_at, r.updated_at,
        (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id AND ri.deleted_at IS NULL) AS ingredient_count,
        (SELECT COUNT(*) FROM batches b WHERE b.recipe_id = r.id AND b.deleted_at IS NULL) AS times_cooked
      FROM recipes r
      WHERE r.id = ? AND r.deleted_at IS NULL
    `, [id]);

    if (!row) return null;

    const ingRows = await db.getAllAsync<IngredientRow>(`
      SELECT ri.id, ri.recipe_id, ri.product_id, p.name AS product_name, ri.raw_grams,
        ri.is_estimated, p.kcal_per_100g, p.protein_per_100g, p.carbs_per_100g, p.fat_per_100g
      FROM recipe_ingredients ri
      JOIN products p ON p.id = ri.product_id
      WHERE ri.recipe_id = ? AND ri.deleted_at IS NULL
      ORDER BY ri.created_at ASC
    `, [id]);

    const ingredients: RecipeIngredient[] = ingRows.map((ing) => ({
      id: ing.id,
      recipeId: ing.recipe_id,
      productId: ing.product_id,
      productName: ing.product_name,
      rawGrams: ing.raw_grams,
      isEstimated: ing.is_estimated === 1,
      kcalPer100g: ing.kcal_per_100g,
      proteinPer100g: ing.protein_per_100g,
      carbsPer100g: ing.carbs_per_100g,
      fatPer100g: ing.fat_per_100g,
    }));

    let kcalPer100g: number | null = null;
    if (ingredients.length > 0) {
      const totals = calculateRawTotals(ingredients);
      const cookedWeight = row.learned_cooked_ratio && row.learned_cooked_ratio > 0
        ? totals.rawWeightG * row.learned_cooked_ratio
        : totals.rawWeightG;
      if (cookedWeight > 0) {
        kcalPer100g = calculateCookedPer100g(totals, cookedWeight).kcalPer100g;
      }
    }

    return {
      id: row.id,
      name: row.name,
      notes: row.notes,
      learnedCookedRatio: row.learned_cooked_ratio,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ingredientCount: row.ingredient_count,
      timesCooked: row.times_cooked,
      kcalPer100g,
      ingredients,
    };
  },

  async create(db: SQLiteDatabase, input: RecipeInput): Promise<string> {
    const id = randomUUID();
    const now = new Date().toISOString();

    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(`
        INSERT INTO recipes (id, name, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `, [id, input.name.trim(), input.notes ? input.notes.trim() : null, now, now]);

      for (const ing of input.ingredients) {
        await tx.runAsync(`
          INSERT INTO recipe_ingredients (id, recipe_id, product_id, raw_grams, is_estimated, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          randomUUID(),
          id,
          ing.productId,
          ing.rawGrams,
          ing.isEstimated ? 1 : 0,
          now,
          now,
        ]);
      }
    });

    return id;
  },

  async update(db: SQLiteDatabase, id: string, input: RecipeInput): Promise<void> {
    const now = new Date().toISOString();

    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(`
        UPDATE recipes
        SET name = ?, notes = ?, updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
      `, [input.name.trim(), input.notes ? input.notes.trim() : null, now, id]);

      // Soft delete existing ingredients
      await tx.runAsync(`
        UPDATE recipe_ingredients
        SET deleted_at = ?
        WHERE recipe_id = ? AND deleted_at IS NULL
      `, [now, id]);

      // Insert new ingredients
      for (const ing of input.ingredients) {
        await tx.runAsync(`
          INSERT INTO recipe_ingredients (id, recipe_id, product_id, raw_grams, is_estimated, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          randomUUID(),
          id,
          ing.productId,
          ing.rawGrams,
          ing.isEstimated ? 1 : 0,
          now,
          now,
        ]);
      }
    });
  },

  async delete(db: SQLiteDatabase, id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(`
        UPDATE recipes
        SET deleted_at = ?
        WHERE id = ?
      `, [now, id]);
      await tx.runAsync(`
        UPDATE recipe_ingredients
        SET deleted_at = ?
        WHERE recipe_id = ? AND deleted_at IS NULL
      `, [now, id]);
    });
  },

  async search(db: SQLiteDatabase, query: string): Promise<Recipe[]> {
    const q = `%${query.trim().toLowerCase()}%`;
    const rows = await db.getAllAsync<RecipeRow>(`
      SELECT r.id, r.name, r.notes, r.learned_cooked_ratio, r.created_at, r.updated_at,
        (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id AND ri.deleted_at IS NULL) AS ingredient_count,
        (SELECT COUNT(*) FROM batches b WHERE b.recipe_id = r.id AND b.deleted_at IS NULL) AS times_cooked
      FROM recipes r
      WHERE r.deleted_at IS NULL AND LOWER(r.name) LIKE ?
      ORDER BY r.name COLLATE NOCASE ASC
    `, [q]);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      notes: r.notes,
      learnedCookedRatio: r.learned_cooked_ratio,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      ingredientCount: r.ingredient_count,
      timesCooked: r.times_cooked,
    }));
  },
};
