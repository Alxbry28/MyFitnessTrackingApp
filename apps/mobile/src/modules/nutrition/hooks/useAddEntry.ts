import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import * as foodLogRepo from "../repositories/foodLogRepo";
import * as productRepo from "../repositories/productRepo";
import { dayKey, isDayKey } from "../services/mealTime";
import type { EntryInput } from "../types/foodLog";
import type { Product } from "../types/product";

type State =
  | { status: "loading" }
  | { status: "ready"; product: Product; defaultGrams: number }
  | { status: "not_found" }
  | { status: "error" };

// A day from the route counts only if it's a real date that isn't in the future.
function targetDay(requested: string | undefined): string {
  const today = dayKey(new Date());
  return requested && isDayKey(requested) && requested <= today ? requested : today;
}

// Loads the product plus the grams to prefill: last logged, else serving, else 100.
export function useAddEntry(productId: string, day?: string) {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([productRepo.findById(db, productId), foodLogRepo.lastGramsForProduct(db, productId)])
      .then(([product, lastGrams]) => {
        if (!active) return;
        if (!product) {
          setState({ status: "not_found" });
          return;
        }
        setState({ status: "ready", product, defaultGrams: lastGrams ?? product.servingGrams ?? 100 });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [db, productId, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  const save = useCallback(
    async (product: Product, input: EntryInput) => {
      await foodLogRepo.create(db, product, { ...input, day: targetDay(day) });
      return { ok: true } as const;
    },
    [db, day],
  );

  return { state, retry, save };
}
