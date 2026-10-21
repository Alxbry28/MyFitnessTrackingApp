import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import * as pantryRepo from "../repositories/pantryRepo";
import type { RemoveReason, PantryStock, StockMovement } from "../types/pantry";

type State =
  | { status: "loading" }
  // drainedSamples: whole units behind the usual drained weight, for "avg of N".
  | { status: "ready"; item: PantryStock; movements: StockMovement[]; drainedSamples: number }
  | { status: "not_found" }
  | { status: "error" };

// Reloads on focus, so a portion logged on the next screen shows when you come back.
export function usePantryItem(id: string) {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: "loading" });
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const [item, movements] = await Promise.all([pantryRepo.findItem(db, id), pantryRepo.listMovements(db, id)]);
      const drainedSamples =
        item?.drained && item.productId ? await pantryRepo.drainedSampleCount(db, item.productId) : 0;
      if (request !== latestRequest.current) return;
      setState(item ? { status: "ready", item, movements, drainedSamples } : { status: "not_found" });
    } catch {
      if (request === latestRequest.current) setState({ status: "error" });
    }
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  const remove = useCallback(
    async (reason: RemoveReason, grams: number) => {
      await pantryRepo.removeStock(db, { itemId: id, reason, grams });
      await load();
    },
    [db, id, load],
  );

  const adjust = useCallback(
    async (actualGrams: number) => {
      await pantryRepo.adjustStock(db, { itemId: id, actualGrams });
      await load();
    },
    [db, id, load],
  );

  return { state, retry, remove, adjust };
}
