import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import type { MealType } from "@/modules/nutrition/types/foodLog";
import { mealPrepRepo } from "../repositories/mealPrepRepo";
import type { MealPrep } from "../types/mealPrep";

export function useMealPrep() {
  const db = useSQLiteContext();
  const [mealPreps, setMealPreps] = useState<MealPrep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await mealPrepRepo.listActive(db);
      setMealPreps(list);
    } catch (e: any) {
      setError(e.message || "Failed to load meal prep inventory.");
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    mealPrepRepo
      .listActive(db)
      .then((list) => {
        if (!cancelled) {
          setMealPreps(list);
          setLoading(false);
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(e.message || "Failed to load meal prep inventory.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const eatOneBox = useCallback(
    async (mealPrepId: string, mealType?: MealType, day?: string) => {
      const res = await mealPrepRepo.eatOneBox(db, mealPrepId, mealType, day);
      await refresh();
      return res;
    },
    [db, refresh],
  );

  const deletePrep = useCallback(
    async (mealPrepId: string) => {
      await mealPrepRepo.delete(db, mealPrepId);
      await refresh();
    },
    [db, refresh],
  );

  return {
    mealPreps,
    loading,
    error,
    refresh,
    eatOneBox,
    deletePrep,
  };
}
