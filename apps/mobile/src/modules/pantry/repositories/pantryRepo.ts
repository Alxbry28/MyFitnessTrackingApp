import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { forGrams } from "@/modules/nutrition/services/nutritionCalc";
import type { MealType } from "@/modules/nutrition/types/foodLog";
import type { Product } from "@/modules/nutrition/types/product";

import { ADJUST_MIN_CHANGE, fitsStock } from "../services/pantryStock";
import type {
  PantryKind,
  PantryLocation,
  PantryStock,
  RemoveReason,
  StockMovement,
  StockReason,
} from "../types/pantry";

type StockRow = {
  id: string;
  kind: PantryKind;
  product_id: string | null;
  name: string | null;
  net_weight_g: number | null;
  location: PantryLocation;
  expires_at: string | null;
  grams_left: number | null;
};

// Grams left are the sum of the item's live movements (ADR-7); nothing is cached on the item.
const STOCK_SELECT = `
  SELECT i.id, i.kind, i.product_id, p.name, p.net_weight_g, i.location, i.expires_at,
    (SELECT SUM(m.delta_grams) FROM stock_movements m
     WHERE m.pantry_item_id = i.id AND m.deleted_at IS NULL) AS grams_left
  FROM pantry_items i LEFT JOIN products p ON p.id = i.product_id
  WHERE i.deleted_at IS NULL`;

function toStock(row: StockRow): PantryStock {
  return {
    id: row.id,
    kind: row.kind,
    productId: row.product_id,
    name: row.name ?? "Unknown item",
    netWeightG: row.net_weight_g,
    location: row.location,
    expiresAt: row.expires_at,
    gramsLeft: row.grams_left ?? 0,
  };
}

export async function listStock(db: SQLiteDatabase): Promise<PantryStock[]> {
  const rows = await db.getAllAsync<StockRow>(`${STOCK_SELECT} ORDER BY p.name COLLATE NOCASE`);
  return rows.map(toStock);
}

// The product's packaged item, or null when it has never been in the pantry.
export async function stockForProduct(db: SQLiteDatabase, productId: string): Promise<PantryStock | null> {
  const row = await db.getFirstAsync<StockRow>(
    `${STOCK_SELECT} AND i.kind = 'packaged' AND i.product_id = ?`,
    productId,
  );
  return row ? toStock(row) : null;
}

export type AddStockInput = {
  productId: string;
  units: number;
  netWeightG: number;
  location: PantryLocation;
  expiresAt: string | null;
};

// One transaction: the product's single packaged item is created or updated (the form shows the
// stored expiry, so its value, null included, replaces it), the net weight
// is saved back to the product, and a "bought" movement adds the stock. No food log entry is
// written, so buying never counts toward the day (ADR-8).
export async function addStock(db: SQLiteDatabase, input: AddStockInput): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const now = new Date().toISOString();
    const existing = await txn.getFirstAsync<{ id: string }>(
      "SELECT id FROM pantry_items WHERE kind = 'packaged' AND product_id = ? AND deleted_at IS NULL",
      input.productId,
    );
    let itemId: string;
    if (existing) {
      itemId = existing.id;
      await txn.runAsync(
        `UPDATE pantry_items SET location = ?, expires_at = ?, status = 'sealed',
           updated_at = ? WHERE id = ?`,
        input.location,
        input.expiresAt,
        now,
        itemId,
      );
    } else {
      itemId = randomUUID();
      await txn.runAsync(
        `INSERT INTO pantry_items (id, kind, product_id, status, location, expires_at, created_at, updated_at)
         VALUES (?, 'packaged', ?, 'sealed', ?, ?, ?, ?)`,
        itemId,
        input.productId,
        input.location,
        input.expiresAt,
        now,
        now,
      );
    }
    await txn.runAsync(
      `UPDATE products SET net_weight_g = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL AND (net_weight_g IS NULL OR net_weight_g <> ?)`,
      input.netWeightG,
      now,
      input.productId,
      input.netWeightG,
    );
    await txn.runAsync(
      `INSERT INTO stock_movements (id, pantry_item_id, occurred_at, delta_units, delta_grams, reason,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'bought', ?, ?)`,
      randomUUID(),
      itemId,
      now,
      input.units,
      input.units * input.netWeightG,
      now,
      now,
    );
    await checkForeignKeys(txn);
  });
}

export async function findItem(db: SQLiteDatabase, id: string): Promise<PantryStock | null> {
  const row = await db.getFirstAsync<StockRow>(`${STOCK_SELECT} AND i.id = ?`, id);
  return row ? toStock(row) : null;
}

type MovementRow = {
  id: string;
  occurred_at: string;
  delta_units: number | null;
  delta_grams: number;
  reason: StockReason;
  meal_type: MealType | null;
};

const HISTORY_LIMIT = 50;

