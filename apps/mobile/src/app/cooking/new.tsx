import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import {
  parseRawIngredients,
  type ParsedRawIngredient,
} from "@/modules/recipes/services/aiCookingParser";
import { batchRepo } from "@/modules/recipes/repositories/batchRepo";
import * as productRepo from "@/modules/nutrition/repositories/productRepo";
import { monthDay } from "@/modules/pantry/services/pantryStock";
import { dayKey } from "@/modules/nutrition/services/mealTime";

const PRESETS = {
  adobo: {
    title: "Chicken Adobo (Skinless Thighs)",
    text: `500g chicken thighs, boneless skinless raw
3 tbsp soy sauce (~45g)
2 tbsp cane vinegar (~30g)
1 tbsp brown sugar (~12g)
15g garlic minced
1 tbsp canola cooking oil (~14g)`,
    defaultCookedG: "385",
  },
  chopsuey: {
    title: "Chopsuey Batch",
    text: `32g broccoli stem
283g broccoli florets
194.8g carrots
45g onions
22g garlic
1 tbsp soy sauce (~16g)
1 tbsp oyster sauce (~18g)`,
    defaultCookedG: "532",
  },
  tuna: {
    title: "Tuna Pasta Batch",
    text: `250g raw pasta
180g canned tuna in water
1 tbsp olive oil (~14g)
50g onion minced
2 cloves garlic (~10g)`,
    defaultCookedG: "620",
  },
};

type Step = "ingredients" | "timer" | "scale" | "saved";

