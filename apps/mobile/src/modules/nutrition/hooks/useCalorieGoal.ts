import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import * as settingsRepo from "../repositories/settingsRepo";

type State = { status: "loading" } | { status: "ready"; goal: number | null } | { status: "error" };

export function useCalorieGoal() {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: "loading" });
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const goal = await settingsRepo.getCalorieGoal(db);
      if (request === latestRequest.current) setState({ status: "ready", goal });
    } catch {
      if (request === latestRequest.current) setState({ status: "error" });
    }
  }, [db]);

  // Reloads on focus so Today picks up a goal saved in Settings.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  // State isn't updated here: the Settings form is keyed on the loaded goal, so a
  // remount would wipe its "Saved" notice. The next focus reload picks it up.
  const save = useCallback((kcal: number) => settingsRepo.setCalorieGoal(db, kcal), [db]);

  return { state, retry, save };
}
