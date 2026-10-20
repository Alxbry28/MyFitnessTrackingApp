import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import { addDays, dayFromKey, dayKey } from "@/modules/nutrition/services/mealTime";

import * as weightRepo from "../repositories/weightRepo";
import { dailyValues, weeklyTrend } from "../services/weightCalc";
import type { WeighIn } from "../types/body";

type State =
  | { status: "loading" }
  | {
      status: "ready";
      entry: WeighIn | null;
      prefillKg: number | null;
      yesterdayKg: number | null;
      averageKg: number | null;
    }
  | { status: "not_found" }
  | { status: "error" };

// Loads the reading being edited (or none for a new one) plus the hint values.
export function useWeightEntry(id: string | undefined) {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const today = dayKey(new Date());
    Promise.all([
      id ? weightRepo.findById(db, id) : Promise.resolve(null),
      weightRepo.listSince(db, addDays(today, -13)),
      weightRepo.listLatestDay(db),
    ])
      .then(([entry, readings, latestDay]) => {
        if (!active) return;
        if (id && !entry) {
          setState({ status: "not_found" });
          return;
        }
        const daily = dailyValues(readings);
        const yesterday = addDays(today, -1);
        setState({
          status: "ready",
          entry,
          prefillKg: entry?.weightKg ?? dailyValues(latestDay)[0]?.weightKg ?? null,
          yesterdayKg: daily.find((d) => d.day === yesterday)?.weightKg ?? null,
          averageKg: weeklyTrend(daily, today).average,
        });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [db, id, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  const manualOnDay = useCallback(
    (day: string) => weightRepo.manualForDay(db, day, id ?? null),
    [db, id],
  );

  // Today's weight keeps the real time; a past day gets local noon.
  const save = useCallback(
    (day: string, weightKg: number) => {
      const now = new Date();
      const measuredAt = day === dayKey(now) ? now.toISOString() : dayFromKey(day).toISOString();
      return weightRepo.saveManual(db, { day, measuredAt, weightKg }, id ?? null);
    },
    [db, id],
  );

  const remove = useCallback(async () => {
    if (id) await weightRepo.softDelete(db, id);
  }, [db, id]);

  return { state, retry, manualOnDay, save, remove };
}
