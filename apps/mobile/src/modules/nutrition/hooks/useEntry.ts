import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import * as foodLogRepo from "../repositories/foodLogRepo";
import * as productRepo from "../repositories/productRepo";
import { loggedAtFor, type EntryDraft } from "../services/entryEdit";
import { logDay } from "../services/mealTime";
import { formatKcal } from "../services/nutritionCalc";
import type { FoodLogEntry } from "../types/foodLog";

type State =
  | { status: "loading" }
  | { status: "ready"; entry: FoodLogEntry; servingGrams: number | null; dayKcal: number }
  | { status: "not_found" }
  | { status: "error" };

export type SaveOutcome = { ok: true } | { ok: false; message: string };

// Loads the entry plus what the edit screen shows around it: the product's serving (if the
// product still exists) for the amount chips, and the day's total for the delete sheet.
export function useEntry(id: string) {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const entry = await foodLogRepo.findById(db, id);
      if (!entry) return { status: "not_found" } as const;
      const [product, dayEntries] = await Promise.all([
        entry.productId ? productRepo.findById(db, entry.productId) : Promise.resolve(null),
        foodLogRepo.listByDay(db, entry.day),
      ]);
      const dayKcal = dayEntries.reduce((sum, e) => sum + e.kcal, 0);
      return { status: "ready", entry, servingGrams: product?.servingGrams ?? null, dayKcal } as const;
    })()
      .then((next) => {
        if (active) setState(next);
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

  const save = useCallback(
    async (draft: EntryDraft & { grams: number }): Promise<SaveOutcome> => {
      // A day in the future can't be picked, but logDay keeps the rule in one place.
      const day = logDay(draft.day);
      const result = await foodLogRepo.update(db, id, {
        mealType: draft.mealType,
        grams: draft.grams,
        day,
        loggedAt: loggedAtFor(day, draft.minutes),
      });
      if (result.ok) return { ok: true };
      if (result.error === "not_enough") {
        return { ok: false, message: `Only ${formatKcal(result.gramsLeft)} g left in your pantry.` };
      }
      return { ok: false, message: "This entry was deleted, so it couldn't be saved." };
    },
    [db, id],
  );

  const remove = useCallback(async () => {
    const result = await foodLogRepo.softDelete(db, id);
    return result.ok;
  }, [db, id]);

  return { state, retry, save, remove };
}
