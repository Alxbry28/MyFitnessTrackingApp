import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import * as foodLogRepo from "../repositories/foodLogRepo";
import * as productRepo from "../repositories/productRepo";
import { dayKey } from "../services/mealTime";
import type { EntryInput } from "../types/foodLog";
import type { Product } from "../types/product";

type State =
  | { status: "loading" }
  | { status: "ready"; product: Product; defaultGrams: number }
  | { status: "not_found" }
  | { status: "error" };

// Loads the product plus the grams to prefill: last logged, else serving, else 100.
export function useAddEntry(productId: string) {
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
      await foodLogRepo.create(db, product, { ...input, day: dayKey(new Date()) });
      return { ok: true } as const;
    },
    [db],
  );

  return { state, retry, save };
}
