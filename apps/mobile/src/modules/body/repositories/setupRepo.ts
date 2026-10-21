import type { SQLiteDatabase } from "expo-sqlite";

import * as settingsRepo from "@/modules/nutrition/repositories/settingsRepo";
import { dayKey } from "@/modules/nutrition/services/mealTime";

import * as bodyProfileRepo from "./bodyProfileRepo";
import * as weightRepo from "./weightRepo";

export type FinishInput = bodyProfileRepo.SetupInput & {
  units: settingsRepo.Units;
  calorieGoal: number;
  weightKg: number;
};

export type FinishResult = { ok: true; weightSaved: boolean };

// The profile, units, goal and done flag land together; today's weight follows in its own
// transaction (saveManual keeps one typed weight per day), so a weight failure keeps the goal.
export async function finishSetup(db: SQLiteDatabase, input: FinishInput, now = new Date()): Promise<FinishResult> {
  const { units, calorieGoal, weightKg, ...profile } = input;
  await db.withExclusiveTransactionAsync(async (txn) => {
    await bodyProfileRepo.saveSetup(txn, profile);
    await settingsRepo.setUnits(txn, units);
    await settingsRepo.setCalorieGoal(txn, calorieGoal);
    await settingsRepo.markSetupDone(txn);
  });
  try {
    await weightRepo.saveManual(db, { day: dayKey(now), measuredAt: now.toISOString(), weightKg }, null);
    return { ok: true, weightSaved: true };
  } catch {
    return { ok: true, weightSaved: false };
  }
}
