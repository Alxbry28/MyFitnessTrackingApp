import type { SQLiteDatabase } from "expo-sqlite";

const CALORIE_GOAL = "calorie_goal_kcal";

// A corrupt or non-numeric stored value reads as "no goal" instead of crashing Today.
function parseNumber(value: string): number | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function getCalorieGoal(db: SQLiteDatabase): Promise<number | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    CALORIE_GOAL,
  );
  return row ? parseNumber(row.value) : null;
}

export async function setCalorieGoal(db: SQLiteDatabase, kcal: number): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    CALORIE_GOAL,
    JSON.stringify(kcal),
    new Date().toISOString(),
  );
}
