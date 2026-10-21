import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { PantryKind, PantryLocation, PantryStock } from "../types/pantry";

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

// One transaction: the product's single packaged item is created or updated, the net weight
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
        `UPDATE pantry_items SET location = ?, expires_at = COALESCE(?, expires_at), status = 'sealed',
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
    // The exclusive transaction runs on its own connection, where foreign keys are off.
    const broken = await txn.getAllAsync("PRAGMA foreign_key_check");
    if (broken.length > 0) throw new Error("Pantry rows reference missing rows");
  });
}
