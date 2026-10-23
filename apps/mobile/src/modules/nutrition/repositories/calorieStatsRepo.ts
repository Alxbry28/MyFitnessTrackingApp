import type { SQLiteDatabase } from "expo-sqlite";

import { bmr, tdee, type ActivityLevel, type Goal, type Sex } from "@/modules/body/services/setupCalc";
import {
  calculateAdherence,
  calculateLearnedTdee,
  calculateMacroAverages,
  calculateSuggestedTarget,
  type AdherenceStats,
  type DayIntake,
  type MacroAverages,
  type SuggestedTargets,
  type TdeeResult,
} from "../services/calorieStatsCalc";
import { getCalorieGoal, setCalorieGoal } from "./settingsRepo";

type DayAggRow = {
  day: string;
  total_kcal: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fat: number | null;
};

type WeightRow = {
  day: string;
  weight_kg: number;
};

type ProfileRow = {
  height_cm: number | null;
  sex: Sex | null;
  birth_date: string | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
};

function formatIsoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type CalorieStatsData = {
  dailyIntake30Days: DayIntake[];
  averages7Days: MacroAverages;
  averages30Days: MacroAverages;
  tdee: TdeeResult;
  suggestedTarget: SuggestedTargets;
  currentTargetKcal: number;
  adherence30Days: AdherenceStats;
  goal: Goal;
};

export const calorieStatsRepo = {
  async getCalorieStats(db: SQLiteDatabase): Promise<CalorieStatsData> {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(today.getDate() - 14);

    const thirtyDaysStr = formatIsoDay(thirtyDaysAgo);
    const fourteenDaysStr = formatIsoDay(fourteenDaysAgo);

    // 1. Food log aggregated by day
    const foodRows = await db.getAllAsync<DayAggRow>(
      `SELECT day,
              ROUND(SUM(kcal)) AS total_kcal,
              ROUND(SUM(protein_g), 1) AS total_protein,
              ROUND(SUM(carbs_g), 1) AS total_carbs,
              ROUND(SUM(fat_g), 1) AS total_fat
       FROM food_log_entries
       WHERE day >= ? AND deleted_at IS NULL
       GROUP BY day
       ORDER BY day DESC`,
      [thirtyDaysStr],
    );

    const dailyIntake30Days: DayIntake[] = foodRows.map((r) => ({
      day: r.day,
      kcal: r.total_kcal ?? 0,
      protein: r.total_protein ?? 0,
      carbs: r.total_carbs ?? 0,
      fat: r.total_fat ?? 0,
    }));

    // 2. Weights in the last 14 days
    const weightRows = await db.getAllAsync<WeightRow>(
      `SELECT day, weight_kg
       FROM body_weight_entries
       WHERE day >= ? AND deleted_at IS NULL
       ORDER BY measured_at ASC`,
      [fourteenDaysStr],
    );

    let weightTrendChangeKg: number | null = null;
    if (weightRows.length >= 2) {
      const firstWeight = weightRows[0]!.weight_kg;
      const lastWeight = weightRows[weightRows.length - 1]!.weight_kg;
      weightTrendChangeKg = Math.round((lastWeight - firstWeight) * 10) / 10;
    }

    // Latest weight overall
    const latestWeightRow = await db.getFirstAsync<{ weight_kg: number }>(
      "SELECT weight_kg FROM body_weight_entries WHERE deleted_at IS NULL ORDER BY measured_at DESC LIMIT 1",
    );
    const currentWeightKg = latestWeightRow?.weight_kg ?? null;

    // 3. User profile & formula TDEE
    const profile = await db.getFirstAsync<ProfileRow>(
      "SELECT height_cm, sex, birth_date, activity_level, goal FROM body_profile WHERE id = 1",
    );

    const sex = profile?.sex ?? "male";
    const heightCm = profile?.height_cm ?? 170;
    const activityLevel = profile?.activity_level ?? "moderate";
    const goal = profile?.goal ?? "cut";

    let age = 30;
    if (profile?.birth_date) {
      const birthYear = parseInt(profile.birth_date.slice(0, 4), 10);
      if (!isNaN(birthYear)) {
        age = Math.max(16, today.getFullYear() - birthYear);
      }
    }

    const weightForBmr = currentWeightKg ?? 70;
    const formulaBmr = bmr(sex, weightForBmr, heightCm, age);
    const formulaTdee = Math.round(tdee(formulaBmr, activityLevel));

    // 4. Current goal from settings
    const storedGoal = await getCalorieGoal(db);
    let currentTargetKcal = storedGoal;
    if (currentTargetKcal == null) {
      const legacySetting = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'calorie_goal'",
      );
      if (legacySetting?.value) {
        const parsed = parseInt(legacySetting.value, 10);
        if (!isNaN(parsed) && parsed > 0) {
          currentTargetKcal = parsed;
        }
      }
    }
    if (currentTargetKcal == null) {
      currentTargetKcal = 2000;
    }

    // 5. Calculations
    const intake14Days = dailyIntake30Days.filter((d) => d.day >= fourteenDaysStr);
    const tdeeResult = calculateLearnedTdee({
      intake14Days,
      weightTrendChangeKg,
      weighInCount: weightRows.length,
      formulaTdee,
    });

    const averages7Days = calculateMacroAverages(dailyIntake30Days, 7);
    const averages30Days = calculateMacroAverages(dailyIntake30Days, 30);
    const suggestedTarget = calculateSuggestedTarget(tdeeResult.tdeeKcal, goal, currentWeightKg);
    const adherence30Days = calculateAdherence(dailyIntake30Days, currentTargetKcal, goal);

    return {
      dailyIntake30Days,
      averages7Days,
      averages30Days,
      tdee: tdeeResult,
      suggestedTarget,
      currentTargetKcal,
      adherence30Days,
      goal,
    };
  },

  async updateCalorieGoal(db: SQLiteDatabase, newGoalKcal: number): Promise<void> {
    await setCalorieGoal(db, newGoalKcal);
  },
};
