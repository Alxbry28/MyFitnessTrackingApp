import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import * as bodyProfileRepo from "../repositories/bodyProfileRepo";
import type { BmiScale, BodyProfile } from "../types/body";

type State = { status: "loading" } | { status: "ready"; profile: BodyProfile } | { status: "error" };

export function useBodyProfile() {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    bodyProfileRepo
      .get(db)
      .then((profile) => {
        if (active) setState({ status: "ready", profile });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [db, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  const save = useCallback(
    (profile: { heightCm: number; bmiScale: BmiScale }) => bodyProfileRepo.save(db, profile),
    [db],
  );

  return { state, retry, save };
}
