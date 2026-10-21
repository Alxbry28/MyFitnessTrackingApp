import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import * as productRepo from "../repositories/productRepo";

type State =
  | { status: "loading" }
  | { status: "ready"; recent: productRepo.RecentProduct[] }
  | { status: "error" };

const RECENT_DAYS = 7;
// The quick-add sheet in prototypes/today.html lists four recent foods.
const RECENT_LIMIT = 4;

export function useQuickAdd() {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: "loading" });
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
    try {
      const recent = await productRepo.recentlyLogged(db, since, RECENT_LIMIT);
      if (request === latestRequest.current) setState({ status: "ready", recent });
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
