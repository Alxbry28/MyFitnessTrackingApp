import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { workoutRepo } from "./workoutRepo";
import type {
  Equipment,
  MuscleGroup,
  RoutineInput,
  WorkoutRoutine,
  WorkoutRoutineExercise,
} from "../types/workouts";

type RoutineRow = {
  id: string;
  name: string;
  folder: string | null;
  created_at: string;
  updated_at: string;
};

type RoutineExerciseRow = {
  id: string;
  routine_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_reps: number | null;
  target_weight_kg: number | null;
  sets_data: string | null;
  ex_name: string;
  ex_muscle_group: MuscleGroup;
  ex_equipment: Equipment;
  ex_is_bodyweight: number;
  ex_guide_id: string | null;
  ex_created_at: string;
  ex_updated_at: string;
};

function parseSetsData(raw?: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fallback
  }
  return null;
}

export const routineRepo = {
  async listRoutines(db: SQLiteDatabase): Promise<WorkoutRoutine[]> {
    const routineRows = await db.getAllAsync<RoutineRow>(
      `SELECT * FROM workout_routines WHERE deleted_at IS NULL ORDER BY created_at ASC`,
    );

    const exRows = await db.getAllAsync<RoutineExerciseRow>(
      `SELECT re.*,
              e.name AS ex_name,
              e.muscle_group AS ex_muscle_group,
              e.equipment AS ex_equipment,
              e.is_bodyweight AS ex_is_bodyweight,
              e.guide_id AS ex_guide_id,
              e.created_at AS ex_created_at,
              e.updated_at AS ex_updated_at
       FROM workout_routine_exercises re
       JOIN exercises e ON e.id = re.exercise_id
       WHERE re.deleted_at IS NULL
       ORDER BY re.routine_id ASC, re.order_index ASC`,
    );

    const map = new Map<string, WorkoutRoutineExercise[]>();
    for (const r of exRows) {
      if (!map.has(r.routine_id)) {
        map.set(r.routine_id, []);
      }
      map.get(r.routine_id)!.push({
        id: r.id,
        routineId: r.routine_id,
        exerciseId: r.exercise_id,
        orderIndex: r.order_index,
        targetSets: r.target_sets ?? 3,
        targetReps: r.target_reps ?? 10,
        targetWeightKg: r.target_weight_kg ?? 0,
        setsData: parseSetsData(r.sets_data),
        exercise: {
          id: r.exercise_id,
          name: r.ex_name,
          muscleGroup: r.ex_muscle_group,
          equipment: r.ex_equipment,
          isBodyweight: r.ex_is_bodyweight === 1,
          guideId: r.ex_guide_id,
          createdAt: r.ex_created_at,
          updatedAt: r.ex_updated_at,
        },
      });
    }

    return routineRows.map((r) => ({
      id: r.id,
      name: r.name,
      folder: r.folder,
      exercises: map.get(r.id) ?? [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  async getRoutine(db: SQLiteDatabase, id: string): Promise<WorkoutRoutine | null> {
    const routineRow = await db.getFirstAsync<RoutineRow>(
      `SELECT * FROM workout_routines WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    if (!routineRow) return null;

    const exRows = await db.getAllAsync<RoutineExerciseRow>(
      `SELECT re.*,
              e.name AS ex_name,
              e.muscle_group AS ex_muscle_group,
              e.equipment AS ex_equipment,
              e.is_bodyweight AS ex_is_bodyweight,
              e.guide_id AS ex_guide_id,
              e.created_at AS ex_created_at,
              e.updated_at AS ex_updated_at
       FROM workout_routine_exercises re
       JOIN exercises e ON e.id = re.exercise_id
       WHERE re.routine_id = ? AND re.deleted_at IS NULL
       ORDER BY re.order_index ASC`,
      [id],
    );

    const exercises: WorkoutRoutineExercise[] = exRows.map((r) => ({
      id: r.id,
      routineId: r.routine_id,
      exerciseId: r.exercise_id,
      orderIndex: r.order_index,
      targetSets: r.target_sets ?? 3,
      targetReps: r.target_reps ?? 10,
      targetWeightKg: r.target_weight_kg ?? 0,
      setsData: parseSetsData(r.sets_data),
      exercise: {
        id: r.exercise_id,
        name: r.ex_name,
        muscleGroup: r.ex_muscle_group,
        equipment: r.ex_equipment,
        isBodyweight: r.ex_is_bodyweight === 1,
        guideId: r.ex_guide_id,
        createdAt: r.ex_created_at,
        updatedAt: r.ex_updated_at,
      },
    }));

    return {
      id: routineRow.id,
      name: routineRow.name,
      folder: routineRow.folder,
      exercises,
      createdAt: routineRow.created_at,
      updatedAt: routineRow.updated_at,
    };
  },

  async createRoutine(db: SQLiteDatabase, input: RoutineInput): Promise<string> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const items = input.exercises ?? (input.exerciseIds ?? []).map((exId) => ({
      exerciseId: exId,
      targetSets: 3,
      targetReps: 10,
      targetWeightKg: 0,
      setsData: undefined,
    }));

    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(
        `INSERT INTO workout_routines (id, name, folder, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [id, input.name.trim(), input.folder?.trim() || null, now, now],
      );

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const setsDataJson = item.setsData && item.setsData.length > 0 ? JSON.stringify(item.setsData) : null;
        await tx.runAsync(
          `INSERT INTO workout_routine_exercises (id, routine_id, exercise_id, order_index, target_sets, target_reps, target_weight_kg, sets_data, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            id,
            item.exerciseId,
            i,
            item.targetSets ?? 3,
            item.targetReps ?? 10,
            item.targetWeightKg ?? 0,
            setsDataJson,
            now,
            now,
          ],
        );
      }
    });

    return id;
  },

  async updateRoutine(db: SQLiteDatabase, id: string, input: RoutineInput): Promise<void> {
    const now = new Date().toISOString();

    const items = input.exercises ?? (input.exerciseIds ?? []).map((exId) => ({
      exerciseId: exId,
      targetSets: 3,
      targetReps: 10,
      targetWeightKg: 0,
      setsData: undefined,
    }));

    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(
        `UPDATE workout_routines SET name = ?, folder = ?, updated_at = ? WHERE id = ?`,
        [input.name.trim(), input.folder?.trim() || null, now, id],
      );

      // Delete existing exercises and reinsert in new order
      await tx.runAsync(`DELETE FROM workout_routine_exercises WHERE routine_id = ?`, [id]);

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const setsDataJson = item.setsData && item.setsData.length > 0 ? JSON.stringify(item.setsData) : null;
        await tx.runAsync(
          `INSERT INTO workout_routine_exercises (id, routine_id, exercise_id, order_index, target_sets, target_reps, target_weight_kg, sets_data, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            id,
            item.exerciseId,
            i,
            item.targetSets ?? 3,
            item.targetReps ?? 10,
            item.targetWeightKg ?? 0,
            setsDataJson,
            now,
            now,
          ],
        );
      }
    });
  },

  async deleteRoutine(db: SQLiteDatabase, id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(`UPDATE workout_routines SET deleted_at = ? WHERE id = ?`, [now, id]);
      await tx.runAsync(`UPDATE workout_routine_exercises SET deleted_at = ? WHERE routine_id = ?`, [now, id]);
    });
  },

  async startWorkoutFromRoutine(db: SQLiteDatabase, routineId: string): Promise<string> {
    const routine = await routineRepo.getRoutine(db, routineId);
    if (!routine) throw new Error("Routine not found");

    const sessionId = await workoutRepo.startSession(db, routine.name);

    // Preload each exercise in the routine's order_index with all configured target sets
    for (const re of routine.exercises) {
      if (re.setsData && re.setsData.length > 0) {
        for (let s = 0; s < re.setsData.length; s++) {
          const item = re.setsData[s]!;
          await workoutRepo.addSet(db, {
            sessionId,
            exerciseId: re.exercise.id,
            setNumber: s + 1,
            weightKg: item.weightKg ?? (re.exercise.isBodyweight ? 0 : 20),
            reps: item.reps ?? (re.exercise.isBodyweight ? 10 : 8),
            isWarmup: Boolean(item.isWarmup),
            isCompleted: false,
          });
        }
      } else {
        const setsCount = Math.max(1, re.targetSets || 1);
        const targetReps = re.targetReps ?? (re.exercise.isBodyweight ? 10 : 8);
        const targetWeight = re.targetWeightKg ?? (re.exercise.isBodyweight ? 0 : 20);

        for (let s = 1; s <= setsCount; s++) {
          await workoutRepo.addSet(db, {
            sessionId,
            exerciseId: re.exercise.id,
            setNumber: s,
            weightKg: targetWeight,
            reps: targetReps,
            isCompleted: false,
          });
        }
      }
    }

    return sessionId;
  },
};
