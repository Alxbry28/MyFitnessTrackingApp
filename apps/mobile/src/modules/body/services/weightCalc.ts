import { addDays } from "@/modules/nutrition/services/mealTime";

import type { BmiScale, WeighIn } from "../types/body";

// Kept free of React and SQLite so it can get unit tests once a runner exists.

export type DailyWeight = { day: string; weightKg: number };

// A typed weight wins for its day; otherwise the first reading counts, matching
// the "weigh in the morning" rule (10_body_progress §5b).
export function dailyValues(readings: WeighIn[]): DailyWeight[] {
  const byDay = new Map<string, WeighIn>();
  for (const r of readings) {
    const current = byDay.get(r.day);
    if (!current) {
      byDay.set(r.day, r);
      continue;
    }
    const rManual = r.source === "manual";
    const currentManual = current.source === "manual";
    if (rManual !== currentManual) {
      if (rManual) byDay.set(r.day, r);
    } else if (rManual ? r.updatedAt > current.updatedAt : r.measuredAt < current.measuredAt) {
      byDay.set(r.day, r);
    }
  }
  return [...byDay.values()]
    .map((r) => ({ day: r.day, weightKg: r.weightKg }))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

function meanBetween(daily: DailyWeight[], from: string, to: string): number | null {
  const inRange = daily.filter((d) => d.day >= from && d.day <= to);
  if (inRange.length === 0) return null;
  return inRange.reduce((sum, d) => sum + d.weightKg, 0) / inRange.length;
}

export type Trend = { average: number | null; change: number | null };

// 7-day average ending today, and its change against the 7 days before.
export function weeklyTrend(daily: DailyWeight[], today: string): Trend {
  const average = meanBetween(daily, addDays(today, -6), today);
  const previous = meanBetween(daily, addDays(today, -13), addDays(today, -7));
  const change = average !== null && previous !== null ? round1(average - previous) : null;
  return { average, change };
}

export type ChartPoint = { day: string; weightKg: number; trendKg: number };

// Daily values in the last `days` days, each with the mean of its own 7-day window.
export function chartPoints(daily: DailyWeight[], today: string, days = 30): ChartPoint[] {
  const from = addDays(today, -(days - 1));
  return daily
    .filter((d) => d.day >= from && d.day <= today)
    .map((d) => ({ ...d, trendKg: meanBetween(daily, addDays(d.day, -6), d.day) ?? d.weightKg }));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return round1(weightKg / (m * m));
}

// Cutoffs from 10_body_progress §4; Asia-Pacific is WHO 2000's lower set.
export function bmiCategory(value: number, scale: BmiScale): string {
  if (value < 18.5) return "Underweight";
  if (scale === "asia_pacific") {
    if (value < 23) return "Normal";
    if (value < 25) return "At risk";
    return "Obese";
  }
  if (value < 25) return "Normal";
  if (value < 30) return "Overweight";
  return "Obese";
}

export const BMI_SCALE_LABELS: Record<BmiScale, string> = {
  asia_pacific: "Asia-Pacific",
  who: "WHO",
};

export function formatKg(value: number): string {
  return round1(value).toFixed(1);
}

// "−0.4 kg" with a real minus sign, "+0.2 kg", or "0.0 kg".
export function formatChange(value: number): string {
  if (value === 0) return "0.0 kg";
  return `${value < 0 ? "\u2212" : "+"}${Math.abs(value).toFixed(1)} kg`;
}
