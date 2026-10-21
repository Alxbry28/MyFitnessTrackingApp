import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { isDrained, loggedPer100 } from "@/modules/nutrition/services/drained";
import { dayKey } from "@/modules/nutrition/services/mealTime";
import { forGrams } from "@/modules/nutrition/services/nutritionCalc";
import type { MealType } from "@/modules/nutrition/types/foodLog";
import type { Product } from "@/modules/nutrition/types/product";

import { ADJUST_MIN_CHANGE, fitsStock, openedAfter, stockGramsFor } from "../services/pantryStock";
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
  drained: number;
  usual_drained_g: number | null;
  location: PantryLocation;
  expires_at: string | null;
  opened_at: string | null;
  grams_left: number | null;
};

// Grams left are the sum of the item's live movements (ADR-7); nothing is cached on the item.
const STOCK_SELECT = `
  SELECT i.id, i.kind, i.product_id, p.name, p.net_weight_g,
    (p.eaten_drained = 1 AND p.drained_kcal_per_100g IS NOT NULL) AS drained, p.usual_drained_g,
    i.location, i.expires_at, i.opened_at,
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
    drained: row.drained === 1,
    usualDrainedG: row.usual_drained_g,
    location: row.location,
    expiresAt: row.expires_at,
    openedAt: row.opened_at,
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
    let gramsBefore = 0;
    if (existing) {
      itemId = existing.id;
      gramsBefore = await gramsLeftIn(txn, itemId);
      await txn.runAsync(
        `UPDATE pantry_items SET location = ?, expires_at = ?, updated_at = ? WHERE id = ?`,
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
    await syncOpened(txn, itemId, gramsBefore);
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
  deltaUnits: number | null = null,
): Promise<void> {
  const now = new Date().toISOString();
  await txn.runAsync(
    `INSERT INTO stock_movements (id, pantry_item_id, occurred_at, delta_units, delta_grams, reason,
       food_log_entry_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    itemId,
    now,
    deltaUnits,
    deltaGrams,
    reason,
    foodLogEntryId,
    now,
    now,
  );
}

// Keeps status and opened_at in step with the ledger after a change in the same transaction.
export async function syncOpened(txn: SQLiteDatabase, itemId: string, gramsBefore: number): Promise<void> {
  const row = await txn.getFirstAsync<{ net_weight_g: number | null; opened_at: string | null; status: string }>(
    `SELECT p.net_weight_g, i.opened_at, i.status
     FROM pantry_items i LEFT JOIN products p ON p.id = i.product_id
     WHERE i.id = ? AND i.deleted_at IS NULL`,
    itemId,
  );
  if (!row) return;
  const gramsAfter = await gramsLeftIn(txn, itemId);
  const openedAt = openedAfter(gramsBefore, gramsAfter, row.net_weight_g, row.opened_at, dayKey(new Date()));
  const status = openedAt === null ? "sealed" : "opened";
  if (openedAt === row.opened_at && status === row.status) return;
  await txn.runAsync(
    "UPDATE pantry_items SET status = ?, opened_at = ?, updated_at = ? WHERE id = ?",
    status,
    openedAt,
    new Date().toISOString(),
    itemId,
  );
}

export async function checkForeignKeys(txn: SQLiteDatabase): Promise<void> {
  // The exclusive transaction runs on its own connection, where foreign keys are off.
  const broken = await txn.getAllAsync("PRAGMA foreign_key_check");
  if (broken.length > 0) throw new Error("Pantry rows reference missing rows");
}

export type EatenMovement = { id: string; deltaUnits: number | null; deltaGrams: number };

// The live "eaten" movement a pantry log entry created, if any.
export async function eatenMovementFor(txn: SQLiteDatabase, entryId: string): Promise<EatenMovement | null> {
  const row = await txn.getFirstAsync<{ id: string; delta_units: number | null; delta_grams: number }>(
    `SELECT id, delta_units, delta_grams FROM stock_movements
     WHERE food_log_entry_id = ? AND reason = 'eaten' AND deleted_at IS NULL`,
    entryId,
  );
  return row ? { id: row.id, deltaUnits: row.delta_units, deltaGrams: row.delta_grams } : null;
}

const DRAINED_SAMPLES = 5;

// The drained grams of the product's last whole units eaten from the pantry; their mean
// becomes the usual drained weight.
const WHOLE_UNIT_GRAMS = `
  SELECT e.grams FROM food_log_entries e
  JOIN stock_movements m ON m.food_log_entry_id = e.id
  WHERE e.product_id = ? AND e.deleted_at IS NULL AND m.deleted_at IS NULL
    AND m.reason = 'eaten' AND m.delta_units = -1
  ORDER BY e.logged_at DESC LIMIT ${DRAINED_SAMPLES}`;

export async function drainedSampleCount(db: SQLiteDatabase, productId: string): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM (${WHOLE_UNIT_GRAMS})`, productId);
  return row?.n ?? 0;
}

async function updateUsualDrained(txn: SQLiteDatabase, productId: string): Promise<void> {
  const row = await txn.getFirstAsync<{ mean: number | null }>(
    `SELECT AVG(grams) AS mean FROM (${WHOLE_UNIT_GRAMS})`,
    productId,
  );
  if (row?.mean == null) return;
  await txn.runAsync(
    "UPDATE products SET usual_drained_g = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
    Math.round(row.mean * 10) / 10,
    new Date().toISOString(),
    productId,
  );
}

export type LogPortionInput = {
  itemId: string;
  product: Product;
  mealType: MealType;
  grams: number;
  day: string;
  // A whole drained unit: the entry keeps the weighed drained grams, the ledger loses one unit.
  wholeUnit: boolean;
};

// Eating from the pantry: the log entry (values copied, ADR-6) and its "eaten" movement
// commit together, so the day and the stock never disagree.
export async function logPortion(db: SQLiteDatabase, input: LogPortionInput): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const { product } = input;
    const drained = isDrained(product);
    const wholeUnit = drained && input.wholeUnit && product.netWeightG !== null;
    const stockGrams = stockGramsFor(input.grams, wholeUnit, product.netWeightG, drained ? product.usualDrainedG : null);
    const left = await gramsLeftIn(txn, input.itemId);
    if (!fitsStock(stockGrams, left)) throw new NotEnoughStockError(left);
    const entryId = randomUUID();
    const now = new Date().toISOString();
    const per100 = loggedPer100(product);
    const n = forGrams(per100, input.grams);
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
      per100.kcalPer100g,
      per100.proteinPer100g,
      per100.carbsPer100g,
      per100.fatPer100g,
      n.kcal,
      n.proteinG,
      n.carbsG,
      n.fatG,
      input.itemId,
      now,
      now,
    );
    await insertMovement(txn, input.itemId, -stockGrams, "eaten", entryId, wholeUnit ? -1 : null);
    if (wholeUnit) await updateUsualDrained(txn, product.id);
    await syncOpened(txn, input.itemId, left);
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
    await syncOpened(txn, input.itemId, left);
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
    await syncOpened(txn, input.itemId, left);
    await checkForeignKeys(txn);
  });
}
