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

export async function parseMealsWithAi(params: {
  text: string;
  apiKey: string;
  provider: "gemini" | "openai";
}): Promise<AiMealParseResult> {
  const { text, apiKey, provider } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error("No API key configured. Please set your API key in Settings.");
  }

  if (!text || !text.trim()) {
    throw new Error("Please enter or paste your meal text.");
  }

  let rawJson = "";

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
    const response = await fetch(url, {
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
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } else {
    // OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
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
    parsedData = JSON.parse(rawJson);
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
