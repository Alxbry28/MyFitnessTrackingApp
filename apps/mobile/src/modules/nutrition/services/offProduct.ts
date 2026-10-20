import { z } from "zod";

import { newProductForm, type ProductFormValues } from "./productSchema";

// Open Food Facts data is untrusted community input (SECURITY.md). Every field is
// optional, numbers may arrive as strings, and anything unusable is left blank.

export type OffResult =
  | { kind: "found"; draft: ProductFormValues }
  | { kind: "not_found"; draft: ProductFormValues }
  | { kind: "error" };

const MAX_TEXT = 200;

// Leaves are unknown on purpose: a null or oddly typed field must blank that field,
// not fail the whole product.
const offBody = z.object({
  status: z.unknown().optional(),
  product: z
    .object({
      product_name: z.unknown().optional(),
      brands: z.unknown().optional(),
      serving_size: z.unknown().optional(),
      serving_quantity: z.unknown().optional(),
      product_quantity: z.unknown().optional(),
      nutriments: z.record(z.string(), z.unknown()).nullish().catch(null),
    })
    .nullish(),
});

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

  const servingGrams = positive(toNumber(product.serving_quantity));
  const nutriments = product.nutriments ?? {};
  const kcal = inRange(per100(nutriments, "energy-kcal", servingGrams), 0, 900);
  const named: ProductFormValues = {
    ...empty,
    name: cleanText(product.product_name),
    brand: cleanText(typeof product.brands === "string" ? product.brands.split(",")[0] : null),
  };

  // Found but no usable kcal counts as not found: prefill name and brand only (UX_FLOWS §3).
  if (kcal === null) return { kind: "not_found", draft: named };

  return {
    kind: "found",
    draft: {
      ...named,
      servingSize: cleanText(product.serving_size),
      servingGrams: asField(servingGrams),
      netWeightG: asField(positive(toNumber(product.product_quantity))),
      kcalPer100g: asField(kcal),
      proteinPer100g: asField(inRange(per100(nutriments, "proteins", servingGrams), 0, 100)),
      carbsPer100g: asField(inRange(per100(nutriments, "carbohydrates", servingGrams), 0, 100)),
      fatPer100g: asField(inRange(per100(nutriments, "fat", servingGrams), 0, 100)),
    },
  };
}
