import type { SQLiteDatabase } from "expo-sqlite";

import { getCalorieGoal } from "@/modules/nutrition/repositories/settingsRepo";


type FoodRow = {
  day: string;
  total_kcal: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fat: number | null;
};

type WeightRow = {
  day: string;
  weight_kg: number;
};

type MeasurementRow = {
  day: string;
  count: number;
};

type WorkoutRow = {
  day: string;
  name: string;
};

type BatchRow = {
  day: string;
  name: string;
};

type MovementRow = {
  day: string;
  count: number;
};

export type RawMonthData = {
  monthKey: string;
  targetKcal: number;
  foodByDay: Map<string, FoodRow>;
  weightByDay: Map<string, number>;
  measurementsByDay: Set<string>;
  workoutsByDay: Map<string, string[]>;
  cookingByDay: Map<string, string[]>;
  pantryByDay: Map<string, number>;
};

export const calendarRepo = {
  async getMonthData(db: SQLiteDatabase, year: number, month: number): Promise<RawMonthData> {
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const monthKey = `${year}-${monthStr}`;

    const daysInMonth = new Date(year, month, 0).getDate();
    const startDay = `${monthKey}-01`;
    const endDay = `${monthKey}-${daysInMonth < 10 ? `0${daysInMonth}` : `${daysInMonth}`}`;

    const targetKcal = (await getCalorieGoal(db)) ?? 2000;

    // 1. Food log entries
    const foodRows = await db.getAllAsync<FoodRow>(
      `SELECT day,
              ROUND(SUM(kcal)) AS total_kcal,
              ROUND(SUM(protein_g), 1) AS total_protein,
              ROUND(SUM(carbs_g), 1) AS total_carbs,
              ROUND(SUM(fat_g), 1) AS total_fat
       FROM food_log_entries
       WHERE day >= ? AND day <= ? AND deleted_at IS NULL
       GROUP BY day`,
      [startDay, endDay],
    );
    const foodByDay = new Map<string, FoodRow>();
    for (const r of foodRows) {
      foodByDay.set(r.day, r);
    }

    // 2. Weights
    const weightRows = await db.getAllAsync<WeightRow>(
      `SELECT day, weight_kg
       FROM body_weight_entries
       WHERE day >= ? AND day <= ? AND deleted_at IS NULL
       ORDER BY measured_at ASC`,
      [startDay, endDay],
    );
    const weightByDay = new Map<string, number>();
    for (const r of weightRows) {
      weightByDay.set(r.day, r.weight_kg);
    }

    // 3. Measurements
    const measurementRows = await db.getAllAsync<MeasurementRow>(
      `SELECT measured_on AS day, count(*) AS count
       FROM measurement_sessions
       WHERE measured_on >= ? AND measured_on <= ? AND deleted_at IS NULL
       GROUP BY measured_on`,
      [startDay, endDay],
    );
    const measurementsByDay = new Set<string>();
    for (const r of measurementRows) {
      measurementsByDay.add(r.day);
    }

    // 4. Workouts
    const workoutRows = await db.getAllAsync<WorkoutRow>(
      `SELECT substr(started_at, 1, 10) AS day, name
       FROM workout_sessions
       WHERE substr(started_at, 1, 10) >= ? AND substr(started_at, 1, 10) <= ? AND deleted_at IS NULL`,
      [startDay, endDay],
    );
    const workoutsByDay = new Map<string, string[]>();
    for (const r of workoutRows) {
      const arr = workoutsByDay.get(r.day) ?? [];
      arr.push(r.name);
      workoutsByDay.set(r.day, arr);
    }

    // 5. Cooking batches
    const batchRows = await db.getAllAsync<BatchRow>(
      `SELECT substr(cooked_at, 1, 10) AS day, name
       FROM batches
       WHERE substr(cooked_at, 1, 10) >= ? AND substr(cooked_at, 1, 10) <= ? AND deleted_at IS NULL`,
      [startDay, endDay],
    );
    const cookingByDay = new Map<string, string[]>();
    for (const r of batchRows) {
      const arr = cookingByDay.get(r.day) ?? [];
      arr.push(r.name);
      cookingByDay.set(r.day, arr);
    }

    // 6. Pantry stock movements
    const movementRows = await db.getAllAsync<MovementRow>(
      `SELECT substr(occurred_at, 1, 10) AS day, count(*) AS count
       FROM stock_movements
       WHERE substr(occurred_at, 1, 10) >= ? AND substr(occurred_at, 1, 10) <= ? AND deleted_at IS NULL
       GROUP BY substr(occurred_at, 1, 10)`,
      [startDay, endDay],
    );
    const pantryByDay = new Map<string, number>();
    for (const r of movementRows) {
      pantryByDay.set(r.day, r.count);
    }

    return {
      monthKey,
      targetKcal,
      foodByDay,
      weightByDay,
      measurementsByDay,
      workoutsByDay,
      cookingByDay,
      pantryByDay,
    };
  },
};
