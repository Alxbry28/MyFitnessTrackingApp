import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import * as pantryRepo from "@/modules/pantry/repositories/pantryRepo";
import { inStock } from "@/modules/pantry/services/pantryStock";
import type { PantryStock } from "@/modules/pantry/types/pantry";

import * as productRepo from "../repositories/productRepo";
import type { Product } from "../types/product";

type Results = {
  products: Product[];
  total: number;
  lastGrams: Map<string, number>;
  pantry: PantryStock[];
};

type State = { status: "loading" } | ({ status: "ready" } & Results) | { status: "error" };

// Add food's three sources for one query: in-stock pantry items, library matches and last grams.
export function useFoodSearch(withPantry: boolean) {
  const db = useSQLiteContext();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ status: "loading" });
  // Typing fires overlapping searches; only the newest one may update state.
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const [products, total, lastGrams, stock] = await Promise.all([
        productRepo.search(db, query),
        productRepo.count(db),
        productRepo.lastGramsByProduct(db),
        withPantry ? pantryRepo.listStock(db) : Promise.resolve([]),
      ]);
      if (request !== latestRequest.current) return;
      const q = query.trim().toLowerCase();
      const pantry = stock.filter((item) => inStock(item) && item.name.toLowerCase().includes(q));
      setState({ status: "ready", products, total, lastGrams, pantry });
    } catch {
      if (request === latestRequest.current) setState({ status: "error" });
    }
  }, [db, query, withPantry]);

  // Runs on focus and on every query change, so a product saved meanwhile shows up.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  return { query, setQuery, state, retry };
}
