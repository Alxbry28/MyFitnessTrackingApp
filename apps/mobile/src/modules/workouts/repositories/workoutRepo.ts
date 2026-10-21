import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { exerciseRepo } from "./exerciseRepo";
import {
  calculateDurationMinutes,
  calculateTotalVolume,
} from "../services/workoutCalc";
import type {
  Equipment,
  Exercise,
  MuscleGroup,
  SessionExercise,
  SetInput,
  WorkoutSession,
  WorkoutSet,
} from "../types/workouts";

type SessionRow = {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type SetWithExerciseRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_sec: number | null;
  rpe: number | null;
  is_warmup: number;
  is_completed: number;
  created_at: string;
  updated_at: string;
  // Exercise columns
  ex_name: string;
  ex_muscle_group: MuscleGroup;
  ex_equipment: Equipment;
  ex_is_bodyweight: number;
  ex_guide_id: string | null;
  ex_created_at: string;
  ex_updated_at: string;
};

export const workoutRepo = {
  async startSession(db: SQLiteDatabase, name = "Workout"): Promise<string> {
    const id = randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO workout_sessions (id, name, started_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name.trim() || "Workout", now, now, now],
    );

    return id;
  },

  async getActiveSession(db: SQLiteDatabase): Promise<WorkoutSession | null> {
    const row = await db.getFirstAsync<SessionRow>(
      `SELECT * FROM workout_sessions
       WHERE ended_at IS NULL AND deleted_at IS NULL
       ORDER BY started_at DESC LIMIT 1`,
    );

    if (!row) return null;
    return workoutRepo.getSession(db, row.id);
  },

  async getSession(db: SQLiteDatabase, sessionId: string): Promise<WorkoutSession | null> {
    const row = await db.getFirstAsync<SessionRow>(
      "SELECT * FROM workout_sessions WHERE id = ? AND deleted_at IS NULL",
      [sessionId],
    );

    if (!row) return null;

    const setRows = await db.getAllAsync<SetWithExerciseRow>(
      `SELECT ws.*,
              e.name AS ex_name,
              e.muscle_group AS ex_muscle_group,
              e.equipment AS ex_equipment,
              e.is_bodyweight AS ex_is_bodyweight,
              e.guide_id AS ex_guide_id,
              e.created_at AS ex_created_at,
              e.updated_at AS ex_updated_at
       FROM workout_sets ws
       JOIN exercises e ON e.id = ws.exercise_id
       WHERE ws.session_id = ? AND ws.deleted_at IS NULL
       ORDER BY ws.created_at ASC, ws.set_number ASC`,
      [sessionId],
    );

    // Group sets by exercise
    const exerciseMap = new Map<string, { exercise: Exercise; sets: WorkoutSet[] }>();

    for (const r of setRows) {
      if (!exerciseMap.has(r.exercise_id)) {
        exerciseMap.set(r.exercise_id, {
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
          sets: [],
        });
      }

      exerciseMap.get(r.exercise_id)!.sets.push({
        id: r.id,
        sessionId: r.session_id,
        exerciseId: r.exercise_id,
        setNumber: r.set_number,
        reps: r.reps,
        weightKg: r.weight_kg,
        durationSec: r.duration_sec,
        rpe: r.rpe,
        isWarmup: r.is_warmup === 1,
        isCompleted: r.is_completed === 1,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      });
    }

    // Attach previous performance hints
    const exercises: SessionExercise[] = [];
    for (const item of exerciseMap.values()) {
      const prev = await exerciseRepo.getPreviousPerformance(db, item.exercise.id, sessionId);
      exercises.push({
        exercise: item.exercise,
        previousText: prev.text,
        sets: item.sets,
      });
    }

    const allSets = setRows.map((r) => ({
      weightKg: r.weight_kg,
      reps: r.reps,
      isWarmup: r.is_warmup === 1,
      isCompleted: r.is_completed === 1,
    }));

    return {
      id: row.id,
      name: row.name,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      exercises,
      durationMinutes: calculateDurationMinutes(row.started_at, row.ended_at),
      totalVolumeKg: calculateTotalVolume(allSets),
      totalSets: allSets.filter((s) => s.isCompleted).length,
    };
  },

  async addSet(db: SQLiteDatabase, input: SetInput): Promise<WorkoutSet> {
    const id = randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO workout_sets (
        id, session_id, exercise_id, set_number, reps, weight_kg, duration_sec, rpe, is_warmup, is_completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.sessionId,
        input.exerciseId,
        input.setNumber,
        input.reps ?? null,
        input.weightKg ?? null,
        input.durationSec ?? null,
        input.rpe ?? null,
        input.isWarmup ? 1 : 0,
        input.isCompleted !== false ? 1 : 0,
        now,
        now,
      ],
    );

    return {
      id,
      sessionId: input.sessionId,
      exerciseId: input.exerciseId,
      setNumber: input.setNumber,
      reps: input.reps,
      weightKg: input.weightKg,
      durationSec: input.durationSec,
      rpe: input.rpe,
      isWarmup: Boolean(input.isWarmup),
      isCompleted: input.isCompleted !== false,
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateSet(
    db: SQLiteDatabase,
    setId: string,
    updates: Partial<SetInput>,
  ): Promise<void> {
    const now = new Date().toISOString();
    const fields: string[] = ["updated_at = ?"];
    const values: (string | number | null)[] = [now];

    if (updates.reps !== undefined) {
      fields.push("reps = ?");
      values.push(updates.reps);
    }
    if (updates.weightKg !== undefined) {
      fields.push("weight_kg = ?");
      values.push(updates.weightKg);
    }
    if (updates.durationSec !== undefined) {
      fields.push("duration_sec = ?");
      values.push(updates.durationSec);
    }
    if (updates.rpe !== undefined) {
      fields.push("rpe = ?");
      values.push(updates.rpe);
    }
    if (updates.isWarmup !== undefined) {
      fields.push("is_warmup = ?");
      values.push(updates.isWarmup ? 1 : 0);
    }
    if (updates.isCompleted !== undefined) {
      fields.push("is_completed = ?");
      values.push(updates.isCompleted ? 1 : 0);
    }
    if (updates.setNumber !== undefined) {
      fields.push("set_number = ?");
      values.push(updates.setNumber);
    }

    values.push(setId);
    await db.runAsync(`UPDATE workout_sets SET ${fields.join(", ")} WHERE id = ?`, values);
  },

  async deleteSet(db: SQLiteDatabase, setId: string): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync("UPDATE workout_sets SET deleted_at = ? WHERE id = ?", [now, setId]);
  },

  async finishSession(db: SQLiteDatabase, sessionId: string, notes?: string): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(
      "UPDATE workout_sessions SET ended_at = ?, notes = COALESCE(?, notes), updated_at = ? WHERE id = ?",
      [now, notes ?? null, now, sessionId],
    );
  },

  async deleteSession(db: SQLiteDatabase, sessionId: string): Promise<void> {
    const now = new Date().toISOString();
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync("UPDATE workout_sessions SET deleted_at = ? WHERE id = ?", [now, sessionId]);
      await tx.runAsync("UPDATE workout_sets SET deleted_at = ? WHERE session_id = ?", [now, sessionId]);
    });
  },

  async updateSessionName(db: SQLiteDatabase, sessionId: string, name: string): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(
      "UPDATE workout_sessions SET name = ?, updated_at = ? WHERE id = ?",
      [name.trim(), now, sessionId],
    );
  },

  async updateSessionNotes(db: SQLiteDatabase, sessionId: string, notes: string | null): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(
      "UPDATE workout_sessions SET notes = ?, updated_at = ? WHERE id = ?",
      [notes, now, sessionId],
    );
  },

  async listHistory(db: SQLiteDatabase, limit = 50): Promise<WorkoutSession[]> {
    const rows = await db.getAllAsync<SessionRow>(
      `SELECT * FROM workout_sessions
       WHERE ended_at IS NOT NULL AND deleted_at IS NULL
       ORDER BY started_at DESC LIMIT ?`,
      [limit],
    );

    const result: WorkoutSession[] = [];
    for (const r of rows) {
      const session = await workoutRepo.getSession(db, r.id);
      if (session) result.push(session);
    }
    return result;
  },

  async getTodaySession(db: SQLiteDatabase, dayIsoPrefix?: string): Promise<WorkoutSession | null> {
    const prefix = dayIsoPrefix ?? new Date().toISOString().slice(0, 10);
    const row = await db.getFirstAsync<SessionRow>(
      `SELECT * FROM workout_sessions
       WHERE started_at LIKE ? AND deleted_at IS NULL
       ORDER BY started_at DESC LIMIT 1`,
      [`${prefix}%`],
    );

    if (!row) return null;
    return workoutRepo.getSession(db, row.id);
  },
};
