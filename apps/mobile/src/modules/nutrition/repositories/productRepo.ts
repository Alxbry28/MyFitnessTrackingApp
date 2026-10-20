import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { Product, ProductInput, ProductSource } from "../types/product";

type ProductRow = {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  serving_size: string | null;
  serving_grams: number | null;
  kcal_per_100g: number;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  net_weight_g: number | null;
  source: ProductSource;
  is_favorite: number;
  created_at: string;
  updated_at: string;
};

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: "duplicate_barcode" | "not_found" };

const COLUMNS = `id, barcode, name, brand, serving_size, serving_grams, kcal_per_100g,
  protein_per_100g, carbs_per_100g, fat_per_100g, net_weight_g, source, is_favorite,
  created_at, updated_at`;

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    servingSize: row.serving_size,
    servingGrams: row.serving_grams,
    kcalPer100g: row.kcal_per_100g,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g: row.carbs_per_100g,
    fatPer100g: row.fat_per_100g,
    netWeightG: row.net_weight_g,
    source: row.source,
    isFavorite: row.is_favorite === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Escapes LIKE wildcards so a typed "%" or "_" matches literally. Pairs with ESCAPE '\'.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// The unique index is the backstop when two saves race past the findByBarcode check.
function isBarcodeConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed: products.barcode");
}

export async function search(db: SQLiteDatabase, query: string): Promise<Product[]> {
  const q = query.trim();
  const order = "ORDER BY is_favorite DESC, name COLLATE NOCASE";
  // LIKE is already case-insensitive for ASCII, which covers product names typed here.
  const rows = q
    ? await db.getAllAsync<ProductRow>(
        `SELECT ${COLUMNS} FROM products
         WHERE deleted_at IS NULL AND name LIKE '%' || ? || '%' ESCAPE '\\'
         ${order}`,
        escapeLike(q),
      )
    : await db.getAllAsync<ProductRow>(
        `SELECT ${COLUMNS} FROM products WHERE deleted_at IS NULL ${order}`,
      );
  return rows.map(toProduct);
}

export async function count(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM products WHERE deleted_at IS NULL",
  );
  return row?.n ?? 0;
}

export async function findById(db: SQLiteDatabase, id: string): Promise<Product | null> {
  const row = await db.getFirstAsync<ProductRow>(
    `SELECT ${COLUMNS} FROM products WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
  return row ? toProduct(row) : null;
}

export async function findByBarcode(db: SQLiteDatabase, barcode: string): Promise<Product | null> {
  const row = await db.getFirstAsync<ProductRow>(
    `SELECT ${COLUMNS} FROM products WHERE barcode = ? AND deleted_at IS NULL`,
    barcode,
  );
  return row ? toProduct(row) : null;
}

export async function favorites(db: SQLiteDatabase): Promise<Product[]> {
  const rows = await db.getAllAsync<ProductRow>(
    `SELECT ${COLUMNS} FROM products
     WHERE is_favorite = 1 AND deleted_at IS NULL ORDER BY name COLLATE NOCASE LIMIT 12`,
  );
  return rows.map(toProduct);
}

// Distinct products logged since sinceIso, newest log first (DATABASE.md §3 Recents).
export async function recentlyLogged(db: SQLiteDatabase, sinceIso: string): Promise<Product[]> {
  const rows = await db.getAllAsync<ProductRow>(
    `WITH recent AS (
       SELECT product_id, MAX(logged_at) AS last_at FROM food_log_entries
       WHERE logged_at >= ? AND deleted_at IS NULL AND product_id IS NOT NULL
       GROUP BY product_id
     )
     SELECT ${COLUMNS} FROM products JOIN recent ON recent.product_id = products.id
     WHERE products.deleted_at IS NULL
     ORDER BY recent.last_at DESC
     LIMIT 12`,
    sinceIso,
  );
  return rows.map(toProduct);
}

export async function setFavorite(
  db: SQLiteDatabase,
  id: string,
  isFavorite: boolean,
): Promise<{ ok: true } | { ok: false; error: "not_found" }> {
  const result = await db.runAsync(
    "UPDATE products SET is_favorite = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
    isFavorite ? 1 : 0,
    new Date().toISOString(),
    id,
  );
  return result.changes === 0 ? { ok: false, error: "not_found" } : { ok: true };
}

async function barcodeTaken(db: SQLiteDatabase, barcode: string | null, exceptId?: string) {
  if (barcode === null) return false;
  const existing = await findByBarcode(db, barcode);
  return existing !== null && existing.id !== exceptId;
}

export async function create(
  db: SQLiteDatabase,
  input: ProductInput,
  source: ProductSource = "manual",
): Promise<SaveResult> {
  if (await barcodeTaken(db, input.barcode)) return { ok: false, error: "duplicate_barcode" };

  const id = randomUUID();
  const now = new Date().toISOString();
  try {
    await db.runAsync(
      `INSERT INTO products (id, barcode, name, brand, serving_size, serving_grams, kcal_per_100g,
         protein_per_100g, carbs_per_100g, fat_per_100g, net_weight_g, source, is_favorite,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      id,
      input.barcode,
      input.name,
      input.brand,
      input.servingSize,
      input.servingGrams,
      input.kcalPer100g,
      input.proteinPer100g,
      input.carbsPer100g,
      input.fatPer100g,
      input.netWeightG,
      source,
      now,
      now,
    );
  } catch (error) {
    if (isBarcodeConflict(error)) return { ok: false, error: "duplicate_barcode" };
    throw error;
  }
  return { ok: true, id };
}

// Updates the row in place so every later log reads the edited values. Source,
// favorite, id and created_at are left alone.
export async function update(
  db: SQLiteDatabase,
  id: string,
  input: ProductInput,
): Promise<SaveResult> {
  if (await barcodeTaken(db, input.barcode, id)) return { ok: false, error: "duplicate_barcode" };

  let changes: number;
  try {
    const result = await db.runAsync(
      `UPDATE products SET barcode = ?, name = ?, brand = ?, serving_size = ?, serving_grams = ?,
         kcal_per_100g = ?, protein_per_100g = ?, carbs_per_100g = ?, fat_per_100g = ?,
         net_weight_g = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      input.barcode,
      input.name,
      input.brand,
      input.servingSize,
      input.servingGrams,
      input.kcalPer100g,
      input.proteinPer100g,
      input.carbsPer100g,
      input.fatPer100g,
      input.netWeightG,
      new Date().toISOString(),
      id,
    );
    changes = result.changes;
  } catch (error) {
    if (isBarcodeConflict(error)) return { ok: false, error: "duplicate_barcode" };
    throw error;
  }
  return changes === 0 ? { ok: false, error: "not_found" } : { ok: true, id };
}
