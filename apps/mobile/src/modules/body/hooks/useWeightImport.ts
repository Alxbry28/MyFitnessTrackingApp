import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import * as weightRepo from "../repositories/weightRepo";
import { pickWeightCsv } from "../services/importWeights";
import { parseWeightCsv, planImport, type ImportPlan } from "../services/weightCsv";
import type { ImportRun } from "../types/body";

export type Preview = { fileName: string; plan: ImportPlan; unreadable: number };

type Phase = "idle" | "busy" | "preview";

const PARSE_ERRORS = {
  empty: "That file is empty or isn't a CSV.",
  no_columns: "That file has no time and weight columns.",
} as const;

export function useWeightImport() {
  const db = useSQLiteContext();
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<ImportRun | null>(null);

  const loadLastRun = useCallback(async () => {
    try {
      setLastRun(await weightRepo.lastImportRun(db));
    } catch {
      setLastRun(null);
    }
  }, [db]);

  useEffect(() => {
    let active = true;
    weightRepo
      .lastImportRun(db)
      .then((run) => {
        if (active) setLastRun(run);
      })
      .catch(() => {
        if (active) setLastRun(null);
      });
    return () => {
      active = false;
    };
  }, [db]);

  const choose = useCallback(async () => {
    setError(null);
    setNotice(null);
    setPhase("busy");
    try {
      const picked = await pickWeightCsv();
      if (picked.kind === "canceled") {
        setPhase(preview ? "preview" : "idle");
        return;
      }
      if (picked.kind === "too_big") {
        setError("That file is too big (over 5 MB).");
        setPreview(null);
        setPhase("idle");
        return;
      }
      const parsed = parseWeightCsv(picked.text, new Date());
      if (!parsed.ok) {
        setError(PARSE_ERRORS[parsed.error]);
        setPreview(null);
        setPhase("idle");
        return;
      }
      const existing = await weightRepo.listAll(db);
      setPreview({ fileName: picked.name, plan: planImport(parsed.readings, existing), unreadable: parsed.unreadable });
      setPhase("preview");
    } catch {
      setError("Couldn't read that file.");
      setPreview(null);
      setPhase("idle");
    }
  }, [db, preview]);

  const cancel = useCallback(() => {
    setPreview(null);
    setPhase("idle");
  }, []);

  const confirm = useCallback(async () => {
    if (!preview) return;
    setError(null);
    setPhase("busy");
    try {
      const added = await weightRepo.importReadings(db, preview.fileName, preview.plan);
      setNotice(`Imported ${added} weigh-ins`);
      setPreview(null);
      setPhase("idle");
      await loadLastRun();
    } catch {
      setError("Couldn't import. Nothing was saved.");
      setPhase("preview");
    }
  }, [db, preview, loadLastRun]);

  const undo = useCallback(async () => {
    if (!lastRun) return;
    setError(null);
    setNotice(null);
    setPhase("busy");
    try {
      await weightRepo.undoImport(db, lastRun.id);
      setNotice(`Removed ${lastRun.added} imported weigh-ins`);
      await loadLastRun();
    } catch {
      setError("Couldn't undo the import. Try again.");
    }
    setPhase(preview ? "preview" : "idle");
  }, [db, lastRun, preview, loadLastRun]);

  return { phase, preview, error, notice, lastRun, choose, cancel, confirm, undo };
}
