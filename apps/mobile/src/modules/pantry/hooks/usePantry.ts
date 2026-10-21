import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import * as pantryRepo from "../repositories/pantryRepo";
import { inStock } from "../services/pantryStock";
import type { PantryStock } from "../types/pantry";

type State = { status: "loading" } | { status: "ready"; items: PantryStock[] } | { status: "error" };

// Reloads on focus, so a buy recorded on the add screen shows when you come back.
export function usePantry() {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: "loading" });
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const items = (await pantryRepo.listStock(db)).filter(inStock);
      if (request === latestRequest.current) setState({ status: "ready", items });
    } catch {
      if (request === latestRequest.current) setState({ status: "error" });
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  return { state, retry };
}
