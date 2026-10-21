import type { SQLiteDatabase } from "expo-sqlite";

// One live pantry item per product whether it's a grocery or a supplement, so changing the
// kind on a restock can never leave two items for the same product.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE UNIQUE INDEX ux_pantry_stock_product ON pantry_items(product_id)
      WHERE kind IN ('packaged','supplement') AND deleted_at IS NULL;
  `);
}
