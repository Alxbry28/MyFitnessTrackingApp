import {
  DEFAULT_AI_MODELS,
  DEFAULT_CUSTOM_BASE_URL,
  type AiProvider,
} from "../repositories/settingsRepo";
import type { MealType } from "../types/foodLog";

export type ParsedAiFoodItem = {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export type ParsedAiMeal = {
  mealType: MealType;
  label: string;
  items: ParsedAiFoodItem[];
};

export type AiMealParseResult = {
  meals: ParsedAiMeal[];
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
};

const SYSTEM_PROMPT = `You are a nutrition expert and nutritional calculator for a fitness tracking app.
The user will provide a text log of their meals with portions (grams, ml, scoops, or standard servings).

TASK:
1. Parse every meal heading (e.g., Breakfast, Lunch, Dinner, Snacks, Pre-Workout, Post-Workout).
   - Map Breakfast -> "breakfast"
   - Map Lunch -> "lunch"
   - Map Dinner -> "dinner"
   - Map Snacks, Pre-Workout, Post-Workout, or anything else -> "snacks"
2. For each food item, identify the exact food and portion in grams (1 ml = 1 g).
3. Provide accurate nutritional values using authoritative databases (USDA, reliable nutritional data, and regional/Filipino food databases like FNRI for taho, sinigang, adobo, etc.).
4. Return both the total calories/macros for the given portion AND the per-100g values.
5. Return ONLY a single valid JSON object matching this exact schema:

{
  "meals": [
    {
      "mealType": "breakfast" | "lunch" | "dinner" | "snacks",
      "label": "Breakfast",
      "items": [
        {
          "name": "Taho",
          "grams": 220,
          "calories": 187,
          "protein": 5.5,
          "carbs": 33.0,
          "fat": 3.3,
          "kcalPer100g": 85,
          "proteinPer100g": 2.5,
          "carbsPer100g": 15.0,
          "fatPer100g": 1.5
        }
      ]
    }
  ]
}

No extra text, no markdown backticks, only valid JSON.`;

export function resolveEndpointUrl(provider: AiProvider, model: string, baseUrl?: string): string {
  if (provider === "gemini") {
    const cleanModel = model.replace(/^models\//, "");
    return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`;
  }
  if (provider === "groq") {
    return "https://api.groq.com/openai/v1/chat/completions";
  }
  if (provider === "meta") {
    return "https://api.meta.ai/v1/chat/completions";
  }
  const root = (
    provider === "custom" && baseUrl?.trim()
      ? baseUrl.trim()
      : provider === "custom"
        ? DEFAULT_CUSTOM_BASE_URL
        : "https://api.openai.com/v1"
  ).replace(/\/+$/, "");
  return root.endsWith("/chat/completions") ? root : `${root}/chat/completions`;
}

export function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

export type AvailableAiModel = {
  id: string;
  name: string;
  description?: string;
  isRecommended?: boolean;
};

export async function fetchAvailableAiModels(params: {
  provider: AiProvider;
  apiKey: string;
  baseUrl?: string;
}): Promise<AvailableAiModel[]> {
  const { provider, apiKey } = params;
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error("Please paste an API key first.");
  }

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmedKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errBody = await res.text();
      let extractedMsg = errBody;
      try {
        const json = JSON.parse(errBody);
        if (json.error?.message) extractedMsg = json.error.message;
      } catch {}
      throw new Error(`Google API (${res.status}): ${extractedMsg}`);
    }
    const data = (await res.json()) as {
      models?: {
        name: string;
        displayName?: string;
        description?: string;
        supportedGenerationMethods?: string[];
      }[];
    };

    const models = (data.models ?? [])
      .filter((m) => {
        const methods = m.supportedGenerationMethods ?? [];
        return methods.includes("generateContent");
      })
      .map((m) => {
        const cleanId = m.name.replace(/^models\//, "");
        const isFlash25 = cleanId === "gemini-2.5-flash";
        const isFlash20 = cleanId === "gemini-2.0-flash";
        return {
          id: cleanId,
          name: m.displayName || cleanId,
          description: m.description,
          isRecommended: isFlash25 || isFlash20,
        };
      })
      .sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        const aFlash = a.id.includes("flash") ? 1 : 0;
        const bFlash = b.id.includes("flash") ? 1 : 0;
        if (bFlash !== aFlash) return bFlash - aFlash;
        return a.id.localeCompare(b.id);
      });

    return models;
  }

  if (provider === "groq") {
    const url = "https://api.groq.com/openai/v1/models";
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
      },
    });
    if (!res.ok) {
      const errBody = await res.text();
      let extractedMsg = errBody;
      try {
        const json = JSON.parse(errBody);
        if (json.error?.message) extractedMsg = json.error.message;
      } catch {}
      throw new Error(`Groq API (${res.status}): ${extractedMsg}`);
    }
    const data = (await res.json()) as {
      data?: { id: string; active?: boolean }[];
    };

    const models = (data.data ?? [])
      .filter((m) => {
        const id = m.id.toLowerCase();
        return !id.includes("whisper") && !id.includes("vision") && m.active !== false;
      })
      .map((m) => {
        const isRec = m.id.includes("llama-3.3-70b") || m.id.includes("llama-3.1-8b");
        return {
          id: m.id,
          name: m.id,
          isRecommended: isRec,
        };
      })
      .sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return a.id.localeCompare(b.id);
      });

    return models;
  }

  if (provider === "meta") {
    const url = "https://api.meta.ai/v1/models";
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
      },
    });
    if (!res.ok) {
      const errBody = await res.text();
      let extractedMsg = errBody;
      try {
        const json = JSON.parse(errBody);
        if (json.error?.message) extractedMsg = json.error.message;
      } catch {}
      throw new Error(`Meta API (${res.status}): ${extractedMsg}`);
    }
    const data = (await res.json()) as {
      data?: { id: string; active?: boolean }[];
    };

    const models = (data.data ?? [])
      .map((m) => {
        const isRec = m.id.includes("70b") || m.id.includes("3.3");
        return {
          id: m.id,
          name: m.id,
          isRecommended: isRec,
        };
      })
      .sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return a.id.localeCompare(b.id);
      });

    return models;
  }

  // OpenAI or Custom
  const root = (
    provider === "custom" && params.baseUrl?.trim()
      ? params.baseUrl.trim()
      : provider === "custom"
        ? DEFAULT_CUSTOM_BASE_URL
        : "https://api.openai.com/v1"
  ).replace(/\/+$/, "");

  const url = `${root}/models`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${trimmedKey}`,
    },
  });
  if (!res.ok) {
    const errBody = await res.text();
    let extractedMsg = errBody;
    try {
      const json = JSON.parse(errBody);
      if (json.error?.message) extractedMsg = json.error.message;
    } catch {}
    throw new Error(`API (${res.status}): ${extractedMsg}`);
  }
  const data = (await res.json()) as {
    data?: { id: string; owned_by?: string }[];
  };

  const models = (data.data ?? [])
    .filter((m) => {
      const id = m.id.toLowerCase();
      return (
        id.includes("gpt") ||
        id.includes("o1") ||
        id.includes("o3") ||
        id.includes("claude") ||
        id.includes("gemini")
      );
    })
    .map((m) => {
      const isRec = m.id === "gpt-4o-mini";
      return {
        id: m.id,
        name: m.id,
        isRecommended: isRec,
      };
    })
    .sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      const aMini = a.id.includes("mini") ? 1 : 0;
      const bMini = b.id.includes("mini") ? 1 : 0;
      if (bMini !== aMini) return bMini - aMini;
      return a.id.localeCompare(b.id);
    });

  return models;
}

