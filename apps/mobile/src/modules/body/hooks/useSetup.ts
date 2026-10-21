import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import * as settingsRepo from "@/modules/nutrition/repositories/settingsRepo";

import * as bodyProfileRepo from "../repositories/bodyProfileRepo";
import * as setupRepo from "../repositories/setupRepo";
import * as weightRepo from "../repositories/weightRepo";
import { dailyValues } from "../services/weightCalc";
import type { SetupProfile } from "../types/body";

export type SetupPrefill = { profile: SetupProfile; units: settingsRepo.Units; latestKg: number | null };

type State = { status: "loading" } | { status: "ready"; prefill: SetupPrefill };

const EMPTY: SetupPrefill = {
  profile: { heightCm: null, bmiScale: "asia_pacific", sex: null, birthDate: null, activityLevel: null, goal: null },
  units: "metric",
  latestKg: null,
};

// Prefills from what's already saved; a read failure just starts the form empty.
export function useSetup() {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    Promise.all([bodyProfileRepo.getSetup(db), settingsRepo.getUnits(db), weightRepo.listLatestDay(db)])
      .then(([profile, units, latest]) => {
        if (active) setState({ status: "ready", prefill: { profile, units, latestKg: dailyValues(latest)[0]?.weightKg ?? null } });
      })
      .catch(() => {
        if (active) setState({ status: "ready", prefill: EMPTY });
      });
    return () => {
      active = false;
    };
  }, [db]);

  const finish = useCallback((input: setupRepo.FinishInput) => setupRepo.finishSetup(db, input), [db]);
  const skip = useCallback(() => settingsRepo.markSetupDone(db), [db]);

  return { state, finish, skip };
}
