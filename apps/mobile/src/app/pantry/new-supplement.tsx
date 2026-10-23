import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchOffProduct } from "@/lib/openFoodFacts";
import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { BarcodeScanModal } from "@/modules/nutrition/components/BarcodeScanModal";
import * as productRepo from "@/modules/nutrition/repositories/productRepo";
import { getAiConfig } from "@/modules/nutrition/repositories/settingsRepo";
import { dayFromKey, dayKey, formatDayShort } from "@/modules/nutrition/services/mealTime";
import type { ProductInput, ProductSource } from "@/modules/nutrition/types/product";
import * as pantryRepo from "@/modules/pantry/repositories/pantryRepo";
import {
  parseSupplementsWithAi,
  type ParsedSupplementItem,
} from "@/modules/pantry/services/aiSupplementParser";
import { formatAmount } from "@/modules/pantry/services/pantryStock";
import {
  LOCATIONS,
  type PantryLocation,
  type SupplementUnit,
} from "@/modules/pantry/types/pantry";

const UNITS: { value: SupplementUnit; label: string; icon: string }[] = [
  { value: "g", label: "Powder (Grams)", icon: "🥄" },
  { value: "tabs", label: "Tablets", icon: "💊" },
  { value: "caps", label: "Capsules", icon: "💊" },
];

function inferSupplementUnit(servingText: string | null | undefined): SupplementUnit | null {
  if (!servingText) return null;
  if (/\btab(let)?s?\b/i.test(servingText)) return "tabs";
  if (/\b(cap(sule)?s?|softgels?)\b/i.test(servingText)) return "caps";
  if (/\b(g|grams?|scoop)\b/i.test(servingText)) return "g";
  return null;
}

function scalePer100ToDose(per100: number | null, doseGrams: number, unit: SupplementUnit): string {
  if (per100 === null || !Number.isFinite(per100)) return "";
  const raw = unit === "g" ? (per100 * doseGrams) / 100 : per100;
  return String(Math.round(raw * 10) / 10);
}

type ResolvedBarcodeData = {
  name?: string;
  brand?: string;
  unit?: SupplementUnit;
  location?: PantryLocation;
  containerSizeText?: string;
  servingDoseText?: string;
  showNutrition?: boolean;
  kcalText?: string;
  proteinText?: string;
  carbsText?: string;
  fatText?: string;
  source?: ProductSource;
  note: string;
};

async function resolveSupplementBarcode(
  db: SQLiteDatabase,
  code: string,
): Promise<ResolvedBarcodeData> {
  try {
    const existing = await productRepo.findByBarcode(db, code);
    if (existing) {
      const existingStock = await pantryRepo.stockForProduct(db, existing.id);
      const resolvedUnit =
        existingStock?.unit ?? inferSupplementUnit(existing.servingSize) ?? "g";
      const hasNutrition =
        existing.kcalPer100g > 0 ||
        existing.proteinPer100g !== null ||
        existing.carbsPer100g !== null ||
        existing.fatPer100g !== null;
      const dose = existing.servingGrams && existing.servingGrams > 0 ? existing.servingGrams : 100;
      const servingDoseText =
        existing.servingGrams !== null
          ? String(existing.servingGrams)
          : hasNutrition && resolvedUnit === "g"
            ? "100"
            : undefined;

      return {
        name: existing.name,
        brand: existing.brand ?? "",
        unit: resolvedUnit,
        location: existingStock?.location,
        containerSizeText: existing.netWeightG !== null ? String(existing.netWeightG) : undefined,
        servingDoseText,
        showNutrition: hasNutrition || undefined,
        kcalText: hasNutrition ? scalePer100ToDose(existing.kcalPer100g, dose, resolvedUnit) : undefined,
        proteinText: hasNutrition ? scalePer100ToDose(existing.proteinPer100g, dose, resolvedUnit) : undefined,
        carbsText: hasNutrition ? scalePer100ToDose(existing.carbsPer100g, dose, resolvedUnit) : undefined,
        fatText: hasNutrition ? scalePer100ToDose(existing.fatPer100g, dose, resolvedUnit) : undefined,
        source: existing.source,
        note: "Found in your product library. Details filled in.",
      };
    }

    const off = await fetchOffProduct(code);
    if (
      off.kind === "found" ||
      (off.kind === "not_found" &&
        Boolean(off.draft.name || off.draft.brand || off.draft.netWeightG || off.draft.servingGrams))
    ) {
      const resolvedUnit = inferSupplementUnit(off.draft.servingSize) ?? "g";
      const hasMacros = off.kind === "found" && off.draft.kcalPer100g !== "";
      const parsedDose = Number(off.draft.servingGrams);
      const dose = Number.isFinite(parsedDose) && parsedDose > 0 ? parsedDose : 100;
      const servingDoseText =
        off.draft.servingGrams || (hasMacros && resolvedUnit === "g" ? "100" : undefined);

      const kcal100 = hasMacros ? Number(off.draft.kcalPer100g) : null;
      const p100 = hasMacros && off.draft.proteinPer100g ? Number(off.draft.proteinPer100g) : null;
      const c100 = hasMacros && off.draft.carbsPer100g ? Number(off.draft.carbsPer100g) : null;
      const f100 = hasMacros && off.draft.fatPer100g ? Number(off.draft.fatPer100g) : null;

      return {
        name: off.draft.name || undefined,
        brand: off.draft.brand || undefined,
        unit: resolvedUnit,
        containerSizeText: off.draft.netWeightG || undefined,
        servingDoseText,
        showNutrition: hasMacros || undefined,
        kcalText: hasMacros ? scalePer100ToDose(kcal100, dose, resolvedUnit) : undefined,
        proteinText: hasMacros ? scalePer100ToDose(p100, dose, resolvedUnit) : undefined,
        carbsText: hasMacros ? scalePer100ToDose(c100, dose, resolvedUnit) : undefined,
        fatText: hasMacros ? scalePer100ToDose(f100, dose, resolvedUnit) : undefined,
        source: "open_food_facts",
        note: "Found on Open Food Facts. Check the values against the label before saving.",
      };
    }

    if (off.kind === "not_found") {
      return {
        note: "This barcode isn't on Open Food Facts yet. Enter the details from the label.",
      };
    }

    return {
      note: "Couldn't reach Open Food Facts. Enter the details from the label.",
    };
  } catch {
    return {
      note: "Couldn't look up this barcode. Enter the details manually.",
    };
  }
}