export async function testAiConnection(params: {
  provider: AiProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}): Promise<string> {
  const { provider, apiKey } = params;
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error("Please paste an API key first.");
  }
  const resolvedModel = params.model?.trim() || DEFAULT_AI_MODELS[provider];
  const endpoint = resolveEndpointUrl(provider, resolvedModel, params.baseUrl);

  if (provider === "gemini") {
    const res = await fetch(`${endpoint}?key=${encodeURIComponent(trimmedKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Say OK" }] }],
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      let extractedMsg = errBody;
      try {
        const json = JSON.parse(errBody);
        if (json.error?.message) extractedMsg = json.error.message;
      } catch {
        // use raw body
      }
      throw new Error(`Google API (${res.status}): ${extractedMsg}`);
    }
    return resolvedModel;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${trimmedKey}`,
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 10,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    let extractedMsg = errBody;
    try {
      const json = JSON.parse(errBody);
      if (json.error?.message) extractedMsg = json.error.message;
    } catch {
      // use raw body
    }
    const label =
      provider === "groq"
        ? "Groq"
        : provider === "meta"
          ? "Meta AI"
          : provider === "custom"
            ? "Custom AI"
            : "OpenAI";
    throw new Error(`${label} API (${res.status}): ${extractedMsg}`);
  }
  return resolvedModel;
}

