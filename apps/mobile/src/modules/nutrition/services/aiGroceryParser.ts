import {
  DEFAULT_AI_MODELS,
  type AiProvider,
} from "@/modules/nutrition/repositories/settingsRepo";
import {
  resolveEndpointUrl,
  stripJsonFence,
} from "@/modules/nutrition/services/aiMealParser";

export type ParsedGroceryItem = {
  name: string;
  brand: string | null;
  netWeightG: number | null;
  servingSize: string | null;
  servingGrams: number | null;
  kcalPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  eatenDrained?: boolean;
  usualDrainedG?: number | null;
  drainedKcalPer100g?: number | null;
  drainedProteinPer100g?: number | null;
  drainedCarbsPer100g?: number | null;
  drainedFatPer100g?: number | null;
  notes?: string | null;
};

const SYSTEM_PROMPT = `You are an expert nutrition and grocery food analyzer for a mobile fitness app.
The user will provide text describing one or more grocery items, packaged food, pantry staples, canned goods, fresh ingredients, or shopping items. Examples:
- "500g Kirkland rolled oats"
- "1L Almond Milk by Silk"
- "400g Canned Black Beans by Heinz"
- "Chicken breast 1kg"
- "Century Tuna Flakes in Oil 180g"
- "Greek Yogurt Chobani 450g"

TASK:
1. Identify and extract each distinct grocery or food product from the text.
2. For each product, extract accurate information and reliable nutritional data per 100g (using authoritative nutritional databases like USDA or standard product specs):
   - "name": Clean product name WITHOUT the brand name and WITHOUT the container weight (e.g. "Rolled Oats", "Almond Milk", "Canned Black Beans", "Boneless Skinless Chicken Breast", "Greek Yogurt Plain").
   - "brand": Brand or manufacturer if mentioned or recognizable (e.g. "Kirkland Signature", "Silk", "Heinz", "Chobani", "Century"). Otherwise null.
   - "netWeightG": Total package/container net weight converted to grams (1 kg = 1000, 1 L = 1000, 500g = 500, 1 lb = 454, 16 oz = 454, etc.). If unknown, provide the standard container weight or null.
   - "servingSize": Standard serving label (e.g. "1/2 cup (40g)", "1 cup (240ml)", "1 can (150g)", "100g").
   - "servingGrams": Weight of one serving in grams (number). If unknown, estimate from typical serving or 100.
   - "kcalPer100g": Calories per 100g (number between 0 and 900). Must be realistic for the food.
   - "proteinPer100g": Protein in grams per 100g (number between 0 and 100).
   - "carbsPer100g": Carbohydrates in grams per 100g (number between 0 and 100).
   - "fatPer100g": Fat in grams per 100g (number between 0 and 100).
   - "eatenDrained": Boolean. True only if this is a canned food packed in liquid that is drained before eating (like canned tuna, canned beans in brine, canned chickpeas, canned corn). Default false.
   - "usualDrainedG": If eatenDrained is true, standard drained weight in grams (e.g. 130g for 180g tuna, 240g for 400g beans). Otherwise null.
   - "drainedKcalPer100g": Calories per 100g drained (if eatenDrained is true). Otherwise null.
   - "drainedProteinPer100g": Protein per 100g drained. Otherwise null.
   - "drainedCarbsPer100g": Carbs per 100g drained. Otherwise null.
   - "drainedFatPer100g": Fat per 100g drained. Otherwise null.
   - "notes": Category or quick note (e.g. "Grains / Cereals", "Dairy Alternative", "Poultry / Meat", "Canned Legumes").

3. Return ONLY a single valid JSON object matching this schema:
{
  "groceries": [
    {
      "name": "Rolled Oats",
      "brand": "Kirkland",
      "netWeightG": 500,
      "servingSize": "1/2 cup (40g)",
      "servingGrams": 40,
      "kcalPer100g": 379,
      "proteinPer100g": 13.2,
      "carbsPer100g": 67.7,
      "fatPer100g": 6.5,
      "eatenDrained": false,
      "usualDrainedG": null,
      "drainedKcalPer100g": null,
      "drainedProteinPer100g": null,
      "drainedCarbsPer100g": null,
      "drainedFatPer100g": null,
      "notes": "Whole grain oats"
    }
  ]
}

No markdown code fences, no extra conversational text, only valid JSON.`;