export default function CookingFlowScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [step, setStep] = useState<Step>("ingredients");
  const [dishTitle, setDishTitle] = useState("Chicken Adobo (Skinless Thighs)");
  const [rawText, setRawText] = useState(PRESETS.adobo.text);
  const [activePreset, setActivePreset] = useState<"adobo" | "chopsuey" | "tuna" | null>("adobo");

  // AI & Parsing State
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<ParsedRawIngredient[]>([]);
  const [hasOil, setHasOil] = useState(true);

  // Active Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Scale & Cooked Weight State
  const [cookedWeightInput, setCookedWeightInput] = useState("385");
  const [saving, setSaving] = useState(false);
  const [savedBatchName, setSavedBatchName] = useState("");
  const [savedPantryItemId, setSavedPantryItemId] = useState<string | null>(null);

  const runParse = async (textToParse: string, title?: string) => {
    setParsing(true);
    setParseError(null);
    try {
      const res = await parseRawIngredients(db, textToParse, title || dishTitle);
      setIngredients(res.items);
      setHasOil(res.hasOil);
      if (res.dishTitle) setDishTitle(res.dishTitle);
    } catch (e: any) {
      setParseError(e.message || "Failed to parse raw ingredients.");
    } finally {
      setParsing(false);
    }
  };

  // Initialize raw parsing with preset on mount
  useEffect(() => {
    let cancelled = false;
    parseRawIngredients(db, PRESETS.adobo.text, PRESETS.adobo.title)
      .then((res) => {
        if (!cancelled) {
          setIngredients(res.items);
          setHasOil(res.hasOil);
          setParsing(false);
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          setParseError(e.message || "Failed to parse raw ingredients.");
          setParsing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [db]);

  // Back button handling
  useEffect(() => {
    const onBackPress = () => {
      if (step === "timer") {
        setStep("ingredients");
        return true;
      }
      if (step === "scale") {
        setStep("timer");
        return true;
      }
      if (step === "saved") {
        router.replace("/cooking" as any);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [step]);

  // Timer interval effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const loadPreset = (presetKey: "adobo" | "chopsuey" | "tuna") => {
    setActivePreset(presetKey);
    const p = PRESETS[presetKey];
    setDishTitle(p.title);
    setRawText(p.text);
    setCookedWeightInput(p.defaultCookedG);
    runParse(p.text, p.title);
  };

  const addOilPrompt = () => {
    const updated = rawText.trim() + "\n1 tbsp canola cooking oil (~14g)";
    setRawText(updated);
    setHasOil(true);
    runParse(updated, dishTitle);
  };

  const deleteIngredient = (id: string) => {
    const updated = ingredients.filter((i) => i.id !== id);
    setIngredients(updated);
  };

  // Raw totals
  const rawTotals = useMemo(() => {
    const rawG = ingredients.reduce((sum, i) => sum + i.rawGrams, 0);
    const kcal = ingredients.reduce((sum, i) => sum + i.kcal, 0);
    const protein = ingredients.reduce((sum, i) => sum + i.protein, 0);
    const carbs = ingredients.reduce((sum, i) => sum + i.carbs, 0);
    const fat = ingredients.reduce((sum, i) => sum + i.fat, 0);
    return {
      rawG,
      kcal: Math.round(kcal),
      protein: Number(protein.toFixed(1)),
      carbs: Number(carbs.toFixed(1)),
      fat: Number(fat.toFixed(1)),
    };
  }, [ingredients]);

  // Cooked macros calculations
  const cookedG = Math.max(1, parseFloat(cookedWeightInput.replace(",", ".")) || 1);
  const cookedDensity = Math.round((rawTotals.kcal / cookedG) * 100);
  const cookedRatio = rawTotals.rawG > 0 ? Number((cookedG / rawTotals.rawG).toFixed(2)) : 1;
  const per100Protein = Number(((rawTotals.protein / cookedG) * 100).toFixed(1));
  const per100Carbs = Number(((rawTotals.carbs / cookedG) * 100).toFixed(1));
  const per100Fat = Number(((rawTotals.fat / cookedG) * 100).toFixed(1));

  // Timer controls
  const toggleTimer = () => {
    setIsTimerRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const mm = m < 10 ? `0${m}` : `${m}`;
    const ss = s < 10 ? `0${s}` : `${s}`;
    return `${mm}:${ss}`;
  };

  const startCooking = () => {
    if (ingredients.length === 0) {
      Alert.alert("Raw Ingredients Required", "Please list and parse raw ingredients before cooking.");
      return;
    }
    setStep("timer");
    setIsTimerRunning(true);
  };

  const finishCooking = () => {
    setIsTimerRunning(false);
    setStep("scale");
  };

  const adjustScale = (delta: number) => {
    const current = parseFloat(cookedWeightInput) || 300;
    const next = Math.max(10, current + delta);
    setCookedWeightInput(next.toString());
  };

  const saveToInventory = async () => {
    if (cookedG <= 0) {
      Alert.alert("Invalid Weight", "Please enter the cooked weight from your scale.");
      return;
    }

    setSaving(true);
    try {
      // Ensure all ingredients have a matching product in DB
      const resolvedIngredients = [];
      const now = new Date().toISOString();

      for (const ing of ingredients) {
        let productId = ing.productId;
        if (!productId) {
          // Create product entry if none exists
          const saveRes = await productRepo.create(db, {
            barcode: null,
            name: ing.name,
            brand: null,
            servingSize: null,
            servingGrams: 100,
            kcalPer100g: ing.kcalPer100g,
            proteinPer100g: ing.proteinPer100g,
            carbsPer100g: ing.carbsPer100g,
            fatPer100g: ing.fatPer100g,
            netWeightG: null,
            eatenDrained: false,
            drainedKcalPer100g: null,
            drainedProteinPer100g: null,
            drainedCarbsPer100g: null,
            drainedFatPer100g: null,
            usualDrainedG: null,
          });
          if (saveRes.ok) {
            productId = saveRes.id;
          }
        }

        if (productId) {
          resolvedIngredients.push({
            productId,
            rawGrams: ing.rawGrams,
            kcalPer100g: ing.kcalPer100g,
            proteinPer100g: ing.proteinPer100g,
            carbsPer100g: ing.carbsPer100g,
            fatPer100g: ing.fatPer100g,
            isEstimated: false,
          });
        }
      }

      const formattedDate = monthDay(dayKey(new Date()));
      const batchName = `${dishTitle.trim()} · ${formattedDate}`;

      const res = await batchRepo.create(db, {
        name: batchName,
        cookedAt: now,
        cookedWeightG: cookedG,
        weightMethod: "settled",
        isSettled: true,
        cookTimeSeconds: timerSeconds > 0 ? timerSeconds : 1475,
        ingredients: resolvedIngredients,
      });

      setSavedBatchName(batchName);
      setSavedPantryItemId(res.pantryItemId);
      setStep("saved");
    } catch (e: any) {
      Alert.alert("Error Saving Batch", e.message || "Failed to save meal for inventory.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { paddingTop: insets.top }]}
    >
      {/* App Bar */}
      <View style={styles.appbar}>
        <Pressable
          onPress={() => {
            if (step === "timer") setStep("ingredients");
            else if (step === "scale") setStep("timer");
            else if (step === "saved") router.replace("/cooking" as any);
            else router.back();
          }}
          accessibilityRole="button"
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>‹ {step === "ingredients" ? "Hub" : "Back"}</Text>
        </Pressable>

        <View style={styles.appbarCenter}>
          <Text style={styles.appbarTitle} numberOfLines={1}>
            {step === "ingredients" ? "1 & 2 · Raw Ingredients" : step === "timer" ? "3 · Cooking Timer" : step === "scale" ? "4 & 5 · Cooked Weight" : "6 · Saved"}
          </Text>
          <Text style={styles.appbarSub} numberOfLines={1}>{dishTitle}</Text>
        </View>

        {step === "timer" ? (
          <View style={[styles.timerPill, !isTimerRunning && styles.timerPillPaused]}>
            <View style={[styles.timerDot, !isTimerRunning && styles.timerDotPaused]} />
            <Text style={[styles.timerPillText, !isTimerRunning && styles.timerPillTextPaused]}>
              {formatTimer(timerSeconds)}
            </Text>
          </View>
        ) : (
          <View style={styles.badgeAcc}>
            <Text style={styles.badgeAccText}>
              {step === "ingredients" ? "Raw Stage" : step === "scale" ? "Weighed" : "In Stock"}
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ================= STEP 1 & 2: INGREDIENTS ================= */}
        {step === "ingredients" && (
          <View style={styles.stepWrap}>
            {/* Dish Title Input */}
            <View style={styles.dishInputWrap}>
              <Text style={styles.fieldLabel}>DISH NAME</Text>
              <TextInput
                style={styles.dishTitleInput}
                value={dishTitle}
                onChangeText={setDishTitle}
                placeholder="e.g. Chicken Adobo (Skinless Thighs)"
                placeholderTextColor={theme.colors.muted}
              />
            </View>

            {/* Quick Presets */}
            <View style={styles.chipsRow}>
              <Pressable
                onPress={() => loadPreset("adobo")}
                style={[styles.chip, activePreset === "adobo" && styles.chipOn]}
              >
                <Text style={[styles.chipText, activePreset === "adobo" && styles.chipTextOn]}>
                  🍗 Chicken Adobo
                </Text>
              </Pressable>
              <Pressable
                onPress={() => loadPreset("chopsuey")}
                style={[styles.chip, activePreset === "chopsuey" && styles.chipOn]}
              >
                <Text style={[styles.chipText, activePreset === "chopsuey" && styles.chipTextOn]}>
                  🥦 Chopsuey
                </Text>
              </Pressable>
              <Pressable
                onPress={() => loadPreset("tuna")}
                style={[styles.chip, activePreset === "tuna" && styles.chipOn]}
              >
                <Text style={[styles.chipText, activePreset === "tuna" && styles.chipTextOn]}>
                  🐟 Tuna Pasta
                </Text>
              </Pressable>
            </View>

            {/* AI Textarea with Halo */}
            <View style={styles.halo}>
              <TextInput
                style={styles.textarea}
                value={rawText}
                onChangeText={(t) => {
                  setRawText(t);
                  setActivePreset(null);
                }}
                multiline
                numberOfLines={6}
                placeholder="List raw ingredients with grams or spoons (e.g. 500g raw chicken, 3 tbsp soy sauce, 1 tbsp oil...)"
                placeholderTextColor={theme.colors.muted}
                textAlignVertical="top"
              />
              <View style={styles.aiMetaBar}>
                <View style={styles.aiProviderPill}>
                  <Text style={styles.aiProviderPillText}>✨ Gemini 2.5 Flash / AI</Text>
                </View>
                <Text style={styles.aiMetaNote}>Raw ingredients only · No cooked weight</Text>
              </View>
            </View>

            <Pressable
              onPress={() => runParse(rawText, dishTitle)}
              disabled={parsing}
              style={({ pressed }) => [styles.parseAiBtn, pressed && styles.pressed]}
            >
              {parsing ? (
                <ActivityIndicator color={theme.colors.accentInk} size="small" />
              ) : (
                <>
                  <SymbolView name={{ android: "auto_awesome", web: "auto_awesome" }} tintColor={theme.colors.accentInk} size={18} />
                  <Text style={styles.parseAiBtnText}>✨ AI Parse Raw Ingredients</Text>
                </>
              )}
            </Pressable>

            {parseError && <Text style={styles.errorText}>{parseError}</Text>}

            {/* Total Raw Batch Nutrition Card */}
            <View style={styles.macroCard}>
              <View style={styles.macroCardHead}>
                <Text style={styles.macroCardTitle}>Total Raw Batch Nutrition</Text>
                <View style={styles.badgeEst}>
                  <Text style={styles.badgeEstText}>Before Cooking</Text>
                </View>
              </View>

              <View style={styles.macroGrid}>
                <View style={styles.macroBox}>
                  <Text style={styles.macroVal}>{rawTotals.kcal}</Text>
                  <Text style={styles.macroLabel}>Raw kcal</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.protein }]}>
                    {rawTotals.protein}g
                  </Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.carbs }]}>
                    {rawTotals.carbs}g
                  </Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.fat }]}>
                    {rawTotals.fat}g
                  </Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>

              <View style={styles.ratioBanner}>
                <Text style={styles.ratioBannerText}>
                  Total Raw Weight: <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{rawTotals.rawG} g</Text>
                </Text>
                <Text style={styles.ratioBannerText}>
                  Cooked weight: <Text style={{ color: theme.colors.muted }}>Weighed at the end</Text>
                </Text>
              </View>
            </View>

            {/* Parsed Ingredients List */}
            <Text style={styles.sectionLabel}>
              Raw Ingredients ({ingredients.length})
            </Text>
            <View style={styles.card}>
              {ingredients.map((ing, idx) => (
                <View key={ing.id} style={[styles.ingRow, idx > 0 && styles.divided]}>
                  <Text style={styles.ingAmtCol}>{ing.rawGrams} g</Text>
                  <View style={styles.ingInfoCol}>
                    <Text style={styles.ingName}>{ing.name}</Text>
                    <Text style={styles.ingMeta}>
                      {ing.kcal} kcal · {ing.protein}g P · {ing.carbs}g C · {ing.fat}g F
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => deleteIngredient(ing.id)}
                    style={styles.delBtn}
                    accessibilityRole="button"
                  >
                    <Text style={styles.delBtnText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>

            {/* Smart Oil Prompt Banner if no oil detected */}
            {!hasOil && (
              <View style={styles.warnCard}>
                <Text style={styles.warnIcon}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.warnTitle}>No cooking oil detected</Text>
                  <Text style={styles.warnSub}>
                    Did you use cooking oil or butter in the pan? Oil adds ~120 kcal per tablespoon.
                  </Text>
                  <Pressable onPress={addOilPrompt} style={styles.addOilBtn}>
                    <Text style={styles.addOilBtnText}>+ Add 1 tbsp oil (~14g)</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Next Button */}
            <Pressable
              onPress={startCooking}
              style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.pressed]}
            >
              <Text style={styles.primaryActionBtnText}>Start Cooking 🍳 →</Text>
            </Pressable>
          </View>
        )}

        {/* ================= STEP 3: ACTIVE TIMER ================= */}
        {step === "timer" && (
          <View style={styles.stepWrap}>
            {/* Hero Timer Card */}
            <View style={styles.timerHeroCard}>
              <Text style={styles.timerHeroSub}>COOKING DURATION TIMER</Text>
              <Text style={styles.timerHeroNum}>{formatTimer(timerSeconds)}</Text>
              <Text style={styles.timerStatusCaption}>
                {isTimerRunning ? "● Cooking pot on stove · Simmering" : "⏸ Cooking timer paused"}
              </Text>

              {/* Action Buttons Cluster identical to workout logger */}
              <View style={styles.timerBtnCluster}>
                <Pressable
                  onPress={toggleTimer}
                  style={[styles.timerCtrlBtn, !isTimerRunning && styles.timerCtrlBtnPaused]}
                >
                  <Text style={styles.timerCtrlBtnText}>
                    {isTimerRunning ? "⏸ Pause" : "▶ Resume"}
                  </Text>
                </Pressable>
                <Pressable onPress={finishCooking} style={styles.timerFinishBtn}>
                  <Text style={styles.timerFinishBtnText}>Finish 🏁</Text>
                </Pressable>
                <Pressable onPress={resetTimer} style={styles.timerResetBtn}>
                  <Text style={styles.timerResetBtnText}>↺</Text>
                </Pressable>
              </View>
            </View>

            {/* Dish Overview Card */}
            <View style={styles.card}>
              <View style={styles.dishOverviewHead}>
                <Text style={styles.dishOverviewTitle}>{dishTitle}</Text>
                <View style={styles.badgeAcc}>
                  <Text style={styles.badgeAccText}>Pot on stove</Text>
                </View>
              </View>
              <View style={styles.macroGrid}>
                <View style={styles.macroBox}>
                  <Text style={styles.macroVal}>{ingredients.length}</Text>
                  <Text style={styles.macroLabel}>Ingredients</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroVal}>{rawTotals.rawG} g</Text>
                  <Text style={styles.macroLabel}>Raw weight</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroVal}>{rawTotals.kcal}</Text>
                  <Text style={styles.macroLabel}>Raw kcal</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.protein }]}>
                    {rawTotals.protein}g
                  </Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
              </View>
            </View>

            {/* Pantry Deduction Notice */}
            <View style={styles.card}>
              <View style={styles.checkRow}>
                <View style={styles.checkSquare}>
                  <Text style={styles.checkSquareText}>✓</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkTitle}>Deduct raw items from Pantry</Text>
                  <Text style={styles.checkSub}>
                    Raw ingredients used in this dish will be automatically deducted from your pantry stock movements.
                  </Text>
                </View>
              </View>
            </View>

            {/* Scale Instruction Warning */}
            <View style={styles.warnCard}>
              <Text style={styles.warnIcon}>⚖️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.warnTitle}>When Cooking is Done</Text>
                <Text style={styles.warnSub}>
                  Tap Finish 🏁 once you turn off the stove. Tare your container to 0g on your kitchen scale and weigh the total cooked meal.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={finishCooking}
              style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.pressed]}
            >
              <Text style={styles.primaryActionBtnText}>Finish Cooking &amp; Weigh Dish ⚖️ →</Text>
            </Pressable>
          </View>
        )}

        {/* ================= STEP 4: ENCODE COOKED WEIGHT & MACROS ================= */}
        {step === "scale" && (
          <View style={styles.stepWrap}>
            <View style={styles.cookedTimeBanner}>
              <Text style={styles.cookedTimeBannerText}>
                ⏱️ Cooked for {formatTimer(timerSeconds)}
              </Text>
            </View>

            {/* Scale Box */}
            <Text style={styles.sectionLabel}>Total Cooked Weight (on scale)</Text>
            <View style={styles.scaleBox}>
              <Text style={styles.scaleHelperTitle}>PLACE FINISHED DISH ON SCALE</Text>
              <View style={styles.scaleNumWrap}>
                <TextInput
                  style={styles.scaleInput}
                  value={cookedWeightInput}
                  onChangeText={setCookedWeightInput}
                  keyboardType="numeric"
                />
                <Text style={styles.scaleUnit}>g</Text>
              </View>
              <View style={styles.scaleBtnRow}>
                <Pressable onPress={() => adjustScale(-20)} style={styles.scaleBtn}>
                  <Text style={styles.scaleBtnText}>-20g</Text>
                </Pressable>
                <Pressable onPress={() => adjustScale(-5)} style={styles.scaleBtn}>
                  <Text style={styles.scaleBtnText}>-5g</Text>
                </Pressable>
                <Pressable onPress={() => adjustScale(5)} style={styles.scaleBtn}>
                  <Text style={styles.scaleBtnText}>+5g</Text>
                </Pressable>
                <Pressable onPress={() => adjustScale(20)} style={styles.scaleBtn}>
                  <Text style={styles.scaleBtnText}>+20g</Text>
                </Pressable>
              </View>
            </View>

            {/* Calculated Estimated Macros */}
            <Text style={styles.sectionLabel}>Calculated Estimated Macros</Text>
            <View style={styles.heroMacroCard}>
              <View style={styles.heroDensityRow}>
                <View>
                  <Text style={styles.heroDensityNum}>
                    {cookedDensity} <Text style={styles.heroDensitySub}>kcal / 100g cooked</Text>
                  </Text>
                  <Text style={styles.heroRatioText}>
                    Cooked ratio: <Text style={{ color: theme.colors.accentText, fontWeight: "700" }}>×{cookedRatio}</Text> ({cookedG}g cooked ÷ {rawTotals.rawG}g raw)
                  </Text>
                </View>
                <View style={styles.badgeOk}>
                  <Text style={styles.badgeOkText}>Ready to Log</Text>
                </View>
              </View>

              <Text style={styles.per100Label}>Per 100g Cooked Nutrition:</Text>
              <View style={styles.macroGrid}>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.protein }]}>
                    {per100Protein}g
                  </Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.carbs }]}>
                    {per100Carbs}g
                  </Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.fat }]}>
                    {per100Fat}g
                  </Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroVal}>{rawTotals.kcal}</Text>
                  <Text style={styles.macroLabel}>Full Pot kcal</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.batchSummaryNote}>
                <Text style={{ fontWeight: "700", color: theme.colors.text }}>Entire cooked batch:</Text> {cookedG}g total = {rawTotals.kcal} kcal, {rawTotals.protein}g P, {rawTotals.carbs}g C, {rawTotals.fat}g F.
              </Text>
            </View>

            <Pressable
              onPress={saveToInventory}
              disabled={saving}
              style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.pressed]}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.accentInk} />
              ) : (
                <Text style={styles.primaryActionBtnText}>
                  Step 6: Save this meal for inventory 📦 →
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* ================= STEP 5: SAVED FOR INVENTORY ================= */}
        {step === "saved" && (
          <View style={styles.stepWrap}>
            <View style={styles.successCard}>
              <Text style={{ fontSize: 26 }}>🎉</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitle}>Meal Saved to Inventory!</Text>
                <Text style={styles.successSub}>
                  Available in your Fridge for today and upcoming meal logging.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.dishOverviewHead}>
                <Text style={styles.dishOverviewTitle}>🍲 {savedBatchName || dishTitle}</Text>
                <View style={styles.badgeOk}>
                  <Text style={styles.badgeOkText}>Active Batch</Text>
                </View>
              </View>

              <View style={styles.macroGrid}>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.accentText }]}>
                    {cookedG} g
                  </Text>
                  <Text style={styles.macroLabel}>Stock Left</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroVal}>{cookedDensity}</Text>
                  <Text style={styles.macroLabel}>kcal / 100g</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.protein }]}>
                    {per100Protein}g
                  </Text>
                  <Text style={styles.macroLabel}>Protein / 100g</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.timer }]}>
                    {formatTimer(timerSeconds)}
                  </Text>
                  <Text style={styles.macroLabel}>Cook Time</Text>
                </View>
              </View>

              <Text style={styles.batchStockInstruction}>
                When you eat, just scoop your portion and log the grams eaten (e.g. 150g = {Math.round((cookedDensity * 150) / 100)} kcal). The app deducts the stock automatically.
              </Text>
            </View>

            <View style={styles.actionBtnRow}>
              <Pressable
                onPress={() => {
                  if (savedPantryItemId) {
                    router.push({ pathname: "/pantry/portion/[itemId]", params: { itemId: savedPantryItemId } });
                  } else {
                    router.push("/(tabs)/log");
                  }
                }}
                style={[styles.primaryActionBtn, { flex: 1 }]}
              >
                <Text style={styles.primaryActionBtnText}>Log a portion now</Text>
              </Pressable>
              <Pressable
                onPress={() => router.replace("/cooking" as any)}
                style={[styles.ghostActionBtn, { flex: 1 }]}
              >
                <Text style={styles.ghostActionBtnText}>Back to Cooking</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => router.push("/meal-prep/new" as any)}
              style={styles.prepLinkCard}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.prepLinkTitle}>🍱 Prep this dish into Tupperwares?</Text>
                <Text style={styles.prepLinkSub}>Divide this cooked meal into lunch boxes (÷ N or manual)</Text>
              </View>
              <Text style={styles.prepLinkGo}>›</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    appbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: space[4],
      paddingVertical: space[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    backBtn: { paddingVertical: space[2], paddingRight: space[3] },
    backBtnText: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: "700" },
    appbarCenter: { flex: 1, paddingHorizontal: space[2] },
    appbarTitle: { fontSize: fontSize.sm, fontWeight: "800", color: colors.text },
    appbarSub: { fontSize: 11, color: colors.muted, marginTop: 1 },
    badgeAcc: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: colors.accentSoft,
    },
    badgeAccText: { color: colors.accentText, fontSize: 11, fontWeight: "700" },
    badgeEst: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: colors.estimateSoft,
    },
    badgeEstText: { color: colors.estimate, fontSize: 10, fontWeight: "700" },
    badgeOk: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: colors.okSoft,
    },
    badgeOkText: { color: colors.ok, fontSize: 11, fontWeight: "700" },
    timerPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.timerSoft,
    },
    timerPillPaused: { backgroundColor: colors.estimateSoft },
    timerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.timer },
    timerDotPaused: { backgroundColor: colors.estimate },
    timerPillText: { fontSize: fontSize.xs, fontWeight: "800", color: colors.timer },
    timerPillTextPaused: { color: colors.estimate },
    content: { padding: space[4], paddingBottom: space[6] },
    stepWrap: { gap: space[3] },
    dishInputWrap: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
    },
    fieldLabel: { fontSize: 10, fontWeight: "800", color: colors.muted, letterSpacing: 0.6 },
    dishTitleInput: {
      fontSize: fontSize.md,
      fontWeight: "700",
      color: colors.text,
      marginTop: 2,
      padding: 0,
    },
    chipsRow: { flexDirection: "row", gap: space[2], flexWrap: "wrap" },
    chip: {
      paddingHorizontal: space[3],
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: "transparent",
    },
    chipOn: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    chipText: { fontSize: fontSize.xs, color: colors.muted, fontWeight: "600" },
    chipTextOn: { color: colors.accentText, fontWeight: "700" },
    halo: {
      padding: 3,
      borderRadius: radius.md + 3,
      backgroundColor: colors.accentSoft,
    },
    textarea: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.accent,
      padding: space[3],
      fontSize: fontSize.sm,
      color: colors.text,
      minHeight: 115,
      lineHeight: 20,
    },
    aiMetaBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 6,
      paddingTop: 4,
      paddingBottom: 2,
    },
    aiProviderPill: {
      backgroundColor: colors.surface,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    aiProviderPillText: { fontSize: 10, fontWeight: "700", color: colors.accentText },
    aiMetaNote: { fontSize: 10, color: colors.muted },
    parseAiBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    parseAiBtnText: { color: colors.accentInk, fontSize: fontSize.sm, fontWeight: "800" },
    errorText: { color: colors.over, fontSize: fontSize.xs, marginTop: 2 },
    macroCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[3],
      gap: space[2],
    },
    macroCardHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    macroCardTitle: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text },
    macroGrid: {
      flexDirection: "row",
      gap: 6,
    },
    macroBox: {
      flex: 1,
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      paddingVertical: 6,
      paddingHorizontal: 4,
      alignItems: "center",
    },
    macroVal: { fontSize: fontSize.sm, fontWeight: "800", color: colors.text },
    macroLabel: { fontSize: 10, color: colors.muted, textTransform: "uppercase", fontWeight: "600", marginTop: 2 },
    ratioBanner: {
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      paddingVertical: 6,
      paddingHorizontal: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    ratioBannerText: { fontSize: 11, color: colors.muted },
    sectionLabel: {
      fontSize: fontSize.xs,
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      fontWeight: "700",
      marginTop: space[2],
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[3],
    },
    ingRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      gap: space[2],
    },
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
    ingAmtCol: { width: 55, fontSize: 13, fontWeight: "700", color: colors.text, textAlign: "right" },
    ingInfoCol: { flex: 1, minWidth: 0 },
    ingName: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text },
    ingMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
    delBtn: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
    delBtnText: { color: colors.muted, fontSize: 13 },
    warnCard: {
      backgroundColor: colors.estimateSoft,
      borderRadius: radius.md,
      padding: space[3],
      flexDirection: "row",
      gap: space[2],
      alignItems: "flex-start",
    },
    warnIcon: { fontSize: 18 },
    warnTitle: { fontSize: fontSize.xs, fontWeight: "800", color: colors.estimate },
    warnSub: { fontSize: 11, color: colors.text, lineHeight: 16, marginTop: 2 },
    addOilBtn: {
      alignSelf: "flex-start",
      backgroundColor: colors.surface,
      paddingHorizontal: space[3],
      paddingVertical: 5,
      borderRadius: radius.pill,
      marginTop: 6,
      borderWidth: 1,
      borderColor: colors.estimate,
    },
    addOilBtnText: { color: colors.estimate, fontSize: 11, fontWeight: "700" },
    primaryActionBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryActionBtnText: { color: colors.accentInk, fontSize: fontSize.sm, fontWeight: "800" },
    ghostActionBtn: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    ghostActionBtnText: { color: colors.text, fontSize: fontSize.sm, fontWeight: "700" },
    actionBtnRow: { flexDirection: "row", gap: space[2] },
    pressed: { opacity: 0.8 },

    /* Timer Styles */
    timerHeroCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[4],
      alignItems: "center",
      gap: space[2],
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 4,
    },
    timerHeroSub: { fontSize: 10, fontWeight: "800", color: colors.muted, letterSpacing: 0.8 },
    timerHeroNum: { fontSize: 48, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    timerStatusCaption: { fontSize: fontSize.xs, color: colors.muted },
    timerBtnCluster: {
      flexDirection: "row",
      gap: space[2],
      marginTop: space[2],
      width: "100%",
    },
    timerCtrlBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    timerCtrlBtnPaused: {
      backgroundColor: colors.estimateSoft,
      borderColor: colors.estimate,
    },
    timerCtrlBtnText: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text },
    timerFinishBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    timerFinishBtnText: { fontSize: fontSize.sm, fontWeight: "800", color: colors.accentInk },
    timerResetBtn: {
      width: 44,
      minHeight: 44,
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    timerResetBtnText: { fontSize: 18, color: colors.muted },
    dishOverviewHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space[2] },
    dishOverviewTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.text },
    checkRow: { flexDirection: "row", gap: space[2], alignItems: "center" },
    checkSquare: {
      width: 20,
      height: 20,
      borderRadius: 4,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    checkSquareText: { color: colors.accentInk, fontWeight: "800", fontSize: 12 },
    checkTitle: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text },
    checkSub: { fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 16 },

    /* Scale & Macros Styles */
    cookedTimeBanner: {
      backgroundColor: colors.timerSoft,
      padding: space[2],
      borderRadius: radius.sm,
      alignItems: "center",
    },
    cookedTimeBannerText: { color: colors.timer, fontSize: fontSize.xs, fontWeight: "700" },
    scaleBox: {
      backgroundColor: colors.surface2,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.accent,
      padding: space[4],
      alignItems: "center",
      gap: space[2],
    },
    scaleHelperTitle: { fontSize: 10, fontWeight: "800", color: colors.muted, letterSpacing: 0.8 },
    scaleNumWrap: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    scaleInput: {
      fontSize: 40,
      fontWeight: "800",
      color: colors.text,
      textAlign: "right",
      minWidth: 140,
      padding: 0,
    },
    scaleUnit: { fontSize: fontSize.lg, fontWeight: "700", color: colors.accentText },
    scaleBtnRow: { flexDirection: "row", gap: space[2] },
    scaleBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    scaleBtnText: { fontSize: fontSize.xs, fontWeight: "700", color: colors.text },
    heroMacroCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[4],
      gap: space[3],
    },
    heroDensityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    heroDensityNum: { fontSize: 26, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    heroDensitySub: { fontSize: fontSize.xs, fontWeight: "500", color: colors.muted },
    heroRatioText: { fontSize: 11, color: colors.muted, marginTop: 3 },
    per100Label: { fontSize: 10, fontWeight: "800", color: colors.muted, textTransform: "uppercase" },
    batchSummaryNote: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 18 },

    /* Saved step styles */
    successCard: {
      backgroundColor: colors.okSoft,
      borderWidth: 1,
      borderColor: colors.ok,
      borderRadius: radius.md,
      padding: space[3],
      flexDirection: "row",
      gap: space[3],
      alignItems: "center",
    },
    successTitle: { fontSize: fontSize.sm, fontWeight: "800", color: colors.ok },
    successSub: { fontSize: 11, color: colors.text, marginTop: 2 },
    batchStockInstruction: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 18, marginTop: space[2] },
    prepLinkCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[3],
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: space[2],
    },
    prepLinkTitle: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text },
    prepLinkSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
    prepLinkGo: { fontSize: fontSize.lg, color: colors.muted },
  });
}