export async function parseMealsWithAi(params: {
  text: string;
  apiKey: string;
  provider: AiProvider;
  model?: string;
  baseUrl?: string;
}): Promise<AiMealParseResult> {
  const { text, apiKey, provider } = params;
  const trimmedKey = apiKey.trim();

  if (!trimmedKey) {
    throw new Error("No API key configured. Please set your API key in Settings.");
  }

  if (!text || !text.trim()) {
    throw new Error("Please enter or paste your meal text.");
  }

  const resolvedModel = params.model?.trim() || DEFAULT_AI_MODELS[provider];
  const endpoint = resolveEndpointUrl(provider, resolvedModel, params.baseUrl);
  let rawJson = "";

  if (provider === "gemini") {
    const response = await fetch(`${endpoint}?key=${encodeURIComponent(trimmedKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: SYSTEM_PROMPT },
              { text: `Here is the user's meal log to parse:\n\n${text}` },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status} on ${resolvedModel}): ${errText}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } else {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${trimmedKey}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const label =
        provider === "groq"
          ? "Groq"
          : provider === "meta"
            ? "Meta AI"
            : provider === "custom"
              ? "Custom AI"
              : "OpenAI";
      throw new Error(`${label} API error (${response.status} on ${resolvedModel}): ${errText}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    rawJson = data.choices?.[0]?.message?.content ?? "";
  }

  if (!rawJson) {
    throw new Error("AI did not return any data. Please try again.");
  }

  let parsedData: {
    meals?: {
      mealType?: string;
      label?: string;
      items?: {
        name?: string;
        grams?: number;
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        kcalPer100g?: number;
        proteinPer100g?: number;
        carbsPer100g?: number;
        fatPer100g?: number;
      }[];
    }[];
  };

  try {
    parsedData = JSON.parse(stripJsonFence(rawJson));
  } catch {
    throw new Error("Could not parse AI response as JSON. Please try again.");
  }

  const rawMeals = parsedData.meals ?? [];
  const normalizedMeals: ParsedAiMeal[] = [];

  let grandTotalKcal = 0;
  let grandTotalProtein = 0;
  let grandTotalCarbs = 0;
  let grandTotalFat = 0;

  for (const m of rawMeals) {
    const rawMealType = (m.mealType ?? "snack").toLowerCase();
    const validMealType: MealType =
      rawMealType === "breakfast" ||
      rawMealType === "lunch" ||
      rawMealType === "dinner"
        ? rawMealType
        : "snack";

    const label =
      m.label ??
      (validMealType === "breakfast"
        ? "Breakfast"
        : validMealType === "lunch"
          ? "Lunch"
          : validMealType === "dinner"
            ? "Dinner"
            : "Snacks");

    const items: ParsedAiFoodItem[] = [];

    for (const item of m.items ?? []) {
      const name = item.name?.trim() || "Food Item";
      const grams = Math.max(1, Math.round(item.grams ?? 100));

      const kcalPer100g = Math.max(
        0,
        Math.round(item.kcalPer100g ?? (item.calories ? (item.calories * 100) / grams : 0)),
      );
      const proteinPer100g = Math.max(
        0,
        Math.round((item.proteinPer100g ?? (item.protein ? (item.protein * 100) / grams : 0)) * 10) / 10,
      );
      const carbsPer100g = Math.max(
        0,
        Math.round((item.carbsPer100g ?? (item.carbs ? (item.carbs * 100) / grams : 0)) * 10) / 10,
      );
      const fatPer100g = Math.max(
        0,
        Math.round((item.fatPer100g ?? (item.fat ? (item.fat * 100) / grams : 0)) * 10) / 10,
      );

      const calories = Math.round(item.calories ?? (kcalPer100g * grams) / 100);
      const protein = Math.round((item.protein ?? (proteinPer100g * grams) / 100) * 10) / 10;
      const carbs = Math.round((item.carbs ?? (carbsPer100g * grams) / 100) * 10) / 10;
      const fat = Math.round((item.fat ?? (fatPer100g * grams) / 100) * 10) / 10;

      items.push({
        name,
        grams,
        calories,
        protein,
        carbs,
        fat,
        kcalPer100g,
        proteinPer100g,
        carbsPer100g,
        fatPer100g,
      });

      grandTotalKcal += calories;
      grandTotalProtein += protein;
      grandTotalCarbs += carbs;
      grandTotalFat += fat;
    }

    if (items.length > 0) {
      normalizedMeals.push({
        mealType: validMealType,
        label,
        items,
      });
    }
  }

  return {
    meals: normalizedMeals,
    totalKcal: grandTotalKcal,
    totalProtein: Math.round(grandTotalProtein * 10) / 10,
    totalCarbs: Math.round(grandTotalCarbs * 10) / 10,
    totalFat: Math.round(grandTotalFat * 10) / 10,
  };
}
