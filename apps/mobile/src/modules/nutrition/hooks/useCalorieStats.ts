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
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const result = await calorieStatsRepo.getCalorieStats(db);
      if (request === latestRequest.current) {
        setData(result);
        setLoading(false);
      }
    } catch {
      if (request === latestRequest.current) {
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
    refresh: load,
    acceptSuggestion,
  };
}
