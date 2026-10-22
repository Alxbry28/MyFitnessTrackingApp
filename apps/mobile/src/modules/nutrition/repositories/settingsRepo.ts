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

export const AI_API_KEY_SETTING = "ai_api_key";
const AI_PROVIDER = "ai_provider";
const AI_MODEL = "ai_model";
const AI_BASE_URL = "ai_base_url";

export type AiProvider = "gemini" | "groq" | "meta" | "openai" | "custom";

export const DEFAULT_AI_MODELS: Record<AiProvider, string> = {
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile",
  meta: "llama-3.3-70b-instruct",
  openai: "gpt-4o-mini",
  custom: "openai/gpt-4o-mini",
};

export const AI_MODEL_PRESETS: Record<AiProvider, string[]> = {
  gemini: [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-pro",
  ],
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
  ],
  meta: [
    "llama-3.3-70b-instruct",
    "llama-3.1-70b-instruct",
    "llama-3.1-8b-instruct",
    "llama-3.2-3b-instruct",
  ],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1-nano"],
  custom: [
    "openai/gpt-4o-mini",
    "google/gemini-2.5-flash",
    "anthropic/claude-3.5-haiku",
    "deepseek/deepseek-chat",
  ],
};

export const DEFAULT_CUSTOM_BASE_URL = "https://openrouter.ai/api/v1";

export type AiConfig = {
  provider: AiProvider;
  apiKey: string | null;
  model: string;
  baseUrl: string;
};

export async function getAiApiKey(db: SQLiteDatabase, provider?: AiProvider): Promise<string | null> {
  const activeProvider = await getAiProvider(db);
  const resolvedProvider = provider ?? activeProvider;
  const providerKey = `ai_api_key_${resolvedProvider}`;
  const providerVal = await getValue(db, providerKey);
  if (typeof providerVal === "string" && providerVal.trim()) {
    return providerVal.trim();
  }
  // Fallback to legacy global setting only if checking the active provider or legacy default "gemini"
  if (resolvedProvider === activeProvider || resolvedProvider === "gemini") {
    const val = await getValue(db, AI_API_KEY_SETTING);
    if (typeof val === "string" && val.trim()) {
      return val.trim();
    }
  }
  return null;
}

export async function setAiApiKey(db: SQLiteDatabase, key: string | null, provider?: AiProvider): Promise<void> {
  const clean = key ? key.trim() : null;
  const targetProvider = provider ?? (await getAiProvider(db));
  await setValue(db, AI_API_KEY_SETTING, clean);
  await setValue(db, `ai_api_key_${targetProvider}`, clean);
}

export async function getAiProvider(db: SQLiteDatabase): Promise<AiProvider> {
  const val = await getValue(db, AI_PROVIDER);
  if (val === "groq" || val === "meta" || val === "openai" || val === "custom") return val;
  return "gemini";
}

export async function setAiProvider(db: SQLiteDatabase, provider: AiProvider): Promise<void> {
  await setValue(db, AI_PROVIDER, provider);
}

export async function getAiModel(db: SQLiteDatabase, provider?: AiProvider): Promise<string> {
  const activeProvider = await getAiProvider(db);
  const resolvedProvider = provider ?? activeProvider;
  const providerKey = `ai_model_${resolvedProvider}`;
  const providerVal = await getValue(db, providerKey);
  if (typeof providerVal === "string" && providerVal.trim()) {
    return providerVal.trim();
  }
  if (resolvedProvider === activeProvider) {
    const val = await getValue(db, AI_MODEL);
    if (typeof val === "string" && val.trim()) {
      return val.trim();
    }
  }
  return DEFAULT_AI_MODELS[resolvedProvider];
}

export async function setAiModel(db: SQLiteDatabase, model: string | null, provider?: AiProvider): Promise<void> {
  const clean = model ? model.trim() : null;
  await setValue(db, AI_MODEL, clean);
  const targetProvider = provider ?? (await getAiProvider(db));
  await setValue(db, `ai_model_${targetProvider}`, clean);
}

export async function getAiBaseUrl(db: SQLiteDatabase): Promise<string> {
  const val = await getValue(db, AI_BASE_URL);
  return typeof val === "string" && val.trim() ? val.trim() : DEFAULT_CUSTOM_BASE_URL;
}

export async function setAiBaseUrl(db: SQLiteDatabase, baseUrl: string | null): Promise<void> {
  await setValue(db, AI_BASE_URL, baseUrl ? baseUrl.trim() : null);
}

export async function getAiConfig(db: SQLiteDatabase): Promise<AiConfig> {
  const provider = await getAiProvider(db);
  const [apiKey, model, baseUrl] = await Promise.all([
    getAiApiKey(db, provider),
    getAiModel(db, provider),
    getAiBaseUrl(db),
  ]);
  return { provider, apiKey, model, baseUrl };
}
