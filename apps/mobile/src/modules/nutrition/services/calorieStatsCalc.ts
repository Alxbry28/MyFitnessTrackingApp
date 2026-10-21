import type { Goal } from "@/modules/body/services/setupCalc";

export type DayIntake = {
  day: string; // YYYY-MM-DD
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MacroAverages = {
  avgKcal: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  daysLogged: number;
};

export type TdeeResult = {
  tdeeKcal: number;
  source: "from your data" | "estimate";
  isLearned: boolean;
  formulaTdee: number;
  learnedTdee?: number;
  daysWithFood: number;
  weighInCount: number;
  explanation: string;
};

export type SuggestedTargets = {
  suggestedKcal: number;
  suggestedProteinGrams: number;
  explanation: string;
};

export type AdherenceStats = {
  onTarget: number;
  totalLogged: number;
  percentage: number;
};

export const KCAL_PER_KG_FAT = 7700;

export function calculateMacroAverages(days: DayIntake[], windowDays: number): MacroAverages {
  if (days.length === 0 || windowDays <= 0) {
    return { avgKcal: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0, daysLogged: 0 };
  }

  const slice = days.slice(0, windowDays);
  const totalKcal = slice.reduce((sum, d) => sum + d.kcal, 0);
  const totalProtein = slice.reduce((sum, d) => sum + d.protein, 0);
  const totalCarbs = slice.reduce((sum, d) => sum + d.carbs, 0);
  const totalFat = slice.reduce((sum, d) => sum + d.fat, 0);
  const count = slice.length;

  return {
    avgKcal: Math.round(totalKcal / count),
    avgProtein: Math.round((totalProtein / count) * 10) / 10,
    avgCarbs: Math.round((totalCarbs / count) * 10) / 10,
    avgFat: Math.round((totalFat / count) * 10) / 10,
    daysLogged: count,
  };
}

export function calculateAdherence(
  days: DayIntake[],
  goalKcal: number,
  goal: Goal = "cut",
): AdherenceStats {
  if (days.length === 0 || goalKcal <= 0) {
    return { onTarget: 0, totalLogged: 0, percentage: 0 };
  }

  let onTargetCount = 0;

  for (const d of days) {
    if (d.kcal <= 0) continue;
    if (goal === "cut") {
      // Under or within 50 kcal over goal
      if (d.kcal <= goalKcal + 50) onTargetCount++;
    } else if (goal === "bulk") {
      // Within 50 kcal under goal or higher
      if (d.kcal >= goalKcal - 50) onTargetCount++;
    } else {
      // Within +/- 150 kcal
      if (Math.abs(d.kcal - goalKcal) <= 150) onTargetCount++;
    }
  }

  const totalLogged = days.filter((d) => d.kcal > 0).length;
  const percentage = totalLogged > 0 ? Math.round((onTargetCount / totalLogged) * 100) : 0;

  return {
    onTarget: onTargetCount,
    totalLogged,
    percentage,
  };
}

export function calculateLearnedTdee(params: {
  intake14Days: DayIntake[];
  weightTrendChangeKg: number | null;
  weighInCount: number;
  formulaTdee: number;
}): TdeeResult {
  const { intake14Days, weightTrendChangeKg, weighInCount, formulaTdee } = params;
  const daysWithFood = intake14Days.filter((d) => d.kcal > 0).length;

  // Acceptance criteria (1_docs/plan/10_body_progress.md §2):
  // ≥ 12 of the last 14 days with food logged and ≥ 4 weigh-ins
  const canLearn =
    daysWithFood >= 12 && weighInCount >= 4 && weightTrendChangeKg !== null && !isNaN(weightTrendChangeKg);

  if (canLearn) {
    const totalIntake = intake14Days.reduce((sum, d) => sum + d.kcal, 0);
    const avgIntake = totalIntake / daysWithFood;

    // Daily deficit or surplus from weight change (trend change over 14 days)
    // If lost 0.4 kg: deficit = (0.4 * 7700) / 14 = 220 kcal
    // Learned TDEE = avgIntake + deficit (or - surplus)
    const dailyDeficitOrSurplus = (weightTrendChangeKg * KCAL_PER_KG_FAT) / 14;
    const rawLearned = Math.round(avgIntake - dailyDeficitOrSurplus);

    // Keep within reasonable human bounds (1,000 to 5,500 kcal)
    const learnedTdee = Math.min(5500, Math.max(1000, rawLearned));

    return {
      tdeeKcal: learnedTdee,
      source: "from your data",
      isLearned: true,
      formulaTdee,
      learnedTdee,
      daysWithFood,
      weighInCount,
      explanation: `Learned from ${daysWithFood} days of logged food (avg ${Math.round(avgIntake)} kcal) and 14-day weight trend (${weightTrendChangeKg > 0 ? "+" : ""}${weightTrendChangeKg.toFixed(1)} kg).`,
    };
  }

  return {
    tdeeKcal: formulaTdee,
    source: "estimate",
    isLearned: false,
    formulaTdee,
    daysWithFood,
    weighInCount,
    explanation: `Formula estimate (Mifflin-St Jeor). Log food for ≥12 days and weigh in ≥4 times over 2 weeks to unlock learned maintenance.`,
  };
}

export function calculateSuggestedTarget(
  tdeeKcal: number,
  goal: Goal = "cut",
  weightKg?: number | null,
): SuggestedTargets {
  let offset = 0;
  let explanation = "";

  if (goal === "cut") {
    offset = -400;
    explanation = "400 kcal deficit for a steady, sustainable fat loss pace (about 0.35 kg/week).";
  } else if (goal === "bulk") {
    offset = 250;
    explanation = "250 kcal surplus for lean muscle gain while minimizing fat accumulation.";
  } else {
    offset = 0;
    explanation = "Maintenance intake to keep body weight stable.";
  }

  const suggestedKcal = Math.round((tdeeKcal + offset) / 10) * 10;
  // Protein recommendation: 1.8 g/kg body weight (or 130g fallback)
  const suggestedProteinGrams = weightKg && weightKg > 0 ? Math.round(weightKg * 1.8) : 130;

  return {
    suggestedKcal: Math.min(6000, Math.max(800, suggestedKcal)),
    suggestedProteinGrams,
    explanation,
  };
}
