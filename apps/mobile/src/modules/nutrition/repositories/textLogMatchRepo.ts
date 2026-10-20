import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { RememberedMatch } from "../types/pasteLog";

// A match to a deleted product is ignored, so the line falls back to name matching.
export async function listActive(db: SQLiteDatabase): Promise<RememberedMatch[]> {
  const rows = await db.getAllAsync<{ name_key: string; product_id: string }>(
    `SELECT m.name_key, m.product_id FROM text_log_matches m
     JOIN products p ON p.id = m.product_id
     WHERE m.deleted_at IS NULL AND p.deleted_at IS NULL`,
  );
  return rows.map((row) => ({ nameKey: row.name_key, productId: row.product_id }));
}

// One active row per name key: a new pick for a remembered name replaces its product.
export async function remember(db: SQLiteDatabase, nameKey: string, productId: string): Promise<void> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `UPDATE text_log_matches SET product_id = ?, updated_at = ?
     WHERE name_key = ? AND deleted_at IS NULL`,
    productId,
    now,
    nameKey,
  );
  if (result.changes > 0) return;
  await db.runAsync(
    `INSERT INTO text_log_matches (id, name_key, product_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    randomUUID(),
    nameKey,
    productId,
    now,
    now,
  );
}
