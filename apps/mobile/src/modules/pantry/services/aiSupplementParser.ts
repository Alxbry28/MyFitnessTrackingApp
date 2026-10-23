import {
  DEFAULT_AI_MODELS,
  type AiProvider,
} from "@/modules/nutrition/repositories/settingsRepo";
import {
  resolveEndpointUrl,
  stripJsonFence,
} from "@/modules/nutrition/services/aiMealParser";
import type { SupplementUnit } from "../types/pantry";

export type ParsedSupplementItem = {
  name: string;
  brand: string | null;
  unit: SupplementUnit;
  containerSize: number;
  servingDose: number;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  notes?: string | null;
};

const SYSTEM_PROMPT = `You are an expert fitness nutrition and supplement assistant for a mobile tracking app.
The user will provide text describing one or more fitness or dietary supplements, vitamins, minerals, proteins, or wellness items. Examples:
- "Krea by Wheyl 300g"
- "324g Wake pre-workout by Wheyl"
- "Optimum Nutrition Gold Standard Whey 5 lbs"
- "Kirkland Signature Daily Multivitamin 500 tablets"
- "Fish Oil 1000mg 300 softgels"

TASK:
1. Identify and extract each distinct supplement item mentioned in the text.
2. For each supplement:
   - "name": Clean, specific product name WITHOUT the brand name and WITHOUT the container weight/count (e.g. "Krea", "Wake Pre-workout", "Gold Standard 100% Whey", "Daily Multivitamin", "Fish Oil 1000mg").
   - "brand": Brand manufacturer if mentioned or known (e.g. "Wheyl", "Optimum Nutrition", "Kirkland Signature"). If not mentioned or unknown, null.
   - "unit": Must be exactly one of:
       * "g" for powders, bulk powders, drink mixes, or scoop-based products
       * "tabs" for tablets, caplets, or chewables
       * "caps" for capsules or softgels
     (Default to "g" if in powder or unspecified).
   - "containerSize": Total net amount in the container as a number.
       * If unit is "g", convert any lbs/kg/oz into grams (e.g. 300g -> 300; 324g -> 324; 1 kg -> 1000; 2 lbs -> 907; 5 lbs -> 2268).
       * If unit is "tabs" or "caps", this is total count of pills (e.g. 500 tablets -> 500; 120 capsules -> 120).
       * If container size is not specified in the text, provide the standard retail container size for this product or a sensible default (e.g. 300 for creatine, 100 for pills).
   - "servingDose": Standard serving dose as a number.
       * If unit is "g", grams per scoop/serving (e.g. Creatine = 5; Wheyl Wake pre-workout = 10.8; standard Whey = 30-33; generic Pre-workouts = 10-15).
       * If unit is "tabs" or "caps", number of pills per serving (usually 1 or 2).
   - "calories": Estimated calories per serving dose (e.g. 0 for creatine/vitamins, ~120 for whey protein, 5-15 for pre-workout). If unknown or negligible, 0.
   - "protein": Estimated protein in grams per serving dose (e.g. 24 for whey protein, 0 for creatine/vitamins). If none or unknown, 0.
   - "carbs": Estimated carbs in grams per serving dose. If none or unknown, 0.
   - "fat": Estimated fat in grams per serving dose. If none or unknown, 0.
   - "notes": Short note or category (e.g. "Creatine Monohydrate", "Pre-workout", "Whey Protein Isolate").

3. Return ONLY a single valid JSON object matching this schema:
{
  "supplements": [
    {
      "name": "Krea",
      "brand": "Wheyl",
      "unit": "g",
      "containerSize": 300,
      "servingDose": 5,
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "notes": "Creatine Monohydrate"
    }
  ]
}

No markdown code fences, no extra conversational text, only valid JSON.`;

function normalizeUnit(raw: unknown): SupplementUnit {
  if (typeof raw !== "string") return "g";
  const str = raw.trim().toLowerCase();
  if (/\b(tab|tablet|tablets|pill|pills)\b/.test(str)) return "tabs";
  if (/\b(cap|caps|capsule|capsules|softgel|softgels)\b/.test(str)) return "caps";
  return "g";
}

export async function parseSupplementsWithAi(params: {
  text: string;
  apiKey: string;
  provider: AiProvider;
  model?: string;
  baseUrl?: string;
}): Promise<ParsedSupplementItem[]> {
  const { text, apiKey, provider } = params;
  const trimmedKey = apiKey.trim();

  if (!trimmedKey) {
    throw new Error("No API key configured. Please set your API key in Settings.");
  }

  if (!text || !text.trim()) {
    throw new Error("Please enter or paste supplement text.");
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
              { text: `Here is the user's supplement text to parse:\n\n${text}` },
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
      ? (parsedData as { supplements?: unknown[]; items?: unknown[] }).supplements ??
        (parsedData as { supplements?: unknown[]; items?: unknown[] }).items ??
        []
      : [];

  if (list.length === 0) {
    throw new Error("No supplements could be parsed from the text. Please check the text and try again.");
  }

  const results: ParsedSupplementItem[] = [];

  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const raw = item as Record<string, unknown>;

    const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Supplement";
    const brand =
      typeof raw.brand === "string" &&
      raw.brand.trim() &&
      !/^(none|null|n\/a|unknown)$/i.test(raw.brand.trim())
        ? raw.brand.trim()
        : null;

    const unit = normalizeUnit(raw.unit);

    let containerSize = Number(raw.containerSize);
    if (!Number.isFinite(containerSize) || containerSize <= 0) {
      containerSize = unit === "g" ? 300 : 100;
    }

    let servingDose = Number(raw.servingDose);
    if (!Number.isFinite(servingDose) || servingDose <= 0) {
      servingDose = unit === "g" ? 5 : 1;
    }

    const calories =
      typeof raw.calories === "number" && Number.isFinite(raw.calories) && raw.calories >= 0
        ? Math.round(raw.calories)
        : null;
    const protein =
      typeof raw.protein === "number" && Number.isFinite(raw.protein) && raw.protein >= 0
        ? Math.round(raw.protein * 10) / 10
        : null;
    const carbs =
      typeof raw.carbs === "number" && Number.isFinite(raw.carbs) && raw.carbs >= 0
        ? Math.round(raw.carbs * 10) / 10
        : null;
    const fat =
      typeof raw.fat === "number" && Number.isFinite(raw.fat) && raw.fat >= 0
        ? Math.round(raw.fat * 10) / 10
        : null;

    const notes = typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim() : null;

    results.push({
      name,
      brand,
      unit,
      containerSize: Math.round(containerSize * 10) / 10,
      servingDose: Math.round(servingDose * 10) / 10,
      calories,
      protein,
      carbs,
      fat,
      notes,
    });
  }

  if (results.length === 0) {
    throw new Error("Could not parse any valid supplement items.");
  }

  return results;
}
