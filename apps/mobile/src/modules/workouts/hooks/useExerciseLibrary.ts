import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import { exerciseRepo } from "../repositories/exerciseRepo";
import type { Exercise, ExerciseInput, MuscleGroup } from "../types/workouts";

export function useExerciseLibrary() {
  const db = useSQLiteContext();
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | undefined>(undefined);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const list = await exerciseRepo.list(db, { search, muscleGroup });
      if (request === latestRequest.current) {
        setExercises(list);
        setLoading(false);
      }
    } catch {
      if (request === latestRequest.current) {
        setLoading(false);
      }
    }
  }, [db, search, muscleGroup]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const createExercise = useCallback(
    async (input: ExerciseInput): Promise<Exercise> => {
      const created = await exerciseRepo.create(db, input);
      void load();
      return created;
    },
    [db, load],
  );

  return {
    search,
    setSearch,
    muscleGroup,
    setMuscleGroup,
    exercises,
    loading,
    refresh: load,
    createExercise,
  };
}