export async function parseGroceriesWithAi(params: {
  text: string;
  apiKey: string;
  provider: AiProvider;
  model?: string;
  baseUrl?: string;
}): Promise<ParsedGroceryItem[]> {
  const { text, apiKey, provider } = params;
  const trimmedKey = apiKey.trim();

  if (!trimmedKey) {
    throw new Error("No API key configured. Please set your API key in Settings.");
  }

  if (!text || !text.trim()) {
    throw new Error("Please enter or paste grocery text.");
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
              { text: `Here is the user's grocery text to parse:\n\n${text}` },
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

  let parsedData: unknown;
  try {
    parsedData = JSON.parse(stripJsonFence(rawJson));
  } catch {
    throw new Error("Could not parse AI response as JSON. Please try again.");
  }

  const list: unknown[] = Array.isArray(parsedData)
    ? parsedData
    : typeof parsedData === "object" && parsedData !== null
      ? (parsedData as { groceries?: unknown[]; items?: unknown[] }).groceries ??
        (parsedData as { groceries?: unknown[]; items?: unknown[] }).items ??
        []
      : [];

  if (list.length === 0) {
    throw new Error("No grocery items could be parsed from the text.");
  }

  const results: ParsedGroceryItem[] = [];

  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const raw = item as Record<string, unknown>;

    const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Grocery Item";
    const brand =
      typeof raw.brand === "string" &&
      raw.brand.trim() &&
      !/^(none|null|n\/a|unknown)$/i.test(raw.brand.trim())
        ? raw.brand.trim()
        : null;

    let netWeightG = Number(raw.netWeightG);
    if (!Number.isFinite(netWeightG) || netWeightG <= 0) {
      netWeightG = null as unknown as number;
    }

    let servingGrams = Number(raw.servingGrams);
    if (!Number.isFinite(servingGrams) || servingGrams <= 0) {
      servingGrams = null as unknown as number;
    }

    const servingSize =
      typeof raw.servingSize === "string" && raw.servingSize.trim()
        ? raw.servingSize.trim()
        : servingGrams
          ? `${servingGrams}g`
          : null;

    let kcalPer100g = Math.round(Number(raw.kcalPer100g) || 0);
    if (kcalPer100g < 0) kcalPer100g = 0;
    if (kcalPer100g > 900) kcalPer100g = 900;

    const proteinPer100g =
      typeof raw.proteinPer100g === "number" && Number.isFinite(raw.proteinPer100g)
        ? Math.min(100, Math.max(0, Math.round(raw.proteinPer100g * 10) / 10))
        : null;
    const carbsPer100g =
      typeof raw.carbsPer100g === "number" && Number.isFinite(raw.carbsPer100g)
        ? Math.min(100, Math.max(0, Math.round(raw.carbsPer100g * 10) / 10))
        : null;
    const fatPer100g =
      typeof raw.fatPer100g === "number" && Number.isFinite(raw.fatPer100g)
        ? Math.min(100, Math.max(0, Math.round(raw.fatPer100g * 10) / 10))
        : null;

    const eatenDrained = Boolean(raw.eatenDrained);

    let usualDrainedG = Number(raw.usualDrainedG);
    if (!Number.isFinite(usualDrainedG) || usualDrainedG <= 0) {
      usualDrainedG = null as unknown as number;
    }

    let drainedKcalPer100g = Number(raw.drainedKcalPer100g);
    if (!Number.isFinite(drainedKcalPer100g) || drainedKcalPer100g < 0) {
      drainedKcalPer100g = null as unknown as number;
    }

    const drainedProteinPer100g =
      typeof raw.drainedProteinPer100g === "number" && Number.isFinite(raw.drainedProteinPer100g)
        ? Math.min(100, Math.max(0, Math.round(raw.drainedProteinPer100g * 10) / 10))
        : null;
    const drainedCarbsPer100g =
      typeof raw.drainedCarbsPer100g === "number" && Number.isFinite(raw.drainedCarbsPer100g)
        ? Math.min(100, Math.max(0, Math.round(raw.drainedCarbsPer100g * 10) / 10))
        : null;
    const drainedFatPer100g =
      typeof raw.drainedFatPer100g === "number" && Number.isFinite(raw.drainedFatPer100g)
        ? Math.min(100, Math.max(0, Math.round(raw.drainedFatPer100g * 10) / 10))
        : null;

    const notes = typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim() : null;

    results.push({
      name,
      brand,
      netWeightG: netWeightG ? Math.round(netWeightG) : null,
      servingSize,
      servingGrams: servingGrams ? Math.round(servingGrams) : null,
      kcalPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      eatenDrained,
      usualDrainedG: usualDrainedG ? Math.round(usualDrainedG) : null,
      drainedKcalPer100g: drainedKcalPer100g ? Math.round(drainedKcalPer100g) : null,
      drainedProteinPer100g,
      drainedCarbsPer100g,
      drainedFatPer100g,
      notes,
    });
  }

  if (results.length === 0) {
    throw new Error("Could not parse any valid grocery items.");
  }

  return results;
}
