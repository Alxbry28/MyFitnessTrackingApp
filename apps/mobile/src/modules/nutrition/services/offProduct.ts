import { z } from "zod";

import { normalizeBarcode } from "./barcode";
import { newProductForm, type ProductFormValues } from "./productSchema";

// Open Food Facts data is untrusted community input (SECURITY.md). Every field is
// optional, numbers may arrive as strings, and anything unusable is left blank.

export type OffResult =
  | { kind: "found"; draft: ProductFormValues }
  | { kind: "not_found"; draft: ProductFormValues }
  | { kind: "error" };

const MAX_TEXT = 200;

export type OffSearchItem = { found: boolean; draft: ProductFormValues };
export type OffSearchResult = { kind: "results"; items: OffSearchItem[] } | { kind: "error" };

// Leaves are unknown on purpose: a null or oddly typed field must blank that field,
// not fail the whole product.
const offProduct = z.object({
  code: z.unknown().optional(),
  product_name: z.unknown().optional(),
  product_name_en: z.unknown().optional(),
  generic_name: z.unknown().optional(),
  brands: z.unknown().optional(),
  serving_size: z.unknown().optional(),
  serving_quantity: z.unknown().optional(),
  product_quantity: z.unknown().optional(),
  quantity: z.unknown().optional(),
  nutriments: z.record(z.string(), z.unknown()).nullish().catch(null),
});

type OffProduct = z.infer<typeof offProduct>;

const offBody = z.object({
  status: z.unknown().optional(),
  product: offProduct.nullish(),
});

const offSearchBody = z.object({ products: z.array(z.unknown()).catch([]) });

const MAX_SEARCH_RESULTS = 10;

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "";
}

function inRange(value: number | null, min: number, max: number): number | null {
  return value !== null && value >= min && value <= max ? value : null;
}

function positive(value: number | null): number | null {
  return value !== null && value > 0 ? value : null;
}

function asField(value: number | null): string {
  return value === null ? "" : String(Math.round(value * 100) / 100);
}

// Extracts grams/ml from a free-text quantity string like "400 g", "1 kg", or "1 scoop (30g)".
function parseQuantityGrams(text: unknown): number | null {
  if (typeof text !== "string") return null;
  const match = /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/i.exec(text);
  if (!match) return null;
  const num = Number(match[1].replace(",", "."));
  if (!Number.isFinite(num) || num <= 0) return null;
  const unit = match[2].toLowerCase();
  return unit === "kg" || unit === "l" ? num * 1000 : num;
}

// Prefers the _100g value; falls back to per-serving scaled by serving grams (DATABASE.md §6).
function per100(nutriments: Record<string, unknown>, key: string, servingGrams: number | null): number | null {
  const direct = toNumber(nutriments[`${key}_100g`]);
  if (direct !== null) return direct;
  const perServing = toNumber(nutriments[`${key}_serving`]);
  return perServing !== null && servingGrams !== null ? (perServing / servingGrams) * 100 : null;
}

export function parseOffResponse(httpStatus: number, body: unknown, barcode: string): OffResult {
  const empty = newProductForm(barcode);
  if (httpStatus === 404) return { kind: "not_found", draft: empty };
  if (httpStatus < 200 || httpStatus >= 300) return { kind: "error" };

  const parsed = offBody.safeParse(body);
  if (!parsed.success) return { kind: "error" };
  const { status, product } = parsed.data;
  if (toNumber(status) === 0 || !product) return { kind: "not_found", draft: empty };
  return draftFromProduct(product, barcode);
}

// Name search results: unusable entries are dropped, and a result without kcal
// still prefills its name and brand (found: false).
export function parseOffSearch(httpStatus: number, body: unknown): OffSearchResult {
  if (httpStatus < 200 || httpStatus >= 300) return { kind: "error" };
  const parsed = offSearchBody.safeParse(body);
  if (!parsed.success) return { kind: "error" };

  const items: OffSearchItem[] = [];
  for (const raw of parsed.data.products) {
    const product = offProduct.safeParse(raw);
    if (!product.success) continue;
    const barcode = typeof product.data.code === "string" ? (normalizeBarcode(product.data.code) ?? "") : "";
    const result = draftFromProduct(product.data, barcode);
    if (result.draft.name === "") continue;
    items.push({ found: result.kind === "found", draft: result.draft });
    if (items.length === MAX_SEARCH_RESULTS) break;
  }
  return { kind: "results", items };
}

function draftFromProduct(product: OffProduct, barcode: string): Exclude<OffResult, { kind: "error" }> {
  const empty = newProductForm(barcode);
  const servingGrams =
    positive(toNumber(product.serving_quantity)) ?? parseQuantityGrams(product.serving_size);
  const netWeightG =
    positive(toNumber(product.product_quantity)) ?? parseQuantityGrams(product.quantity);
  const nutriments = product.nutriments ?? {};
  const rawKcal =
    per100(nutriments, "energy-kcal", servingGrams) ??
    (() => {
      const kj = per100(nutriments, "energy-kj", servingGrams);
      return kj !== null ? Math.round(kj / 4.184) : null;
    })();
  const kcal = inRange(rawKcal, 0, 900);
  const resolvedName =
    cleanText(product.product_name) ||
    cleanText(product.product_name_en) ||
    cleanText(product.generic_name);

  const named: ProductFormValues = {
    ...empty,
    name: resolvedName,
    brand: cleanText(typeof product.brands === "string" ? product.brands.split(",")[0] : null),
    servingSize: cleanText(product.serving_size),
    servingGrams: asField(servingGrams),
    netWeightG: asField(netWeightG),
  };

  // Found but no usable kcal counts as not found: prefill name, brand, serving, and weight (UX_FLOWS §3).
  if (kcal === null) return { kind: "not_found", draft: named };

  return {
    kind: "found",
    draft: {
      ...named,
      kcalPer100g: asField(kcal),
      proteinPer100g: asField(inRange(per100(nutriments, "proteins", servingGrams), 0, 100)),
      carbsPer100g: asField(inRange(per100(nutriments, "carbohydrates", servingGrams), 0, 100)),
      fatPer100g: asField(inRange(per100(nutriments, "fat", servingGrams), 0, 100)),
    },
  };
}
