import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import {
  calorieStatsRepo,
  type CalorieStatsData,
} from "../repositories/calorieStatsRepo";

export function useCalorieStats() {
  const db = useSQLiteContext();
  const [data, setData] = useState<CalorieStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const request = ++latestRequest.current;
    try {
      const result = await calorieStatsRepo.getCalorieStats(db);
      if (request === latestRequest.current) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      if (request === latestRequest.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const acceptSuggestion = useCallback(
    async (goalKcal: number) => {
      await calorieStatsRepo.updateCalorieGoal(db, goalKcal);
      void load();
    },
    [db, load],
  );

  return {
    data,
    loading,
    error,
    refresh: load,
    acceptSuggestion,
  };
}
