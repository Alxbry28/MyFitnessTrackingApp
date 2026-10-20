import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import * as productRepo from "../repositories/productRepo";
import type { Product, ProductInput } from "../types/product";

type State =
  | { status: "loading" }
  | { status: "ready"; product: Product | null }
  | { status: "not_found" }
  | { status: "error" };

// Loads one product for the form. id "new" means create mode with nothing to load.
export function useProduct(id: string) {
  const db = useSQLiteContext();
  const isNew = id === "new";
  const [state, setState] = useState<State>(
    isNew ? { status: "ready", product: null } : { status: "loading" },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isNew) return;
    let active = true;
    productRepo
      .findById(db, id)
      .then((product) => {
        if (active) setState(product ? { status: "ready", product } : { status: "not_found" });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [db, id, isNew, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  const save = useCallback(
    (input: ProductInput) =>
      isNew ? productRepo.create(db, input) : productRepo.update(db, id, input),
    [db, id, isNew],
  );

  return { isNew, state, retry, save };
}
