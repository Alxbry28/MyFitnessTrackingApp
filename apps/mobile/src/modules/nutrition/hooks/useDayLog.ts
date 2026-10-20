import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import * as foodLogRepo from "../repositories/foodLogRepo";
import { sumTotals } from "../services/nutritionCalc";
import { MEAL_TYPES, type FoodLogEntry, type MealType } from "../types/foodLog";

type Status = "loading" | "ready" | "error";

export type MealGroup = { mealType: MealType; entries: FoodLogEntry[]; kcal: number };

export type UndoState = { entryId: string; name: string } | null;

const UNDO_MS = 5000;

export function useDayLog(day: string) {
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingUndo, setPendingUndo] = useState<UndoState>(null);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const rows = await foodLogRepo.listByDay(db, day);
      if (request !== latestRequest.current) return;
      setEntries(rows);
      setStatus("ready");
    } catch {
      if (request !== latestRequest.current) return;
      setStatus("error");
    }
  }, [db, day]);

  // Refreshes when returning from the add and edit screens.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!pendingUndo) return;
    const timer = setTimeout(() => setPendingUndo(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [pendingUndo]);

  const retry = useCallback(() => {
    setStatus("loading");
    void load();
  }, [load]);

  const remove = useCallback(
    async (entry: FoodLogEntry) => {
      setActionError(null);
      try {
        await foodLogRepo.softDelete(db, entry.id);
        setPendingUndo({ entryId: entry.id, name: entry.productName });
      } catch {
        setActionError("Couldn't delete the entry. Try again.");
      }
      await load();
    },
    [db, load],
  );

  const undo = useCallback(async () => {
    if (!pendingUndo) return;
    setPendingUndo(null);
    setActionError(null);
    try {
      await foodLogRepo.restore(db, pendingUndo.entryId);
    } catch {
      setActionError("Couldn't restore the entry.");
    }
    await load();
  }, [db, load, pendingUndo]);

  const groups = useMemo<MealGroup[]>(
    () =>
      MEAL_TYPES.map((mealType) => {
        const mealEntries = entries.filter((e) => e.mealType === mealType);
        return { mealType, entries: mealEntries, kcal: sumTotals(mealEntries).kcal };
      }),
    [entries],
  );

  const totals = useMemo(() => sumTotals(entries), [entries]);

  return { status, retry, groups, totals, isEmpty: entries.length === 0, remove, undo, pendingUndo, actionError };
}
