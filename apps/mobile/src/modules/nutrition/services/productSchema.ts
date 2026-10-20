import { z } from "zod";

import type { Product, ProductInput } from "../types/product";

// Kept free of React and SQLite so it can get unit tests once a runner exists.

// Android decimal keyboards can type a comma depending on locale.
function toNumber(value: string): number {
  return Number(value.replace(",", "."));
}

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

function requiredNumber(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, "Required")
    .transform(toNumber)
    .pipe(
      z
        .number({ error: "Enter a number" })
        .min(min, `Must be ${min}-${max}`)
        .max(max, `Must be ${min}-${max}`),
    );
}

function optionalRange(min: number, max: number) {
  return z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : toNumber(v)))
    .pipe(
      z
        .number({ error: "Enter a number" })
        .min(min, `Must be ${min}-${max}`)
        .max(max, `Must be ${min}-${max}`)
        .nullable(),
    );
}

const optionalPositive = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : toNumber(v)))
  .pipe(z.number({ error: "Enter a number" }).positive("Must be more than 0").nullable());

export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  brand: optionalText,
  barcode: optionalText.pipe(z.string().regex(/^\d+$/, "Digits only").nullable()),
  servingSize: optionalText,
  servingGrams: optionalPositive,
  netWeightG: optionalPositive,
  kcalPer100g: requiredNumber(0, 900),
  proteinPer100g: optionalRange(0, 100),
  carbsPer100g: optionalRange(0, 100),
  fatPer100g: optionalRange(0, 100),
});

// Every field is typed text in the form; the schema turns it into a ProductInput.
export type ProductFormValues = z.input<typeof productSchema>;

// Compile-time guard that the schema output stays in step with ProductInput.
const _outputMatches: z.output<typeof productSchema> extends ProductInput ? true : never = true;
void _outputMatches;

export const emptyProductForm: ProductFormValues = {
  name: "",
  brand: "",
  barcode: "",
  servingSize: "",
  servingGrams: "",
  netWeightG: "",
  kcalPer100g: "",
  proteinPer100g: "",
  carbsPer100g: "",
  fatPer100g: "",
};

export function newProductForm(barcode: string | null): ProductFormValues {
  return { ...emptyProductForm, barcode: barcode ?? "" };
}

function text(value: string | number | null): string {
  return value === null ? "" : String(value);
}

export function productToForm(product: Product): ProductFormValues {
  return {
    name: product.name,
    brand: text(product.brand),
    barcode: text(product.barcode),
    servingSize: text(product.servingSize),
    servingGrams: text(product.servingGrams),
    netWeightG: text(product.netWeightG),
    kcalPer100g: text(product.kcalPer100g),
    proteinPer100g: text(product.proteinPer100g),
    carbsPer100g: text(product.carbsPer100g),
    fatPer100g: text(product.fatPer100g),
  };
}