export default function NewSupplementScreen() {
  const params = useLocalSearchParams<{ barcode?: string }>();
  const initialBarcode = params.barcode?.trim() ?? "";
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [barcode, setBarcode] = useState(initialBarcode);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState<SupplementUnit>("g");
  const [containerSizeText, setContainerSizeText] = useState("");
  const [servingDoseText, setServingDoseText] = useState("");
  const [unitsBought, setUnitsBought] = useState(1);
  const [location, setLocation] = useState<PantryLocation>("cupboard");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [source, setSource] = useState<ProductSource>("manual");

  // Optional nutrition per serving
  const [showNutrition, setShowNutrition] = useState(false);
  const [kcalText, setKcalText] = useState("");
  const [proteinText, setProteinText] = useState("");
  const [carbsText, setCarbsText] = useState("");
  const [fatText, setFatText] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookingUp, setLookingUp] = useState(Boolean(initialBarcode));
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Quick Fill state
  const [aiInput, setAiInput] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessNote, setAiSuccessNote] = useState<string | null>(null);
  const [aiParsedItems, setAiParsedItems] = useState<ParsedSupplementItem[]>([]);
  const [savingAll, setSavingAll] = useState(false);

  const containerSize = Number(containerSizeText.trim().replace(",", "."));
  const servingDose = Number(servingDoseText.trim().replace(",", "."));
  const hasValidName = name.trim().length > 0;
  const hasValidContainer = containerSizeText.trim() !== "" && Number.isFinite(containerSize) && containerSize > 0;

  useEffect(() => {
    if (!initialBarcode) return;
    let active = true;
    void resolveSupplementBarcode(db, initialBarcode).then((res) => {
      if (!active) return;
      if (res.name !== undefined) setName(res.name);
      if (res.brand !== undefined) setBrand(res.brand);
      if (res.unit !== undefined) setUnit(res.unit);
      if (res.location !== undefined) setLocation(res.location);
      if (res.containerSizeText !== undefined) setContainerSizeText(res.containerSizeText);
      if (res.servingDoseText !== undefined) setServingDoseText(res.servingDoseText);
      if (res.showNutrition !== undefined) setShowNutrition(res.showNutrition);
      if (res.kcalText !== undefined) setKcalText(res.kcalText);
      if (res.proteinText !== undefined) setProteinText(res.proteinText);
      if (res.carbsText !== undefined) setCarbsText(res.carbsText);
      if (res.fatText !== undefined) setFatText(res.fatText);
      if (res.source !== undefined) setSource(res.source);
      setLookupNote(res.note);
      setLookingUp(false);
    });
    return () => {
      active = false;
    };
  }, [db, initialBarcode]);

  const handleBarcodeLookup = (rawCode: string) => {
    const code = rawCode.trim();
    setBarcode(code);
    if (!code) return;
    setLookingUp(true);
    setLookupNote(null);
    setError(null);
    void resolveSupplementBarcode(db, code).then((res) => {
      if (res.name !== undefined) setName(res.name);
      if (res.brand !== undefined) setBrand(res.brand);
      if (res.unit !== undefined) setUnit(res.unit);
      if (res.location !== undefined) setLocation(res.location);
      if (res.containerSizeText !== undefined) setContainerSizeText(res.containerSizeText);
      if (res.servingDoseText !== undefined) setServingDoseText(res.servingDoseText);
      if (res.showNutrition !== undefined) setShowNutrition(res.showNutrition);
      if (res.kcalText !== undefined) setKcalText(res.kcalText);
      if (res.proteinText !== undefined) setProteinText(res.proteinText);
      if (res.carbsText !== undefined) setCarbsText(res.carbsText);
      if (res.fatText !== undefined) setFatText(res.fatText);
      if (res.source !== undefined) setSource(res.source);
      setLookupNote(res.note);
      setLookingUp(false);
    });
  };

  const applyParsedItemToForm = (item: ParsedSupplementItem) => {
    setName(item.name);
    setBrand(item.brand ?? "");
    setUnit(item.unit);
    setContainerSizeText(String(item.containerSize));
    setServingDoseText(String(item.servingDose));
    setSource("ai_estimate");

    const hasMacros =
      (item.calories !== null && item.calories !== undefined && item.calories > 0) ||
      (item.protein !== null && item.protein !== undefined && item.protein > 0) ||
      (item.carbs !== null && item.carbs !== undefined && item.carbs > 0) ||
      (item.fat !== null && item.fat !== undefined && item.fat > 0);

    if (hasMacros) {
      setShowNutrition(true);
      setKcalText(item.calories !== null && item.calories !== undefined ? String(item.calories) : "");
      setProteinText(item.protein !== null && item.protein !== undefined ? String(item.protein) : "");
      setCarbsText(item.carbs !== null && item.carbs !== undefined ? String(item.carbs) : "");
      setFatText(item.fat !== null && item.fat !== undefined ? String(item.fat) : "");
    }

    const brandPrefix = item.brand ? `${item.brand} ` : "";
    setAiSuccessNote(`✨ Filled: ${brandPrefix}${item.name} (${item.containerSize} ${item.unit})`);
    setAiError(null);
  };

  const handleParseAi = async () => {
    const trimmed = aiInput.trim();
    if (!trimmed) {
      setAiError("Please type or paste supplement text first.");
      return;
    }
    setAiParsing(true);
    setAiError(null);
    setAiSuccessNote(null);
    try {
      const config = await getAiConfig(db);
      if (!config.apiKey) {
        setAiError("No AI API key found. Please add your API key in Settings.");
        setAiParsing(false);
        return;
      }
      const results = await parseSupplementsWithAi({
        text: trimmed,
        apiKey: config.apiKey,
        provider: config.provider,
        model: config.model,
        baseUrl: config.baseUrl,
      });

      if (results.length === 1) {
        applyParsedItemToForm(results[0]);
        setAiParsedItems([]);
      } else {
        setAiParsedItems(results);
        setAiSuccessNote(
          `✨ Found ${results.length} supplements. Tap one to fill the form, or save all below.`
        );
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Couldn't parse with AI.");
    } finally {
      setAiParsing(false);
    }
  };

  const handleSaveAllParsedToPantry = async () => {
    if (aiParsedItems.length === 0) return;
    setSavingAll(true);
    setAiError(null);
    try {
      for (const item of aiParsedItems) {
        const dose = item.servingDose || (item.unit === "g" ? 5 : 1);
        const baseDose = item.unit === "g" ? dose : 1;
        let kcalPer100 = 0;
        let p100: number | null = null;
        let c100: number | null = null;
        let f100: number | null = null;

        if (item.calories !== null && item.calories !== undefined) {
          kcalPer100 = item.unit === "g" ? Math.round((item.calories / baseDose) * 100) : item.calories;
        }
        if (item.protein !== null && item.protein !== undefined) {
          p100 = item.unit === "g" ? Math.round(((item.protein / baseDose) * 100) * 10) / 10 : item.protein;
        }
        if (item.carbs !== null && item.carbs !== undefined) {
          c100 = item.unit === "g" ? Math.round(((item.carbs / baseDose) * 100) * 10) / 10 : item.carbs;
        }
        if (item.fat !== null && item.fat !== undefined) {
          f100 = item.unit === "g" ? Math.round(((item.fat / baseDose) * 100) * 10) / 10 : item.fat;
        }

        const servingLabel =
          item.unit === "g"
            ? `${dose} g scoop`
            : `${dose} ${item.unit}`;

        const productInput: ProductInput = {
          name: item.name,
          brand: item.brand,
          barcode: null,
          servingSize: servingLabel,
          servingGrams: item.unit === "g" ? dose : null,
          kcalPer100g: kcalPer100,
          proteinPer100g: p100,
          carbsPer100g: c100,
          fatPer100g: f100,
          netWeightG: item.containerSize,
          eatenDrained: false,
          drainedKcalPer100g: null,
          drainedProteinPer100g: null,
          drainedCarbsPer100g: null,
          drainedFatPer100g: null,
          usualDrainedG: null,
        };

        const res = await productRepo.create(db, productInput, "ai_estimate");
        if (res.ok) {
          await pantryRepo.addStock(db, {
            productId: res.id,
            kind: "supplement",
            units: 1,
            netWeightG: item.containerSize,
            location: "cupboard",
            expiresAt: null,
            unit: item.unit,
          });
        }
      }
      router.dismissTo("/pantry");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Couldn't save supplements to pantry.");
      setSavingAll(false);
    }
  };

  const pickExpiry = () => {
    DateTimePickerAndroid.open({
      value: expiresAt ? dayFromKey(expiresAt) : new Date(),
      mode: "date",
      onValueChange: (_event, date) => setExpiresAt(date ? dayKey(date) : null),
    });
  };

  const handleSave = async () => {
    if (!hasValidName) {
      setError("Please enter a supplement name.");
      return;
    }
    if (!hasValidContainer) {
      setError(
        unit === "g"
          ? "Please enter container weight in grams."
          : `Please enter number of ${unit} per bottle.`,
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const validServing = Number.isFinite(servingDose) && servingDose > 0 ? servingDose : null;

      // Calculate per 100g or per unit nutrition
      let kcalPer100 = 0;
      let proteinPer100: number | null = null;
      let carbsPer100: number | null = null;
      let fatPer100: number | null = null;

      if (showNutrition) {
        const kcal = Number(kcalText.trim().replace(",", "."));
        const protein = Number(proteinText.trim().replace(",", "."));
        const carbs = Number(carbsText.trim().replace(",", "."));
        const fat = Number(fatText.trim().replace(",", "."));

        const baseDose = validServing ?? 1;
        if (Number.isFinite(kcal) && kcal >= 0) {
          kcalPer100 = unit === "g" ? Math.round((kcal / baseDose) * 100) : kcal;
        }
        if (Number.isFinite(protein) && protein >= 0) {
          proteinPer100 = unit === "g" ? Math.round(((protein / baseDose) * 100) * 10) / 10 : protein;
        }
        if (Number.isFinite(carbs) && carbs >= 0) {
          carbsPer100 = unit === "g" ? Math.round(((carbs / baseDose) * 100) * 10) / 10 : carbs;
        }
        if (Number.isFinite(fat) && fat >= 0) {
          fatPer100 = unit === "g" ? Math.round(((fat / baseDose) * 100) * 10) / 10 : fat;
        }
      }

      const servingLabel =
        unit === "g"
          ? validServing ? `${validServing} g scoop` : "1 scoop"
          : validServing ? `${validServing} ${unit}` : `1 ${unit}`;

      const cleanBarcode = barcode.trim() || null;
      const productInput: ProductInput = {
        name: name.trim(),
        brand: brand.trim() || null,
        barcode: cleanBarcode,
        servingSize: servingLabel,
        servingGrams: validServing,
        kcalPer100g: kcalPer100,
        proteinPer100g: proteinPer100,
        carbsPer100g: carbsPer100,
        fatPer100g: fatPer100,
        netWeightG: containerSize,
        eatenDrained: false,
        drainedKcalPer100g: null,
        drainedProteinPer100g: null,
        drainedCarbsPer100g: null,
        drainedFatPer100g: null,
        usualDrainedG: null,
      };

      const existing = cleanBarcode ? await productRepo.findByBarcode(db, cleanBarcode) : null;
      const result = existing
        ? await productRepo.update(db, existing.id, productInput)
        : await productRepo.create(db, productInput, source);

      if (!result.ok) {
        if (result.error === "duplicate_barcode") {
          setError("Another product already uses this barcode.");
        } else {
          setError("Couldn't save this product.");
        }
        setSaving(false);
        return;
      }

      // Automatically add stock to pantry
      await pantryRepo.addStock(db, {
        productId: result.id,
        kind: "supplement",
        units: unitsBought,
        netWeightG: containerSize,
        location,
        expiresAt,
        unit,
      });

      router.dismissTo("/pantry");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save supplement.");
      setSaving(false);
    }
  };

  const containerLabel =
    unit === "g"
      ? "Container net weight (g)"
      : unit === "tabs"
        ? "Tablets per bottle"
        : "Capsules per bottle";

  const doseLabel =
    unit === "g"
      ? "Scoop size in grams"
      : unit === "tabs"
        ? "Tablets per dose"
        : "Capsules per dose";

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Pantry</Text>
        </Pressable>
        <Text style={styles.h1} accessibilityRole="header">
          New Supplement
        </Text>
        <Text style={styles.sub}>Add directly to pantry stock</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.space[6] }]} keyboardShouldPersistTaps="handled">
        {/* AI Quick Fill Card */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiTitleRow}>
              <SymbolView
                name={{ android: "auto_awesome", web: "auto_awesome" }}
                tintColor={theme.colors.accent}
                size={18}
              />
              <Text style={styles.aiTitle}>AI Quick Fill</Text>
            </View>
            <Text style={styles.aiBadge}>AI Assistant</Text>
          </View>
          <Text style={styles.aiSub}>
            Type or paste product text or a list to autofill.
          </Text>

          <TextInput
            value={aiInput}
            onChangeText={(t) => {
              setAiInput(t);
              if (aiError) setAiError(null);
            }}
            placeholder={"e.g. Krea by Wheyl 300g\n324g Wake pre-workout by Wheyl"}
            placeholderTextColor={theme.colors.faint}
            multiline
            numberOfLines={2}
            style={styles.aiInput}
          />

          <View style={styles.aiActionsRow}>
            <Pressable
              onPress={handleParseAi}
              disabled={aiParsing || !aiInput.trim()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.aiParseBtn,
                (!aiInput.trim() || aiParsing) && styles.aiParseBtnDisabled,
                pressed && styles.aiParseBtnPressed,
              ]}
            >
              {aiParsing ? (
                <ActivityIndicator size="small" color={theme.colors.accentInk} />
              ) : (
                <>
                  <SymbolView
                    name={{ android: "auto_awesome", web: "auto_awesome" }}
                    tintColor={theme.colors.accentInk}
                    size={16}
                  />
                  <Text style={styles.aiParseBtnText}>Parse with AI</Text>
                </>
              )}
            </Pressable>

            {aiInput.trim().length > 0 && !aiParsing && (
              <Pressable
                onPress={() => {
                  setAiInput("");
                  setAiParsedItems([]);
                  setAiSuccessNote(null);
                  setAiError(null);
                }}
                accessibilityRole="button"
                style={styles.aiClearBtn}
              >
                <Text style={styles.aiClearBtnText}>Clear</Text>
              </Pressable>
            )}
          </View>

          {aiError && (
            <View style={styles.aiErrorRow}>
              <Text style={styles.aiErrorText}>{aiError}</Text>
              {aiError.includes("Settings") && (
                <Pressable onPress={() => router.push("/settings")}>
                  <Text style={styles.aiSettingsLink}>Go to Settings →</Text>
                </Pressable>
              )}
            </View>
          )}

          {aiSuccessNote && (
            <Text style={styles.aiSuccessText} accessibilityLiveRegion="polite">
              {aiSuccessNote}
            </Text>
          )}

          {/* If multiple items were parsed, show preview cards */}
          {aiParsedItems.length > 0 && (
            <View style={styles.multiPreviewBox}>
              <Text style={styles.multiPreviewTitle}>
                Parsed Items ({aiParsedItems.length}):
              </Text>
              {aiParsedItems.map((item, idx) => {
                const brandStr = item.brand ? `${item.brand} • ` : "";
                const doseStr = `${item.containerSize} ${item.unit} (${item.servingDose} ${item.unit}/dose)`;
                return (
                  <View key={`${item.name}-${idx}`} style={styles.multiPreviewCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.multiItemName}>
                        {brandStr}
                        {item.name}
                      </Text>
                      <Text style={styles.multiItemMeta}>{doseStr}</Text>
                      {item.notes ? (
                        <Text style={styles.multiItemNotes}>{item.notes}</Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => applyParsedItemToForm(item)}
                      style={styles.multiItemFillBtn}
                      accessibilityRole="button"
                    >
                      <Text style={styles.multiItemFillText}>Use in form</Text>
                    </Pressable>
                  </View>
                );
              })}

              <Pressable
                onPress={handleSaveAllParsedToPantry}
                disabled={savingAll}
                style={({ pressed }) => [
                  styles.saveAllBtn,
                  savingAll && styles.saveAllBtnDisabled,
                  pressed && styles.saveAllBtnPressed,
                ]}
                accessibilityRole="button"
              >
                {savingAll ? (
                  <ActivityIndicator size="small" color={theme.colors.accentInk} />
                ) : (
                  <>
                    <SymbolView
                      name={{ android: "check", web: "check" }}
                      tintColor={theme.colors.accentInk}
                      size={18}
                    />
                    <Text style={styles.saveAllBtnText}>
                      Save All ({aiParsedItems.length}) to Pantry
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* Barcode row with scan button */}
        <View style={styles.field}>
          <Text style={styles.label}>Barcode (optional)</Text>
          <View style={styles.barcodeRow}>
            <TextInput
              value={barcode}
              onChangeText={setBarcode}
              onSubmitEditing={() => handleBarcodeLookup(barcode)}
              placeholder="e.g. 074892702410"
              placeholderTextColor={theme.colors.faint}
              keyboardType="number-pad"
              returnKeyType="search"
              style={[styles.input, { flex: 1 }]}
            />
            <Pressable
              onPress={() => setScannerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Scan barcode with camera"
              style={({ pressed }) => [styles.scanBtn, pressed && styles.scanBtnPressed]}
            >
              <SymbolView
                name={{ android: "barcode_scanner", web: "barcode_scanner" }}
                tintColor={theme.colors.accentText}
                size={20}
              />
              <Text style={styles.scanBtnText}>Scan</Text>
            </Pressable>
          </View>
          {lookingUp && (
            <View style={styles.lookupRow}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.lookupText}>Looking up barcode on Open Food Facts...</Text>
            </View>
          )}
          {!lookingUp && lookupNote && (
            <Text style={styles.lookupNote} accessibilityLiveRegion="polite">
              {lookupNote}
            </Text>
          )}
        </View>

        {/* Basic Info */}
        <View style={styles.field}>
          <Text style={styles.label}>Supplement Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Just Whey Vanilla, Creatine, Multivitamin"
            placeholderTextColor={theme.colors.faint}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Brand (optional)</Text>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g. Optimum Nutrition, Kirkland, Thorne"
            placeholderTextColor={theme.colors.faint}
            style={styles.input}
          />
        </View>

        {/* Unit Selector */}
        <View style={styles.field}>
          <Text style={styles.label}>Supplement Form</Text>
          <View style={styles.unitChips}>
            {UNITS.map((u) => {
              const on = u.value === unit;
              return (
                <Pressable
                  key={u.value}
                  onPress={() => setUnit(u.value)}
                  style={[styles.unitChip, on && styles.unitChipOn]}
                >
                  <Text style={styles.unitChipIcon}>{u.icon}</Text>
                  <Text style={[styles.unitChipLabel, on && styles.unitChipLabelOn]}>{u.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sizes */}
        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>{containerLabel} *</Text>
            <TextInput
              value={containerSizeText}
              onChangeText={setContainerSizeText}
              placeholder={unit === "g" ? "e.g. 1000" : "e.g. 120"}
              placeholderTextColor={theme.colors.faint}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{doseLabel}</Text>
            <TextInput
              value={servingDoseText}
              onChangeText={setServingDoseText}
              placeholder={unit === "g" ? "e.g. 30" : "e.g. 1"}
              placeholderTextColor={theme.colors.faint}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
        </View>

        {/* Stock added */}
        <View style={styles.card}>
          <View style={styles.stepperRow}>
            <Text style={styles.cardLabel}>{unit === "g" ? "Containers bought" : "Bottles bought"}</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setUnitsBought((u) => Math.max(1, u - 1))}
                accessibilityRole="button"
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{unitsBought}</Text>
              <Pressable
                onPress={() => setUnitsBought((u) => u + 1)}
                accessibilityRole="button"
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          {hasValidContainer && (
            <Text style={styles.stockPreview}>
              Initial stock: <Text style={{ color: theme.colors.accentText, fontWeight: "700" }}>{formatAmount(unitsBought * containerSize, unit)}</Text>
            </Text>
          )}

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>Storage Location</Text>
            <View style={styles.chips}>
              {LOCATIONS.map((loc) => {
                const on = loc === location;
                return (
                  <Pressable
                    key={loc}
                    onPress={() => setLocation(loc)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>
                      {loc.charAt(0).toUpperCase() + loc.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Expiry date (optional)</Text>
            <View style={styles.row}>
              <Pressable onPress={pickExpiry} style={[styles.input, styles.dateInput]}>
                <Text style={{ color: expiresAt ? theme.colors.text : theme.colors.faint }}>
                  {expiresAt ? formatDayShort(expiresAt) : "Set date"}
                </Text>
              </Pressable>
              {expiresAt && (
                <Pressable onPress={() => setExpiresAt(null)} style={styles.clearDateBtn}>
                  <Text style={styles.clearDateText}>Clear</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Optional Nutrition */}
        <Pressable
          onPress={() => setShowNutrition((s) => !s)}
          style={styles.toggleNutritionBtn}
        >
          <Text style={styles.toggleNutritionText}>
            {showNutrition ? "▾ Hide nutrition / macros" : "▸ Add nutrition / macros (optional)"}
          </Text>
        </Pressable>

        {showNutrition && (
          <View style={styles.card}>
            <Text style={styles.nutritionHint}>
              Enter macros per serving ({servingDoseText ? `${servingDoseText} ${unit}` : "1 dose"}). For vitamins or creatine, you can leave these as 0.
            </Text>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Calories (kcal)</Text>
                <TextInput
                  value={kcalText}
                  onChangeText={setKcalText}
                  placeholder="0"
                  placeholderTextColor={theme.colors.faint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Protein (g)</Text>
                <TextInput
                  value={proteinText}
                  onChangeText={setProteinText}
                  placeholder="0"
                  placeholderTextColor={theme.colors.faint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Carbs (g)</Text>
                <TextInput
                  value={carbsText}
                  onChangeText={setCarbsText}
                  placeholder="0"
                  placeholderTextColor={theme.colors.faint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Fat (g)</Text>
                <TextInput
                  value={fatText}
                  onChangeText={setFatText}
                  placeholder="0"
                  placeholderTextColor={theme.colors.faint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
            </View>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          onPress={handleSave}
          disabled={saving || !hasValidName}
          accessibilityRole="button"
          style={({ pressed }) => [styles.submitBtn, (!hasValidName || saving) && styles.submitBtnDisabled, pressed && styles.submitBtnPressed]}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.accentInk} />
          ) : (
            <Text style={styles.submitBtnText}>Save &amp; Add to Pantry</Text>
          )}
        </Pressable>
      </ScrollView>

      <BarcodeScanModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleBarcodeLookup}
      />
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    appbar: {
      paddingHorizontal: space[4],
      paddingTop: space[2],
      paddingBottom: space[3],
    },
    backBtn: {
      paddingBottom: space[1],
    },
    backText: {
      color: colors.accentText,
      fontSize: fontSize.sm,
      fontWeight: "600",
    },
    h1: {
      color: colors.text,
      fontSize: fontSize.xl,
      fontWeight: "700",
      letterSpacing: -0.5,
    },
    sub: {
      color: colors.muted,
      fontSize: fontSize.sm,
      marginTop: 2,
    },
    content: {
      paddingHorizontal: space[4],
      gap: space[3],
    },
    field: {
      flex: 1,
      gap: space[1],
    },
    label: {
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "600",
    },
    input: {
      height: tap,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.surface2,
      backgroundColor: colors.surface2,
      paddingHorizontal: space[3],
      color: colors.text,
      fontSize: fontSize.md,
      fontVariant: ["tabular-nums"],
    },
    dateInput: {
      flex: 1,
      justifyContent: "center",
    },
    clearDateBtn: {
      height: tap,
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    clearDateText: {
      color: colors.muted,
      fontSize: fontSize.sm,
    },
    row: {
      flexDirection: "row",
      gap: space[2],
    },
    barcodeRow: {
      flexDirection: "row",
      gap: space[2],
    },
    lookupRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
      marginTop: space[1],
    },
    lookupText: {
      color: colors.muted,
      fontSize: fontSize.xs,
    },
    lookupNote: {
      color: colors.accentText,
      fontSize: fontSize.xs,
      marginTop: space[1],
    },
    scanBtn: {
      height: tap,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space[1],
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    scanBtnPressed: {
      backgroundColor: colors.accentSoft,
    },
    scanBtnText: {
      color: colors.accentText,
      fontSize: fontSize.sm,
      fontWeight: "600",
    },
    unitChips: {
      flexDirection: "row",
      gap: space[2],
    },
    unitChip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space[1],
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unitChipOn: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    unitChipIcon: {
      fontSize: 14,
    },
    unitChipLabel: {
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "500",
    },
    unitChipLabelOn: {
      color: colors.accentText,
      fontWeight: "700",
    },
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: space[4],
      gap: space[3],
    },
    cardLabel: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: "600",
    },
    stepperRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
    },
    stepperBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepperBtnText: {
      color: colors.text,
      fontSize: fontSize.lg,
      fontWeight: "700",
    },
    stepperValue: {
      color: colors.text,
      fontSize: fontSize.lg,
      fontWeight: "700",
      minWidth: 24,
      textAlign: "center",
    },
    stockPreview: {
      color: colors.muted,
      fontSize: fontSize.sm,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    chips: {
      flexDirection: "row",
      gap: space[2],
    },
    chip: {
      height: 32,
      paddingHorizontal: space[3],
      borderRadius: radius.pill,
      backgroundColor: colors.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    chipOn: {
      backgroundColor: colors.accentSoft,
    },
    chipLabel: {
      color: colors.muted,
      fontSize: fontSize.sm,
    },
    chipLabelOn: {
      color: colors.accentText,
      fontWeight: "600",
    },
    toggleNutritionBtn: {
      paddingVertical: space[2],
    },
    toggleNutritionText: {
      color: colors.accentText,
      fontSize: fontSize.sm,
      fontWeight: "600",
    },
    nutritionHint: {
      color: colors.muted,
      fontSize: fontSize.xs,
      lineHeight: 18,
    },
    errorText: {
      color: colors.over,
      fontSize: fontSize.sm,
    },
    submitBtn: {
      minHeight: tap,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginTop: space[2],
    },
    submitBtnDisabled: {
      opacity: 0.5,
    },
    submitBtnPressed: {
      opacity: 0.85,
    },
    submitBtnText: {
      color: colors.accentInk,
      fontSize: fontSize.md,
      fontWeight: "700",
    },
    aiCard: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: space[4],
      gap: space[2],
      marginBottom: space[2],
    },
    aiHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    aiTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
    },
    aiTitle: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: "700",
    },
    aiBadge: {
      color: colors.accentText,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: space[2],
      paddingVertical: 2,
      borderRadius: radius.pill,
      fontSize: fontSize.xs,
      fontWeight: "600",
    },
    aiSub: {
      color: colors.muted,
      fontSize: fontSize.xs,
      lineHeight: 18,
    },
    aiInput: {
      minHeight: 56,
      maxHeight: 120,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      color: colors.text,
      fontSize: fontSize.sm,
      textAlignVertical: "top",
    },
    aiActionsRow: {
      flexDirection: "row",
      gap: space[2],
      alignItems: "center",
      marginTop: space[1],
    },
    aiParseBtn: {
      height: 38,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space[2],
      paddingHorizontal: space[4],
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    aiParseBtnDisabled: {
      opacity: 0.5,
    },
    aiParseBtnPressed: {
      opacity: 0.85,
    },
    aiParseBtnText: {
      color: colors.accentInk,
      fontSize: fontSize.sm,
      fontWeight: "700",
    },
    aiClearBtn: {
      height: 38,
      paddingHorizontal: space[3],
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    aiClearBtnText: {
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "500",
    },
    aiErrorRow: {
      marginTop: space[1],
      gap: 4,
    },
    aiErrorText: {
      color: colors.over,
      fontSize: fontSize.xs,
    },
    aiSettingsLink: {
      color: colors.accentText,
      fontSize: fontSize.xs,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
    aiSuccessText: {
      color: colors.accentText,
      fontSize: fontSize.xs,
      fontWeight: "600",
      marginTop: space[1],
    },
    multiPreviewBox: {
      marginTop: space[2],
      paddingTop: space[3],
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: space[2],
    },
    multiPreviewTitle: {
      color: colors.text,
      fontSize: fontSize.sm,
      fontWeight: "700",
    },
    multiPreviewCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface2,
      padding: space[3],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      gap: space[2],
    },
    multiItemName: {
      color: colors.text,
      fontSize: fontSize.sm,
      fontWeight: "600",
    },
    multiItemMeta: {
      color: colors.muted,
      fontSize: fontSize.xs,
      marginTop: 2,
    },
    multiItemNotes: {
      color: colors.accentText,
      fontSize: fontSize.xs,
      marginTop: 2,
    },
    multiItemFillBtn: {
      backgroundColor: colors.accentSoft,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    multiItemFillText: {
      color: colors.accentText,
      fontSize: fontSize.xs,
      fontWeight: "700",
    },
    saveAllBtn: {
      minHeight: tap,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space[2],
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
      marginTop: space[2],
    },
    saveAllBtnDisabled: {
      opacity: 0.5,
    },
    saveAllBtnPressed: {
      opacity: 0.85,
    },
    saveAllBtnText: {
      color: colors.accentInk,
      fontSize: fontSize.sm,
      fontWeight: "700",
    },
  });
}
