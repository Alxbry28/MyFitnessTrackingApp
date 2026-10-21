import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import { workoutRepo } from "../repositories/workoutRepo";
import type { WorkoutSession } from "../types/workouts";

export function useWorkoutHistory(limit = 50) {
  const db = useSQLiteContext();
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const list = await workoutRepo.listHistory(db, limit);
      if (request === latestRequest.current) {
        setHistory(list);
        setLoading(false);
      }
    } catch {
      if (request === latestRequest.current) {
        setLoading(false);
      }
    }
  }, [db, limit]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const deleteWorkout = useCallback(
    async (id: string) => {
      await workoutRepo.deleteSession(db, id);
      void load();
    },
    [db, load],
  );

  return {
    history,
    loading,
    refresh: load,
    deleteWorkout,
  };
}
