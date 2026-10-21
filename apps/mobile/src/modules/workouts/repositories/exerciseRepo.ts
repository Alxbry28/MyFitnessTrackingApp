import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { formatPreviousPerformance, type SetPerformance } from "../services/workoutCalc";
import type { Equipment, Exercise, ExerciseInput, MuscleGroup } from "../types/workouts";

type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  is_bodyweight: number;
  guide_id: string | null;
  created_at: string;
  updated_at: string;
};

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    isBodyweight: row.is_bodyweight === 1,
    guideId: row.guide_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const exerciseRepo = {
  async list(
    db: SQLiteDatabase,
    filter?: { search?: string; muscleGroup?: MuscleGroup },
  ): Promise<Exercise[]> {
    let sql = "SELECT * FROM exercises WHERE deleted_at IS NULL";
    const params: (string | number)[] = [];

    if (filter?.muscleGroup) {
      sql += " AND muscle_group = ?";
      params.push(filter.muscleGroup);
    }
    if (filter?.search?.trim()) {
      sql += " AND name LIKE ? COLLATE NOCASE";
      params.push(`%${filter.search.trim()}%`);
    }

    sql += " ORDER BY name COLLATE NOCASE ASC";

    const rows = await db.getAllAsync<ExerciseRow>(sql, params);
    return rows.map(toExercise);
  },

  async get(db: SQLiteDatabase, id: string): Promise<Exercise | null> {
    const row = await db.getFirstAsync<ExerciseRow>(
      "SELECT * FROM exercises WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    return row ? toExercise(row) : null;
  },

  async create(db: SQLiteDatabase, input: ExerciseInput): Promise<Exercise> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const isBw = input.isBodyweight ? 1 : 0;

    await db.runAsync(
      `INSERT INTO exercises (id, name, muscle_group, equipment, is_bodyweight, guide_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
      [id, input.name.trim(), input.muscleGroup, input.equipment, isBw, now, now],
    );

    return {
      id,
      name: input.name.trim(),
      muscleGroup: input.muscleGroup,
      equipment: input.equipment,
      isBodyweight: Boolean(input.isBodyweight),
      guideId: null,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getPreviousPerformance(
    db: SQLiteDatabase,
    exerciseId: string,
    excludeSessionId?: string,
  ): Promise<{ sets: SetPerformance[]; text: string }> {
    // Find the latest completed workout session that has sets for this exercise
    let sessionSql = `
      SELECT s.id
      FROM workout_sessions s
      JOIN workout_sets ws ON ws.session_id = s.id AND ws.deleted_at IS NULL
      WHERE ws.exercise_id = ?
        AND s.ended_at IS NOT NULL
        AND s.deleted_at IS NULL
    `;
    const sessionParams: string[] = [exerciseId];

    if (excludeSessionId) {
      sessionSql += " AND s.id <> ?";
      sessionParams.push(excludeSessionId);
    }

    sessionSql += " ORDER BY s.started_at DESC LIMIT 1";

    const prevSession = await db.getFirstAsync<{ id: string }>(sessionSql, sessionParams);

    if (!prevSession) {
      return { sets: [], text: "First time logging this exercise" };
    }

    // Get the sets for that session
    const setRows = await db.getAllAsync<{
      weight_kg: number | null;
      reps: number | null;
      is_warmup: number;
      is_bodyweight: number;
    }>(
      `SELECT ws.weight_kg, ws.reps, ws.is_warmup, e.is_bodyweight
       FROM workout_sets ws
       JOIN exercises e ON e.id = ws.exercise_id
       WHERE ws.session_id = ? AND ws.exercise_id = ? AND ws.deleted_at IS NULL
       ORDER BY ws.set_number ASC`,
      [prevSession.id, exerciseId],
    );

    const sets: SetPerformance[] = setRows.map((r) => ({
      weightKg: r.weight_kg,
      reps: r.reps,
      isBodyweight: r.is_bodyweight === 1,
      isWarmup: r.is_warmup === 1,
    }));

    const text = formatPreviousPerformance(sets);
    return { sets, text: `Last: ${text}` };
  },
};
