import { z } from "zod";

import type { Units } from "@/modules/nutrition/repositories/settingsRepo";

import { ageOn, ftInToCm, lbToKg, SEXES, type Goal, type Sex } from "./setupCalc";

// Kept free of React and SQLite so it can get unit tests once a runner exists.

export type AboutValues = {
  sex: Sex;
  birthDate: string | null;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string;
};

export type About = { sex: Sex; birthDate: string; heightCm: number; weightKg: number };
export type AboutErrors = Partial<Record<"birthDate" | "height" | "weight", string>>;

const MIN_AGE = 18;

// Android decimal keyboards can type a comma depending on locale.
const decimal = z
  .string()
  .trim()
  .min(1)
  .transform((v) => Number(v.replace(",", ".")))
  .pipe(z.number().finite());

function num(value: string): number | null {
  const parsed = decimal.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function weightError(units: Units): string {
  return units === "imperial" ? "Enter a weight from 45 to 661 lb" : "Enter a weight from 20 to 300 kg";
}

// Display weight (kg or lb) to kg, inside the app's 20-300 kg range; null when invalid.
// The lb message says 45-661 because 44 lb is just under 20 kg.
export function parseWeight(value: string, units: Units): number | null {
  const n = num(value);
  if (n === null) return null;
  const kg = units === "imperial" ? lbToKg(n) : n;
  return kg >= 20 && kg <= 300 ? Math.round(kg * 10) / 10 : null;
}

export function validateAbout(
  values: AboutValues,
  units: Units,
  today: string,
): { ok: true; data: About } | { ok: false; errors: AboutErrors } {
  const errors: AboutErrors = {};

  const birthDate = values.birthDate;
  if (!birthDate) errors.birthDate = "Pick your birth date";
  else if (ageOn(birthDate, today) < MIN_AGE) errors.birthDate = "You need to be 18 or older";

  let heightCm: number | null;
  if (units === "imperial") {
    const ft = num(values.heightFt);
    const inches = values.heightIn.trim() === "" ? 0 : num(values.heightIn);
    heightCm = ft === null || inches === null || inches < 0 || inches >= 12 ? null : ftInToCm(ft, inches);
  } else {
    heightCm = num(values.heightCm);
  }
  if (heightCm === null || heightCm < 100 || heightCm > 250) {
    errors.height =
      units === "imperial" ? "Enter a height from 3 ft 4 in to 8 ft 2 in" : "Enter a height from 100 to 250 cm";
  }

  const weightKg = parseWeight(values.weight, units);
  if (weightKg === null) errors.weight = weightError(units);

  if (!birthDate || heightCm === null || weightKg === null || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    data: { sex: SEXES.includes(values.sex) ? values.sex : "male", birthDate, heightCm: Math.round(heightCm * 10) / 10, weightKg },
  };
}

// A cut needs a lower target and a bulk a higher one; maintain has none.
export function targetWeightError(goal: Goal, targetKg: number | null, currentKg: number, units: Units): string | null {
  if (goal === "maintain") return null;
  if (targetKg === null) return weightError(units);
  if (goal === "cut" && targetKg >= currentKg) return "Pick a target below your current weight";
  if (goal === "bulk" && targetKg <= currentKg) return "Pick a target above your current weight";
  return null;
}
