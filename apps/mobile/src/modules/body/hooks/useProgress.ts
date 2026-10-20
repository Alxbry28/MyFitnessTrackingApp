import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import { addDays, dayKey } from "@/modules/nutrition/services/mealTime";

import * as bodyProfileRepo from "../repositories/bodyProfileRepo";
import * as weightRepo from "../repositories/weightRepo";
import { chartPoints, dailyValues, weeklyTrend, type ChartPoint, type DailyWeight, type Trend } from "../services/weightCalc";
import type { BodyProfile, WeighIn } from "../types/body";

type State =
  | { status: "loading" }
  | {
      status: "ready";
      today: string;
      trend: Trend;
      chart: ChartPoint[];
      latest: DailyWeight | null;
      recent: WeighIn[];
      profile: BodyProfile;
    }
  | { status: "error" };

export function useProgress() {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: "loading" });
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const today = dayKey(new Date());
      const [readings, latestDay, profile] = await Promise.all([
        weightRepo.listSince(db, addDays(today, -29)),
        weightRepo.listLatestDay(db),
        bodyProfileRepo.get(db),
      ]);
      if (request !== latestRequest.current) return;
      const daily = dailyValues(readings);
      const recentFrom = addDays(today, -13);
      setState({
        status: "ready",
        today,
        trend: weeklyTrend(daily, today),
        chart: chartPoints(daily, today),
        latest: dailyValues(latestDay)[0] ?? null,
        recent: readings.filter((r) => r.day >= recentFrom).reverse(),
        profile,
      });
    } catch {
      if (request === latestRequest.current) setState({ status: "error" });
    }
  }, [db]);

  // Reloads on focus so a saved weight, profile or import shows right away.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  return { state, retry };
}