export async function listMovements(db: SQLiteDatabase, itemId: string): Promise<StockMovement[]> {
  const rows = await db.getAllAsync<MovementRow>(
    `SELECT m.id, m.occurred_at, m.delta_units, m.delta_grams, m.reason, e.meal_type
     FROM stock_movements m LEFT JOIN food_log_entries e ON e.id = m.food_log_entry_id
     WHERE m.pantry_item_id = ? AND m.deleted_at IS NULL
     ORDER BY m.occurred_at DESC, m.created_at DESC LIMIT ${HISTORY_LIMIT}`,
    itemId,
  );
  return rows.map((r) => ({
    id: r.id,
    occurredAt: r.occurred_at,
    deltaUnits: r.delta_units,
    deltaGrams: r.delta_grams,
    reason: r.reason,
    mealType: r.meal_type,
  }));
}

// Thrown when a change would take out more than the ledger holds; carries the real amount.
export class NotEnoughStockError extends Error {
  constructor(readonly gramsLeft: number) {
    super("Not enough stock");
  }
}

export class ItemGoneError extends Error {
  constructor() {
    super("Pantry item not found");
  }
}

// Read inside the transaction so a change is checked against the stored ledger, not a stale screen.
export async function gramsLeftIn(txn: SQLiteDatabase, itemId: string): Promise<number> {
  const row = await txn.getFirstAsync<{ grams_left: number | null }>(
    `SELECT (SELECT SUM(m.delta_grams) FROM stock_movements m
       WHERE m.pantry_item_id = i.id AND m.deleted_at IS NULL) AS grams_left
     FROM pantry_items i WHERE i.id = ? AND i.deleted_at IS NULL`,
    itemId,
  );
  if (!row) throw new ItemGoneError();
  return row.grams_left ?? 0;
}

async function insertMovement(
  txn: SQLiteDatabase,
  itemId: string,
  deltaGrams: number,
  reason: StockReason,
  foodLogEntryId: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  await txn.runAsync(
    `INSERT INTO stock_movements (id, pantry_item_id, occurred_at, delta_units, delta_grams, reason,
       food_log_entry_id, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
    randomUUID(),
    itemId,
    now,
    deltaGrams,
    reason,
    foodLogEntryId,
    now,
    now,
  );
}

export async function checkForeignKeys(txn: SQLiteDatabase): Promise<void> {
  // The exclusive transaction runs on its own connection, where foreign keys are off.
  const broken = await txn.getAllAsync("PRAGMA foreign_key_check");
  if (broken.length > 0) throw new Error("Pantry rows reference missing rows");
}

// The live "eaten" movement a pantry log entry created, if any.
export async function eatenMovementFor(txn: SQLiteDatabase, entryId: string): Promise<string | null> {
  const row = await txn.getFirstAsync<{ id: string }>(
    "SELECT id FROM stock_movements WHERE food_log_entry_id = ? AND reason = 'eaten' AND deleted_at IS NULL",
    entryId,
  );
  return row?.id ?? null;
}

export type LogPortionInput = { itemId: string; product: Product; mealType: MealType; grams: number; day: string };

// Eating from the pantry: the log entry (values copied, ADR-6) and its "eaten" movement
// commit together, so the day and the stock never disagree.
export async function logPortion(db: SQLiteDatabase, input: LogPortionInput): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const left = await gramsLeftIn(txn, input.itemId);
    if (!fitsStock(input.grams, left)) throw new NotEnoughStockError(left);
    const entryId = randomUUID();
    const now = new Date().toISOString();
    const { product } = input;
    const n = forGrams(product, input.grams);
    await txn.runAsync(
      `INSERT INTO food_log_entries (id, day, logged_at, meal_type, product_id, product_name, grams,
         kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, kcal, protein_g, carbs_g,
         fat_g, pantry_item_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      entryId,
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
      input.itemId,
      now,
      now,
    );
    await insertMovement(txn, input.itemId, -input.grams, "eaten", entryId);
    await checkForeignKeys(txn);
  });
}

// Stock that leaves without being eaten; no log entry, so no calories (ADR-8).
export async function removeStock(
  db: SQLiteDatabase,
  input: { itemId: string; reason: RemoveReason; grams: number },
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const left = await gramsLeftIn(txn, input.itemId);
    if (!fitsStock(input.grams, left)) throw new NotEnoughStockError(left);
    await insertMovement(txn, input.itemId, -input.grams, input.reason, null);
    await checkForeignKeys(txn);
  });
}

// Sets the ledger to what's really there; the difference is the adjustment.
export async function adjustStock(db: SQLiteDatabase, input: { itemId: string; actualGrams: number }): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const left = await gramsLeftIn(txn, input.itemId);
    const delta = input.actualGrams - left;
    if (Math.abs(delta) < ADJUST_MIN_CHANGE) return;
    await insertMovement(txn, input.itemId, delta, "adjustment", null);
    await checkForeignKeys(txn);
  });
}
