import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import { workoutRepo } from "../repositories/workoutRepo";
import type { SetInput, WorkoutSession } from "../types/workouts";

export function useActiveWorkout(specificSessionId?: string) {
  const db = useSQLiteContext();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const data = specificSessionId
        ? await workoutRepo.getSession(db, specificSessionId)
        : await workoutRepo.getActiveSession(db);

      if (request === latestRequest.current) {
        setSession(data);
        setLoading(false);
      }
    } catch {
      if (request === latestRequest.current) {
        setLoading(false);
      }
    }
  }, [db, specificSessionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const startWorkout = useCallback(
    async (name?: string): Promise<string> => {
      const id = await workoutRepo.startSession(db, name);
      void load();
      return id;
    },
    [db, load],
  );

  const addSet = useCallback(
    async (exerciseId: string) => {
      if (!session) return;
      const exGroup = session.exercises?.find((e) => e.exercise.id === exerciseId);
      const existingSets = exGroup?.sets ?? [];
      const lastSet = existingSets[existingSets.length - 1];

      const nextSetNumber = existingSets.length + 1;
      const reps = lastSet?.reps ?? (exGroup?.exercise.isBodyweight ? 10 : 8);
      const weightKg = lastSet?.weightKg ?? (exGroup?.exercise.isBodyweight ? 0 : 20);

      await workoutRepo.addSet(db, {
        sessionId: session.id,
        exerciseId,
        setNumber: nextSetNumber,
        reps,
        weightKg,
        isCompleted: true,
      });

      void load();
    },
    [db, session, load],
  );

  const updateSet = useCallback(
    async (setId: string, updates: Partial<SetInput>) => {
      await workoutRepo.updateSet(db, setId, updates);
      void load();
    },
    [db, load],
  );

  const deleteSet = useCallback(
    async (setId: string) => {
      await workoutRepo.deleteSet(db, setId);
      void load();
    },
    [db, load],
  );

  const finishWorkout = useCallback(
    async (notes?: string) => {
      if (!session) return;
      await workoutRepo.finishSession(db, session.id, notes);
      void load();
    },
    [db, session, load],
  );

  const updateName = useCallback(
    async (name: string) => {
      if (!session) return;
      await workoutRepo.updateSessionName(db, session.id, name);
      void load();
    },
    [db, session, load],
  );

  const updateNotes = useCallback(
    async (notes: string | null) => {
      if (!session) return;
      await workoutRepo.updateSessionNotes(db, session.id, notes);
      void load();
    },
    [db, session, load],
  );

  return {
    session,
    loading,
    refresh: load,
    startWorkout,
    addSet,
    updateSet,
    deleteSet,
    finishWorkout,
    updateName,
    updateNotes,
  };
}
