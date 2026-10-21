import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import * as productRepo from "@/modules/nutrition/repositories/productRepo";
import type { Product } from "@/modules/nutrition/types/product";

import * as pantryRepo from "../repositories/pantryRepo";
import type { PantryStock } from "../types/pantry";

type State =
  | { status: "loading" }
  | { status: "ready"; product: Product; stock: PantryStock | null }
  | { status: "not_found" }
  | { status: "error" };

// Loads the product and its pantry item (if any) for "How many did you buy?".
export function useAddStock(productId: string) {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([productRepo.findById(db, productId), pantryRepo.stockForProduct(db, productId)])
      .then(([product, stock]) => {
        if (!active) return;
        setState(product ? { status: "ready", product, stock } : { status: "not_found" });
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

  const save = useCallback((input: pantryRepo.AddStockInput) => pantryRepo.addStock(db, input), [db]);

  return { state, retry, save };
}
