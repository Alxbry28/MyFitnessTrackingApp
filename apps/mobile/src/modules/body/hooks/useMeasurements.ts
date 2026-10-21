import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import { measurementRepo } from "../repositories/measurementRepo";
import {
  computeSiteDeltas,
  type WaistToHeightResult,
} from "../services/measurementCalc";
import type {
  MeasurementSession,
  SessionInput,
  SiteDelta,
} from "../types/measurements";

export function useMeasurements() {
  const db = useSQLiteContext();
  const [sessions, setSessions] = useState<MeasurementSession[]>([]);
  const [trackedSites, setTrackedSites] = useState<string[]>([]);
  const [waistToHeight, setWaistToHeight] = useState<WaistToHeightResult | null>(null);
  const [loading, setLoading] = useState(true);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const [list, sites, wth] = await Promise.all([
        measurementRepo.listSessions(db),
        measurementRepo.getTrackedSites(db),
        measurementRepo.getWaistToHeight(db),
      ]);

      if (request === latestRequest.current) {
        setSessions(list);
        setTrackedSites(sites);
        setWaistToHeight(wth);
        setLoading(false);
      }
    } catch {
      if (request === latestRequest.current) {
        setLoading(false);
      }
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const latestSession = sessions[0] ?? null;
  const previousSession = sessions[1] ?? null;
  const firstSession = sessions.length > 0 ? sessions[sessions.length - 1] ?? null : null;

  const deltas: SiteDelta[] = latestSession
    ? computeSiteDeltas(latestSession, previousSession, firstSession, trackedSites)
    : [];

  const saveSession = useCallback(
    async (input: SessionInput, existingId?: string) => {
      const id = await measurementRepo.saveSession(db, input, existingId);
      void load();
      return id;
    },
    [db, load],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      await measurementRepo.deleteSession(db, id);
      void load();
    },
    [db, load],
  );

  const saveSites = useCallback(
    async (keys: string[]) => {
      await measurementRepo.saveTrackedSites(db, keys);
      setTrackedSites(keys);
      void load();
    },
    [db, load],
  );

  return {
    sessions,
    latestSession,
    previousSession,
    firstSession,
    trackedSites,
    deltas,
    waistToHeight,
    loading,
    refresh: load,
    saveSession,
    deleteSession,
    saveTrackedSites: saveSites,
  };
}
