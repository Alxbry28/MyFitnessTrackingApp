import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import * as productRepo from "../repositories/productRepo";
import type { Product } from "../types/product";

type Status = "loading" | "ready" | "error";

export function useProducts() {
  const db = useSQLiteContext();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  // Typing fires overlapping searches; only the newest one may update state.
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const [rows, n] = await Promise.all([productRepo.search(db, query), productRepo.count(db)]);
      if (request !== latestRequest.current) return;
      setProducts(rows);
      setTotal(n);
      setStatus("ready");
    } catch {
      if (request !== latestRequest.current) return;
      setStatus("error");
    }
  }, [db, query]);

  // Runs on focus and again whenever the query changes, so returning from the
  // product form shows the saved change.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const retry = useCallback(() => {
    setStatus("loading");
    void load();
  }, [load]);

  return { query, setQuery, products, total, status, retry };
}
