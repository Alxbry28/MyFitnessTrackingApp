import type { SQLiteDatabase } from "expo-sqlite";
import * as settingsRepo from "@/modules/nutrition/repositories/settingsRepo";
import { DEFAULT_AI_MODELS } from "@/modules/nutrition/repositories/settingsRepo";
import { resolveEndpointUrl, stripJsonFence } from "@/modules/nutrition/services/aiMealParser";
import * as productRepo from "@/modules/nutrition/repositories/productRepo";

export type ParsedRawIngredient = {
  id: string;
  name: string;
  rawGrams: number;
  note?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  productId?: string;
  inPantry?: boolean;
};

export type CookingRawParseResult = {
  dishTitle?: string;
  items: ParsedRawIngredient[];
  totalRawGrams: number;
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  hasOil: boolean;
};

const COOKING_AI_SYSTEM_PROMPT = `You are an expert culinary nutrition calculator for a cooking fitness app.
The user provides a dish title and a list of RAW ingredients before cooking (with weights in grams, spoons, cloves, or standard units).

IMPORTANT INSTRUCTIONS:
1. Parse ONLY raw, uncooked ingredients (raw meat, raw vegetables, sauces, oil, seasonings).
2. Never ask for or assume cooked weight. Cooked weight is weighed at the end on a kitchen scale.
3. For each ingredient:
   - Identify the clean food name (e.g. "Chicken Thigh, Boneless Skinless", "Silver Swan Soy Sauce", "Canola cooking oil").
   - Convert portion into raw grams (e.g. 1 tbsp oil ~ 14g, 1 tbsp soy sauce ~ 15g, 1 clove garlic ~ 5g).
   - Provide accurate RAW nutrition: kcal, protein, carbs, fat for that portion, AND per-100g values.
   - Detect whether any cooking oil, butter, or cooking fat is included ("hasOil": true/false).
4. Return ONLY a single valid JSON object matching this schema:
{
  "dishTitle": "Chicken Adobo (Skinless Thighs)",
  "hasOil": true,
  "items": [
    {
      "name": "Chicken Thigh, Boneless Skinless",
      "rawGrams": 500,
      "note": "500g raw chicken",
      "kcal": 600,
      "protein": 100,
      "carbs": 0,
      "fat": 20,
      "kcalPer100g": 120,
      "proteinPer100g": 20,
      "carbsPer100g": 0,
      "fatPer100g": 4
    }
  ]
}

No extra markdown, no conversational text, valid JSON only.`;

export async function parseRawIngredients(
  db: SQLiteDatabase,
  text: string,
  dishTitle?: string,
): Promise<CookingRawParseResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Please enter or list your raw ingredients.");
  }

  // 1. Try AI parsing if API key exists
  const aiSettings = await settingsRepo.getAiConfig(db);
  if (aiSettings.apiKey && aiSettings.apiKey.trim()) {
    try {
      const aiResult = await callAiCookingParse(aiSettings, trimmed, dishTitle);
      if (aiResult && aiResult.items && aiResult.items.length > 0) {
        return await enrichWithLocalProducts(db, aiResult);
      }
    } catch (e) {
      console.warn("AI cooking parse failed, falling back to offline parser:", e);
    }
  }

  // 2. Offline smart parser fallback
  const offlineResult = parseRawIngredientsOffline(trimmed, dishTitle);
  return await enrichWithLocalProducts(db, offlineResult);
}

