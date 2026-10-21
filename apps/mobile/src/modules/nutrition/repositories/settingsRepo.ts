import type { SQLiteDatabase } from "expo-sqlite";

const CALORIE_GOAL = "calorie_goal_kcal";
const UNITS = "units";
const SETUP_DONE = "setup_done";

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

async function setValue(db: SQLiteDatabase, key: string, value: unknown): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    JSON.stringify(value),
    new Date().toISOString(),
  );
}

async function getValue(db: SQLiteDatabase, key: string): Promise<unknown> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = ?", key);
  if (!row) return null;
  try {
    return JSON.parse(row.value) as unknown;
  } catch {
    return null;
  }
}

export async function setCalorieGoal(db: SQLiteDatabase, kcal: number): Promise<void> {
  await setValue(db, CALORIE_GOAL, kcal);
}

export type Units = "metric" | "imperial";

// The units chosen in setup; the rest of the app still shows kg and cm.
export async function getUnits(db: SQLiteDatabase): Promise<Units> {
  return (await getValue(db, UNITS)) === "imperial" ? "imperial" : "metric";
}

export async function setUnits(db: SQLiteDatabase, units: Units): Promise<void> {
  await setValue(db, UNITS, units);
}

export async function isSetupDone(db: SQLiteDatabase): Promise<boolean> {
  return (await getValue(db, SETUP_DONE)) === true;
}

export async function markSetupDone(db: SQLiteDatabase): Promise<void> {
  await setValue(db, SETUP_DONE, true);
}

const AI_API_KEY = "ai_api_key";
const AI_PROVIDER = "ai_provider";

export type AiProvider = "gemini" | "openai";

export async function getAiApiKey(db: SQLiteDatabase): Promise<string | null> {
  const val = await getValue(db, AI_API_KEY);
  return typeof val === "string" && val.trim() ? val.trim() : null;
}

export async function setAiApiKey(db: SQLiteDatabase, key: string | null): Promise<void> {
  await setValue(db, AI_API_KEY, key ? key.trim() : null);
}

export async function getAiProvider(db: SQLiteDatabase): Promise<AiProvider> {
  const val = await getValue(db, AI_PROVIDER);
  return val === "openai" ? "openai" : "gemini";
}

export async function setAiProvider(db: SQLiteDatabase, provider: AiProvider): Promise<void> {
  await setValue(db, AI_PROVIDER, provider);
}

