import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import * as pantryRepo from "@/modules/pantry/repositories/pantryRepo";
import { fitsStock } from "@/modules/pantry/services/pantryStock";

import { forGrams } from "../services/nutritionCalc";
import type { EntryInput, FoodLogEntry, MealType } from "../types/foodLog";
import type { Product } from "../types/product";

type EntryRow = {
  id: string;
  day: string;
  logged_at: string;
  meal_type: MealType;
  product_id: string | null;
  product_name: string;
  grams: number;
  kcal_per_100g: number;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  kcal: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  pantry_item_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChangeResult =
  | { ok: true }
  | { ok: false; error: "not_found" }
  | { ok: false; error: "not_enough"; gramsLeft: number };

const COLUMNS = `id, day, logged_at, meal_type, product_id, product_name, grams, kcal_per_100g,
  protein_per_100g, carbs_per_100g, fat_per_100g, kcal, protein_g, carbs_g, fat_g,
  pantry_item_id, created_at, updated_at`;

function toEntry(row: EntryRow): FoodLogEntry {
  return {
    id: row.id,
    day: row.day,
    loggedAt: row.logged_at,
    mealType: row.meal_type,
    productId: row.product_id,
    productName: row.product_name,
    grams: row.grams,
    kcalPer100g: row.kcal_per_100g,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g: row.carbs_per_100g,
    fatPer100g: row.fat_per_100g,
    kcal: row.kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    pantryItemId: row.pantry_item_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function changed(changes: number): ChangeResult {
  return changes === 0 ? { ok: false, error: "not_found" } : { ok: true };
}

export async function create(
  db: SQLiteDatabase,
  product: Product,
  input: EntryInput & { day: string },
): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const n = forGrams(product, input.grams);
  await db.runAsync(
    `INSERT INTO food_log_entries (id, day, logged_at, meal_type, product_id, product_name, grams,
       kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, kcal, protein_g, carbs_g,
       fat_g, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.day,
    now,
    input.mealType,
    product.id,
    product.name,
    input.grams,
    product.kcalPer100g,
    product.proteinPer100g,
    product.carbsPer100g,
    product.fatPer100g,
    n.kcal,
    n.proteinG,
    n.carbsG,
    n.fatG,
    now,
    now,
  );
  return id;
}

export async function listByDay(db: SQLiteDatabase, day: string): Promise<FoodLogEntry[]> {
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT ${COLUMNS} FROM food_log_entries
     WHERE day = ? AND deleted_at IS NULL ORDER BY logged_at`,
    day,
  );
  return rows.map(toEntry);
}

export async function findById(db: SQLiteDatabase, id: string): Promise<FoodLogEntry | null> {
  const row = await db.getFirstAsync<EntryRow>(
    `SELECT ${COLUMNS} FROM food_log_entries WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
  return row ? toEntry(row) : null;
}

export async function lastGramsForProduct(
  db: SQLiteDatabase,
  productId: string,
): Promise<number | null> {
  const row = await db.getFirstAsync<{ grams: number }>(
    `SELECT grams FROM food_log_entries
     WHERE product_id = ? AND deleted_at IS NULL ORDER BY logged_at DESC LIMIT 1`,
    productId,
  );
  return row?.grams ?? null;
}

// Rescales from the entry's own per-100 g copies, never from the product, so a
// product edit can't leak into a logged day.
export async function update(
  db: SQLiteDatabase,
  id: string,
  input: EntryInput & { day: string; loggedAt: string },
): Promise<ChangeResult> {
  const entry = await findById(db, id);
  if (!entry) return { ok: false, error: "not_found" };
  if (entry.pantryItemId) return updateFromPantry(db, entry, input);
  const n = forGrams(entry, input.grams);
  const result = await db.runAsync(
    `UPDATE food_log_entries SET meal_type = ?, grams = ?, day = ?, logged_at = ?, kcal = ?, protein_g = ?,
       carbs_g = ?, fat_g = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    input.mealType,
    input.grams,
    input.day,
    input.loggedAt,
    n.kcal,
    n.proteinG,
    n.carbsG,
    n.fatG,
    new Date().toISOString(),
    id,
  );
  return changed(result.changes);
}

// A pantry entry's grams and its "eaten" movement change together, so the day and the
// stock never disagree. Taking more than the pantry holds is refused.
async function updateFromPantry(
  db: SQLiteDatabase,
  entry: FoodLogEntry,
  input: EntryInput & { day: string; loggedAt: string },
): Promise<ChangeResult> {
  let result: ChangeResult = { ok: true };
  await db.withExclusiveTransactionAsync(async (txn) => {
    const current = await txn.getFirstAsync<{ grams: number }>(
      "SELECT grams FROM food_log_entries WHERE id = ? AND deleted_at IS NULL",
      entry.id,
    );
    if (!current) {
      result = { ok: false, error: "not_found" };
      return;
    }
    const movementId = await pantryRepo.eatenMovementFor(txn, entry.id);
    if (movementId && entry.pantryItemId) {
      const left = await pantryRepo.gramsLeftIn(txn, entry.pantryItemId).catch(() => null);
      const extra = input.grams - current.grams;
      if (left !== null && extra > 0 && !fitsStock(extra, left)) {
        result = { ok: false, error: "not_enough", gramsLeft: left };
        return;
      }
    }
    const n = forGrams(entry, input.grams);
    const now = new Date().toISOString();
    await txn.runAsync(
      `UPDATE food_log_entries SET meal_type = ?, grams = ?, day = ?, logged_at = ?, kcal = ?, protein_g = ?,
         carbs_g = ?, fat_g = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      input.mealType,
      input.grams,
      input.day,
      input.loggedAt,
      n.kcal,
      n.proteinG,
      n.carbsG,
      n.fatG,
      now,
      entry.id,
    );
    if (movementId) {
      await txn.runAsync(
        "UPDATE stock_movements SET delta_grams = ?, updated_at = ? WHERE id = ?",
        -input.grams,
        now,
        movementId,
      );
    }
    await pantryRepo.checkForeignKeys(txn);
  });
  return result;
}

async function pantryLink(db: SQLiteDatabase, id: string, deleted: boolean): Promise<string | null> {
  const row = await db.getFirstAsync<{ pantry_item_id: string | null }>(
    `SELECT pantry_item_id FROM food_log_entries WHERE id = ? AND deleted_at IS ${deleted ? "NOT NULL" : "NULL"}`,
    id,
  );
  return row?.pantry_item_id ?? null;
}

// Soft delete keeps the row for Undo and for sync later (ADR-4). A pantry entry's
// "eaten" movement goes with it, which puts the grams back into stock.
export async function softDelete(db: SQLiteDatabase, id: string): Promise<ChangeResult> {
  if (await pantryLink(db, id, false)) return setDeletedWithPantry(db, id, true);
  const now = new Date().toISOString();
  const result = await db.runAsync(
    "UPDATE food_log_entries SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
    now,
    now,
    id,
  );
  return changed(result.changes);
}

export async function restore(db: SQLiteDatabase, id: string): Promise<ChangeResult> {
  if (await pantryLink(db, id, true)) return setDeletedWithPantry(db, id, false);
  const result = await db.runAsync(
    `UPDATE food_log_entries SET deleted_at = NULL, updated_at = ?
     WHERE id = ? AND deleted_at IS NOT NULL`,
    new Date().toISOString(),
    id,
  );
  return changed(result.changes);
}

// Undo restores the movement even if stock went lower since: the food really was eaten.
async function setDeletedWithPantry(db: SQLiteDatabase, id: string, deleted: boolean): Promise<ChangeResult> {
  let changes = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const now = new Date().toISOString();
    const entry = await txn.runAsync(
      deleted
        ? "UPDATE food_log_entries SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL"
        : "UPDATE food_log_entries SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL",
      ...(deleted ? [now, now, id] : [now, id]),
    );
    changes = entry.changes;
    if (changes === 0) return;
    await txn.runAsync(
      deleted
        ? `UPDATE stock_movements SET deleted_at = ?, updated_at = ?
           WHERE food_log_entry_id = ? AND reason = 'eaten' AND deleted_at IS NULL`
        : `UPDATE stock_movements SET deleted_at = NULL, updated_at = ?
           WHERE food_log_entry_id = ? AND reason = 'eaten' AND deleted_at IS NOT NULL`,
      ...(deleted ? [now, now, id] : [now, id]),
    );
    await pantryRepo.checkForeignKeys(txn);
  });
  return changed(changes);
}
