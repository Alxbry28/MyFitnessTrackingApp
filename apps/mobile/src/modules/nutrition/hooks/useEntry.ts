import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import * as foodLogRepo from "../repositories/foodLogRepo";
import type { EntryInput, FoodLogEntry } from "../types/foodLog";

type State =
  | { status: "loading" }
  | { status: "ready"; entry: FoodLogEntry }
  | { status: "not_found" }
  | { status: "error" };

export function useEntry(id: string) {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    foodLogRepo
      .findById(db, id)
      .then((entry) => {
        if (active) setState(entry ? { status: "ready", entry } : { status: "not_found" });
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
    async (input: EntryInput) => {
      const result = await foodLogRepo.update(db, id, input);
      return result.ok
        ? ({ ok: true } as const)
        : ({ ok: false, message: "This entry was deleted, so it couldn't be saved." } as const);
    },
    [db, id],
  );

  return { state, retry, save };
}
