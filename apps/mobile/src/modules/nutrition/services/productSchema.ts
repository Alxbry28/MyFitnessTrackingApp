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

const fields = z.object({
  name: z.string().trim().min(1, "Name is required"),
  brand: optionalText,
  barcode: optionalText,
  servingSize: optionalText,
  servingGrams: optionalPositive,
  netWeightG: optionalPositive,
  kcalPer100g: requiredNumber(0, 900),
  proteinPer100g: optionalRange(0, 100),
  carbsPer100g: optionalRange(0, 100),
  fatPer100g: optionalRange(0, 100),
  eatenDrained: z.boolean(),
  drainedKcalPer100g: z.string(),
  drainedProteinPer100g: z.string(),
  drainedCarbsPer100g: z.string(),
  drainedFatPer100g: z.string(),
  usualDrainedG: z.string(),
});

const drainedFields = {
  drainedKcalPer100g: optionalRange(0, 900),
  drainedProteinPer100g: optionalRange(0, 100),
  drainedCarbsPer100g: optionalRange(0, 100),
  drainedFatPer100g: optionalRange(0, 100),
  usualDrainedG: optionalPositive,
};
type DrainedKey = keyof typeof drainedFields;
const DRAINED_KEYS = Object.keys(drainedFields) as DrainedKey[];

// Drained fields are hidden while the switch is off, so they're only checked when it's on;
// then logging needs the drained kcal, and stock needs both weights to turn drained grams
// into net grams.
export const productSchema = fields.transform((v, ctx) => {
  const require = (path: keyof typeof v, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  const drained = {} as Record<DrainedKey, number | null>;
  for (const key of DRAINED_KEYS) {
    const parsed = drainedFields[key].safeParse(v[key]);
    drained[key] = parsed.success ? parsed.data : null;
    if (!parsed.success && v.eatenDrained) require(key, parsed.error.issues[0]?.message ?? "Enter a number");
  }
  if (v.eatenDrained) {
    if (v.netWeightG === null) require("netWeightG", "Needed when eaten drained");
    if (drained.drainedKcalPer100g === null && v.drainedKcalPer100g.trim() === "") require("drainedKcalPer100g", "Required");
    if (drained.usualDrainedG === null && v.usualDrainedG.trim() === "") require("usualDrainedG", "Required");
    if (drained.usualDrainedG !== null && v.netWeightG !== null && drained.usualDrainedG > v.netWeightG) {
      require("usualDrainedG", "Can't be more than the net weight");
    }
  }
  return { ...v, ...drained };
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
  eatenDrained: false,
  drainedKcalPer100g: "",
  drainedProteinPer100g: "",
  drainedCarbsPer100g: "",
  drainedFatPer100g: "",
  usualDrainedG: "",
};

export function newProductForm(barcode: string | null, name = ""): ProductFormValues {
  return { ...emptyProductForm, barcode: barcode ?? "", name };
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
    eatenDrained: product.eatenDrained,
    drainedKcalPer100g: text(product.drainedKcalPer100g),
    drainedProteinPer100g: text(product.drainedProteinPer100g),
    drainedCarbsPer100g: text(product.drainedCarbsPer100g),
    drainedFatPer100g: text(product.drainedFatPer100g),
    usualDrainedG: text(product.usualDrainedG),
  };
}
