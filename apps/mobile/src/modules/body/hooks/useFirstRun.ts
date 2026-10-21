import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";

import * as settingsRepo from "@/modules/nutrition/repositories/settingsRepo";

// Once per app run, so backing out of the welcome screen doesn't bounce straight back in.
let checked = false;

// Opens setup on a phone that has neither a calorie goal nor a finished or skipped setup.
export function useFirstRun() {
  const db = useSQLiteContext();

  useEffect(() => {
    if (checked) return;
    checked = true;
    Promise.all([settingsRepo.getCalorieGoal(db), settingsRepo.isSetupDone(db)])
      .then(([goal, done]) => {
        if (goal === null && !done) router.push("/setup");
      })
      .catch(() => {
        // Today still works without setup; the Settings link stays available.
      });
  }, [db]);
}