async function callAiCookingParse(
  aiSettings: settingsRepo.AiConfig,
  text: string,
  dishTitle?: string,
): Promise<CookingRawParseResult> {
  const { provider, apiKey, model, baseUrl } = aiSettings;
  const trimmedKey = (apiKey ?? "").trim();
  if (!trimmedKey) {
    throw new Error("No API key configured");
  }
  const resolvedModel = model?.trim() || DEFAULT_AI_MODELS[provider];
  const endpoint = resolveEndpointUrl(provider, resolvedModel, baseUrl);
  const prompt = `Dish Title: ${dishTitle || "Unspecified Dish"}\nRaw Ingredients:\n${text}`;

  let rawJson = "";
  if (provider === "gemini") {
    const res = await fetch(`${endpoint}?key=${encodeURIComponent(trimmedKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: COOKING_AI_SYSTEM_PROMPT }, { text: prompt }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status}`);
    }
    const data = (await res.json()) as any;
    rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } else {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${trimmedKey}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: [
          { role: "system", content: COOKING_AI_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });
    if (!res.ok) {
      throw new Error(`AI API error: ${res.status}`);
    }
    const data = (await res.json()) as any;
    rawJson = data.choices?.[0]?.message?.content ?? "";
  }

  const clean = stripJsonFence(rawJson);
  const parsed = JSON.parse(clean);

  const items: ParsedRawIngredient[] = (parsed.items ?? []).map((it: any, index: number) => {
    const rawGrams = Math.max(1, Number(it.rawGrams) || 100);
    const kcal = Number(it.kcal) || 0;
    const protein = Number(it.protein) || 0;
    const carbs = Number(it.carbs) || 0;
    const fat = Number(it.fat) || 0;
    return {
      id: `ing-${Date.now()}-${index}`,
      name: it.name || `Ingredient ${index + 1}`,
      rawGrams,
      note: it.note,
      kcal,
      protein,
      carbs,
      fat,
      kcalPer100g: Number(it.kcalPer100g) || Math.round((kcal / rawGrams) * 100),
      proteinPer100g: Number(it.proteinPer100g) || Number(((protein / rawGrams) * 100).toFixed(1)),
      carbsPer100g: Number(it.carbsPer100g) || Number(((carbs / rawGrams) * 100).toFixed(1)),
      fatPer100g: Number(it.fatPer100g) || Number(((fat / rawGrams) * 100).toFixed(1)),
    };
  });

  const totalRawGrams = items.reduce((sum, i) => sum + i.rawGrams, 0);
  const totalKcal = Math.round(items.reduce((sum, i) => sum + i.kcal, 0));
  const totalProtein = Number(items.reduce((sum, i) => sum + i.protein, 0).toFixed(1));
  const totalCarbs = Number(items.reduce((sum, i) => sum + i.carbs, 0).toFixed(1));
  const totalFat = Number(items.reduce((sum, i) => sum + i.fat, 0).toFixed(1));

  const hasOil =
    Boolean(parsed.hasOil) ||
    items.some((i) => /oil|butter|mantika|margarine|lard|ghee/i.test(i.name));

  return {
    dishTitle: parsed.dishTitle || dishTitle,
    items,
    totalRawGrams,
    totalKcal,
    totalProtein,
    totalCarbs,
    totalFat,
    hasOil,
  };
}

export function parseRawIngredientsOffline(
  text: string,
  dishTitle?: string,
): CookingRawParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ParsedRawIngredient[] = [];

  let hasOil = false;

  lines.forEach((line, index) => {
    // Check oil
    if (/oil|butter|mantika|margarine|lard/i.test(line)) {
      hasOil = true;
    }

    // Try match: "500g chicken thighs" or "3 tbsp soy sauce (~45g)" or "15g garlic minced"
    let grams = 100;
    let name = line;

    const gMatch = /(\d+(?:[.,]\d+)?)\s*(?:g|grams)\b/i.exec(line);
    const tbspMatch = /(\d+(?:[.,]\d+)?)\s*tbsp\b/i.exec(line);
    const tspMatch = /(\d+(?:[.,]\d+)?)\s*tsp\b/i.exec(line);
    const cloveMatch = /(\d+(?:[.,]\d+)?)\s*cloves?\b/i.exec(line);

    if (gMatch) {
      grams = parseFloat(gMatch[1].replace(",", "."));
    } else if (tbspMatch) {
      grams = parseFloat(tbspMatch[1].replace(",", ".")) * 15;
    } else if (tspMatch) {
      grams = parseFloat(tspMatch[1].replace(",", ".")) * 5;
    } else if (cloveMatch) {
      grams = parseFloat(cloveMatch[1].replace(",", ".")) * 5;
    }

    // Clean name
    name = line
      .replace(/\(~?\d+g\)/gi, "")
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:g|grams|tbsp|tsp|cloves?|cups?)\b/gi, "")
      .trim();
    if (!name) name = `Ingredient ${index + 1}`;

    // Estimated standard macros based on keywords
    let kPer100 = 100;
    let pPer100 = 5;
    let cPer100 = 10;
    let fPer100 = 2;

    const lower = line.toLowerCase();
    if (/chicken|thigh|breast|pork|beef|meat|fish|tuna|salmon/i.test(lower)) {
      kPer100 = /breast/i.test(lower) ? 120 : 170;
      pPer100 = 22;
      cPer100 = 0;
      fPer100 = /breast/i.test(lower) ? 2.5 : 9;
    } else if (/oil|butter|lard/i.test(lower)) {
      kPer100 = 884;
      pPer100 = 0;
      cPer100 = 0;
      fPer100 = 100;
    } else if (/soy sauce|toyo/i.test(lower)) {
      kPer100 = 53;
      pPer100 = 8;
      cPer100 = 5;
      fPer100 = 0;
    } else if (/vinegar|suka/i.test(lower)) {
      kPer100 = 20;
      pPer100 = 0;
      cPer100 = 5;
      fPer100 = 0;
    } else if (/sugar|asukal/i.test(lower)) {
      kPer100 = 387;
      pPer100 = 0;
      cPer100 = 100;
      fPer100 = 0;
    } else if (/garlic|bawang|onion|sibuyas|ginger|luya/i.test(lower)) {
      kPer100 = 60;
      pPer100 = 2;
      cPer100 = 14;
      fPer100 = 0.2;
    } else if (/broccoli|carrot|cabbage|repolyo|vegetable|gulay/i.test(lower)) {
      kPer100 = 35;
      pPer100 = 2.5;
      cPer100 = 6;
      fPer100 = 0.4;
    } else if (/rice|bigas/i.test(lower)) {
      kPer100 = 360;
      pPer100 = 7;
      cPer100 = 80;
      fPer100 = 0.7;
    }

    const kcal = Math.round((kPer100 * grams) / 100);
    const protein = Number(((pPer100 * grams) / 100).toFixed(1));
    const carbs = Number(((cPer100 * grams) / 100).toFixed(1));
    const fat = Number(((fPer100 * grams) / 100).toFixed(1));

    items.push({
      id: `ing-offline-${index}`,
      name: capitalizeFirst(name),
      rawGrams: Math.round(grams),
      note: line,
      kcal,
      protein,
      carbs,
      fat,
      kcalPer100g: kPer100,
      proteinPer100g: pPer100,
      carbsPer100g: cPer100,
      fatPer100g: fPer100,
    });
  });

  const totalRawGrams = items.reduce((sum, i) => sum + i.rawGrams, 0);
  const totalKcal = Math.round(items.reduce((sum, i) => sum + i.kcal, 0));
  const totalProtein = Number(items.reduce((sum, i) => sum + i.protein, 0).toFixed(1));
  const totalCarbs = Number(items.reduce((sum, i) => sum + i.carbs, 0).toFixed(1));
  const totalFat = Number(items.reduce((sum, i) => sum + i.fat, 0).toFixed(1));

  return {
    dishTitle: dishTitle || "New Cooked Dish",
    items,
    totalRawGrams,
    totalKcal,
    totalProtein,
    totalCarbs,
    totalFat,
    hasOil,
  };
}

async function enrichWithLocalProducts(
  db: SQLiteDatabase,
  result: CookingRawParseResult,
): Promise<CookingRawParseResult> {
  const products = await productRepo.search(db, "");

  for (const item of result.items) {
    const itemLower = item.name.toLowerCase();
    const match = products.find((p: { name: string; id: string }) => {
      const pLower = p.name.toLowerCase();
      return pLower.includes(itemLower) || itemLower.includes(pLower);
    });

    if (match) {
      item.productId = match.id;
      item.inPantry = true;
    }
  }

  return result;
}

function capitalizeFirst(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
