import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { mealPrepRepo } from "@/modules/mealprep/repositories/mealPrepRepo";
import {
  calculateEqualPartition,
  calculateManualPartition,
  type PartitionSummary,
} from "@/modules/mealprep/services/mealPrepCalc";
import type {
  AvailableCookedFood,
  PartitionMethod,
} from "@/modules/mealprep/types/mealPrep";

type Stage = "select" | "review" | "saved";

export default function MealPrepNewScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [stage, setStage] = useState<Stage>("select");
  const [cookedFoods, setCookedFoods] = useState<AvailableCookedFood[]>([]);
  const [selectedFoodIds, setSelectedFoodIds] = useState<Set<string>>(new Set());

  // Name & Identifier
  const [prepName, setPrepName] = useState("High-Protein Lunch Box");

  // Tupperware Count Stepper
  const [tupperwareCount, setTupperwareCount] = useState(5);

  // Partition Method
  const [method, setMethod] = useState<PartitionMethod>("equal");

  // Manual Grams map { foodId: gramsPerBox }
  const [manualGrams, setManualGrams] = useState<Record<string, number>>({});

  // AI Prompt
  const [aiPrompt, setAiPrompt] = useState(
    "Divide equally into 5 tupperwares for weekly office lunches. Each container gets equal parts of chicken, okra, eggs, and rice.",
  );

  // Saved result state
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Load available foods on mount
  useEffect(() => {
    mealPrepRepo.listAvailableCookedFoods(db).then((foods) => {
      setCookedFoods(foods);
      // Preselect all
      setSelectedFoodIds(new Set(foods.map((f) => f.id)));
      // Initialize manual grams to equal split
      const initManual: Record<string, number> = {};
      foods.forEach((f) => {
        initManual[f.id] = Math.round(f.gramsAvailable / 5);
      });
      setManualGrams(initManual);
    });
  }, [db]);

  // Back button navigation
  useEffect(() => {
    const onBackPress = () => {
      if (stage === "review") {
        setStage("select");
        return true;
      }
      if (stage === "saved") {
        router.replace("/meal-prep" as any);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [stage]);

  const toggleFood = (id: string) => {
    setSelectedFoodIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) {
          Alert.alert("Selection", "At least one cooked food item must be selected.");
          return prev;
        }
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const adjustCount = (delta: number) => {
    setTupperwareCount((prev) => Math.max(1, Math.min(20, prev + delta)));
  };

  const selectedFoodsList = useMemo(() => {
    return cookedFoods.filter((f) => selectedFoodIds.has(f.id));
  }, [cookedFoods, selectedFoodIds]);

  // Calculate partition summary
  const summary: PartitionSummary = useMemo(() => {
    if (method === "manual") {
      return calculateManualPartition(selectedFoodsList, manualGrams, tupperwareCount);
    }
    // "equal" and "ai" defaults to equal split math
    return calculateEqualPartition(selectedFoodsList, tupperwareCount);
  }, [selectedFoodsList, tupperwareCount, method, manualGrams]);

  const updateManualGram = (foodId: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setManualGrams((prev) => ({ ...prev, [foodId]: num }));
  };

  const handleSave = async () => {
    if (summary.compartments.length === 0) {
      Alert.alert("No items", "Please select at least one cooked food.");
      return;
    }

    setSaving(true);
    try {
      const id = await mealPrepRepo.create(db, {
        name: prepName.trim(),
        tupperwareCount,
        netWeightG: summary.netWeightPerBox,
        kcalPerBox: summary.kcalPerBox,
        proteinPerBox: summary.proteinPerBox,
        carbsPerBox: summary.carbsPerBox,
        fatPerBox: summary.fatPerBox,
        partitionMethod: method,
        aiPrompt: method === "ai" ? aiPrompt : null,
        items: summary.compartments.map((c) => ({
          foodName: c.foodName,
          gramsPerBox: c.gramsPerBox,
          batchId: c.batchId,
          pantryItemId: c.pantryItemId,
          kcal: c.kcal,
          protein: c.protein,
          carbs: c.carbs,
          fat: c.fat,
        })),
      });

      setSavedId(id);
      setStage("saved");
    } catch (e: any) {
      Alert.alert("Error saving meal prep", e.message || "Failed to save tupperware boxes.");
    } finally {
      setSaving(false);
    }
  };

  const handleEatOneSaved = async () => {
    if (!savedId) return;
    try {
      await mealPrepRepo.eatOneBox(db, savedId);
      Alert.alert("Enjoy your meal!", "Logged 1 tupperware into your Food Diary.");
      router.replace("/meal-prep" as any);
    } catch (e: any) {
      Alert.alert("Notice", e.message || "Could not log meal.");
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
            if (stage === "review") setStage("select");
            else if (stage === "saved") router.replace("/meal-prep" as any);
            else router.back();
          }}
          accessibilityRole="button"
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>‹ {stage === "select" ? "Hub" : "Back"}</Text>
        </Pressable>

        <View style={styles.appbarCenter}>
          <Text style={styles.appbarTitle}>
            {stage === "select" ? "1 · Partition Cooked Foods" : stage === "review" ? "2 · Review Tupperwares" : "3 · Saved"}
          </Text>
          <Text style={styles.appbarSub}>{prepName}</Text>
        </View>

        <View style={styles.badgeAcc}>
          <Text style={styles.badgeAccText}>
            {stage === "select" ? "Step 1 of 3" : stage === "review" ? "Calculated" : "5 Stored"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ================= STAGE 1: SELECT & PARTITION ================= */}
        {stage === "select" && (
          <View style={styles.stepWrap}>
            {/* Cooked Foods to Partition */}
            <Text style={styles.sectionLabel}>Cooked Foods to Partition</Text>
            <View style={styles.card}>
              {cookedFoods.map((f, idx) => {
                const isSelected = selectedFoodIds.has(f.id);
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => toggleFood(f.id)}
                    style={[styles.checkItemRow, idx > 0 && styles.divided]}
                  >
                    <View style={[styles.checkBox, isSelected && styles.checkBoxOn]}>
                      {isSelected && <Text style={styles.checkBoxCheck}>✓</Text>}
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.foodTitle}>{f.name}</Text>
                      <Text style={styles.foodSub}>
                        Total batch: {f.gramsAvailable}g · {Math.round((f.kcalPer100g * f.gramsAvailable) / 100)} kcal · {((f.proteinPer100g * f.gramsAvailable) / 100).toFixed(0)}g P
                      </Text>
                    </View>
                    <Text style={styles.foodGrams}>{f.gramsAvailable} g</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Meal Prep Name / Identifier */}
            <Text style={styles.sectionLabel}>Meal Prep Name / Identifier</Text>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.prepNameInput}
                value={prepName}
                onChangeText={setPrepName}
                placeholder="e.g. High-Protein Lunch Box"
                placeholderTextColor={theme.colors.muted}
              />
              <View style={styles.chipsRow}>
                <Pressable
                  onPress={() => setPrepName("High-Protein Lunch Box")}
                  style={[styles.chip, prepName === "High-Protein Lunch Box" && styles.chipOn]}
                >
                  <Text style={[styles.chipText, prepName === "High-Protein Lunch Box" && styles.chipTextOn]}>
                    🍱 High-Protein Lunch Box
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPrepName("Chicken & Okra Box")}
                  style={[styles.chip, prepName === "Chicken & Okra Box" && styles.chipOn]}
                >
                  <Text style={[styles.chipText, prepName === "Chicken & Okra Box" && styles.chipTextOn]}>
                    🍗 Chicken &amp; Okra Box
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPrepName("Gym Box A")}
                  style={[styles.chip, prepName === "Gym Box A" && styles.chipOn]}
                >
                  <Text style={[styles.chipText, prepName === "Gym Box A" && styles.chipTextOn]}>
                    💪 Gym Box A
                  </Text>
                </Pressable>
              </View>

              <View style={styles.identifierTipBanner}>
                <Text style={styles.identifierTipText}>
                  💡 <Text style={{ fontWeight: "700" }}>Identifier for Logging:</Text> Ginagamit ito para ma-identify sa Food Log o Text Log. Halimbawa: i-type ang <Text style={{ fontWeight: "700", color: theme.colors.text }}>1 tupperware {prepName}</Text> para auto-deduct sa inventory!
                </Text>
              </View>
            </View>

            {/* Tupperware Count Stepper */}
            <Text style={styles.sectionLabel}>How Many Tupperwares / Containers?</Text>
            <View style={styles.stepperCard}>
              <View>
                <Text style={styles.stepperCardTitle}>Tupperware Count</Text>
                <Text style={styles.stepperCardSub}>Number of meal boxes to fill</Text>
              </View>
              <View style={styles.stepperControls}>
                <Pressable onPress={() => adjustCount(-1)} style={styles.stepperBtn}>
                  <Text style={styles.stepperBtnText}>-</Text>
                </Pressable>
                <Text style={styles.stepperVal}>{tupperwareCount}</Text>
                <Pressable onPress={() => adjustCount(1)} style={styles.stepperBtn}>
                  <Text style={styles.stepperBtnText}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* Partitioning Method Selector */}
            <Text style={styles.sectionLabel}>Paano Hahatiin sa mga Tupperware?</Text>
            <View style={styles.modeSelector}>
              <Pressable
                onPress={() => setMethod("equal")}
                style={[styles.modeBtn, method === "equal" && styles.modeBtnOn]}
              >
                <Text style={[styles.modeBtnText, method === "equal" && styles.modeBtnTextOn]}>
                  ⚡ Pantay (÷ N)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMethod("manual")}
                style={[styles.modeBtn, method === "manual" && styles.modeBtnOn]}
              >
                <Text style={[styles.modeBtnText, method === "manual" && styles.modeBtnTextOn]}>
                  ⚖️ Mano-mano
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMethod("ai")}
                style={[styles.modeBtn, method === "ai" && styles.modeBtnOn]}
              >
                <Text style={[styles.modeBtnText, method === "ai" && styles.modeBtnTextOn]}>
                  ✨ AI Prompt
                </Text>
              </Pressable>
            </View>

            {/* Panel 1: Equal Split Mode (Default) */}
            {method === "equal" && (
              <View style={styles.card}>
                <View style={styles.panelHead}>
                  <Text style={styles.panelTitle}>
                    ⚡ Pantay na Hatian (Auto ÷ {tupperwareCount})
                  </Text>
                  <View style={styles.badgeOk}>
                    <Text style={styles.badgeOkText}>100% Offline Math</Text>
                  </View>
                </View>

                <View style={styles.compartmentList}>
                  {summary.compartments.map((c) => (
                    <View key={c.foodId} style={styles.compartmentItem}>
                      <Text style={styles.compartmentItemName}>
                        {c.foodName} (÷ {tupperwareCount})
                      </Text>
                      <Text style={styles.compartmentItemG}>{c.gramsPerBox} g / box</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.panelNote}>
                  💡 <Text style={{ fontWeight: "700" }}>Walang AI na kailangan:</Text> Awtomatikong hinati ang kabuuang pagkain sa {tupperwareCount} tupperwares (<Text style={{ fontWeight: "700", color: theme.colors.text }}>{summary.netWeightPerBox}g bawat kahon</Text>).
                </Text>
              </View>
            )}

            {/* Panel 2: Manual Grams Mode */}
            {method === "manual" && (
              <View style={styles.card}>
                <View style={styles.panelHead}>
                  <Text style={styles.panelTitle}>⚖️ Mano-manong Grams Bawat Tupperware</Text>
                  <View style={styles.badgeOk}>
                    <Text style={styles.badgeOkText}>Offline</Text>
                  </View>
                </View>
                <Text style={styles.panelSub}>I-set kung ilang grams ang ilalagay sa bawat tupperware box:</Text>

                {selectedFoodsList.map((f, idx) => {
                  const val = manualGrams[f.id] ?? Math.round(f.gramsAvailable / tupperwareCount);
                  const totalUsed = val * tupperwareCount;
                  const remaining = f.gramsAvailable - totalUsed;
                  return (
                    <View key={f.id} style={[styles.manualFoodRow, idx > 0 && styles.divided]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.foodTitle}>{f.name}</Text>
                        <Text style={styles.foodSub}>
                          Stock: {f.gramsAvailable}g · {totalUsed}g used ({remaining >= 0 ? `${remaining}g left` : `${Math.abs(remaining)}g over`})
                        </Text>
                      </View>
                      <View style={styles.manualInputWrap}>
                        <TextInput
                          style={styles.manualInput}
                          value={val.toString()}
                          onChangeText={(t) => updateManualGram(f.id, t)}
                          keyboardType="numeric"
                        />
                        <Text style={{ fontSize: 11, color: theme.colors.muted }}>g</Text>
                      </View>
                    </View>
                  );
                })}

                <Text style={styles.manualTotalNote}>
                  Total per container: {summary.netWeightPerBox}g net
                </Text>
              </View>
            )}

            {/* Panel 3: AI Prompt Mode */}
            {method === "ai" && (
              <View style={styles.card}>
                <View style={styles.panelHead}>
                  <Text style={styles.panelTitle}>✨ AI Partition Rule / Prompt</Text>
                  <View style={styles.badgeAcc}>
                    <Text style={styles.badgeAccText}>✨ Gemini 2.5 Flash</Text>
                  </View>
                </View>

                <TextInput
                  style={styles.aiPromptTextarea}
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.chipsRow}>
                  <Pressable
                    onPress={() => setAiPrompt("Divide equally into 5 tupperwares for weekly office lunches. Each container gets equal parts of chicken, okra, eggs, and rice.")}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>⚡ Divide equally</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setAiPrompt("High-protein focus: Put 150g chicken and 2 eggs in each tupperware with light rice.")}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>🔥 High-Protein</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setAiPrompt("Light carbs: Limit rice to 120g per container and maximize okra veggies.")}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>🥗 Light Rice</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Next Action */}
            <Pressable
              onPress={() => setStage("review")}
              style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.pressed]}
            >
              <Text style={styles.primaryActionBtnText}>
                Review {tupperwareCount} Tupperware Portions (÷ {tupperwareCount}) →
              </Text>
            </Pressable>
          </View>
        )}

        {/* ================= STAGE 2: REVIEW MACROS ================= */}
        {stage === "review" && (
          <View style={styles.stepWrap}>
            {/* Hero Tupperware Box Card */}
            <View style={styles.tupperHeroCard}>
              <View style={styles.tupperHeroBadgeRow}>
                <View style={styles.badgeBox}>
                  <Text style={styles.badgeBoxText}>🍱 {prepName} (1 of {tupperwareCount})</Text>
                </View>
                <Text style={styles.tupperNetWeightText}>{summary.netWeightPerBox} g net weight</Text>
              </View>

              <View style={styles.tupperKcalRow}>
                <Text style={styles.tupperKcalNum}>
                  {summary.kcalPerBox} <Text style={styles.tupperKcalSub}>kcal / box</Text>
                </Text>
                <View style={styles.badgeOk}>
                  <Text style={styles.badgeOkText}>Macro Verified</Text>
                </View>
              </View>

              <View style={styles.macroGrid}>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.protein }]}>
                    {summary.proteinPerBox}g
                  </Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.carbs }]}>
                    {summary.carbsPerBox}g
                  </Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.fat }]}>
                    {summary.fatPerBox}g
                  </Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroVal}>100%</Text>
                  <Text style={styles.macroLabel}>Portioned</Text>
                </View>
              </View>

              {/* Items Inside each box */}
              <View style={styles.compartmentList}>
                {summary.compartments.map((c) => (
                  <View key={c.foodId} style={styles.compartmentItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.compartmentItemName}>{c.foodName}</Text>
                      <Text style={styles.compartmentItemMeta}>
                        · {c.kcal} kcal, {c.protein}g P
                      </Text>
                    </View>
                    <Text style={styles.compartmentItemG}>{c.gramsPerBox} g</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Inventory impact summary */}
            <View style={styles.card}>
              <Text style={styles.impactText}>
                <Text style={{ fontWeight: "700", color: theme.colors.text }}>📦 Inventory Impact:</Text> Deducts the used portion of cooked batches from fridge inventory, creating <Text style={{ fontWeight: "700", color: theme.colors.text }}>{tupperwareCount} ready-to-eat tupperwares</Text>.
              </Text>
            </View>

            {/* Identifier Syntax Guide */}
            <View style={styles.syntaxCard}>
              <View style={styles.syntaxHead}>
                <Text style={styles.syntaxTag}>🏷️ Identifier: {prepName}</Text>
                <View style={styles.badgeOk}>
                  <Text style={styles.badgeOkText}>AI Searchable</Text>
                </View>
              </View>
              <Text style={styles.syntaxSub}>
                Kapag kakainin mo ito, puwede mong i-log sa <Text style={{ fontWeight: "700" }}>Text Log</Text>:
              </Text>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>Breakfast:</Text>
                <Text style={styles.codeText}>1 tupperware {prepName}</Text>
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.pressed]}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.accentInk} />
              ) : (
                <Text style={styles.primaryActionBtnText}>
                  Save {tupperwareCount} Tupperwares to Meal Prep Inventory 📦 →
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* ================= STAGE 3: SAVED CONFIRMATION ================= */}
        {stage === "saved" && (
          <View style={styles.stepWrap}>
            <View style={styles.successCard}>
              <Text style={{ fontSize: 28 }}>🍱</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitle}>Meal Prep Saved to Inventory!</Text>
                <Text style={styles.successSub}>
                  {tupperwareCount} tupperware containers stacked and ready in your fridge.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.dishOverviewHead}>
                <Text style={styles.dishOverviewTitle}>🍱 {prepName}</Text>
                <View style={styles.badgeOk}>
                  <Text style={styles.badgeOkText}>In Fridge</Text>
                </View>
              </View>
              <View style={styles.macroGrid}>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.accentText }]}>
                    {tupperwareCount}
                  </Text>
                  <Text style={styles.macroLabel}>Containers</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroVal}>{summary.kcalPerBox}</Text>
                  <Text style={styles.macroLabel}>kcal/box</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={[styles.macroVal, { color: theme.colors.protein }]}>
                    {summary.proteinPerBox}g
                  </Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroVal}>{summary.netWeightPerBox}g</Text>
                  <Text style={styles.macroLabel}>Net Wt</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={handleEatOneSaved}
              style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.pressed]}
            >
              <Text style={styles.primaryActionBtnText}>Eat 1 Box Now 🍽️</Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace("/meal-prep" as any)}
              style={styles.ghostActionBtn}
            >
              <Text style={styles.ghostActionBtnText}>Go to Meal Prep Hub</Text>
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
    badgeOk: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: colors.okSoft,
    },
    badgeOkText: { color: colors.ok, fontSize: 10, fontWeight: "700" },
    badgeBox: {
      backgroundColor: "rgba(245, 184, 65, 0.16)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    badgeBoxText: { color: "#f5b841", fontSize: 11, fontWeight: "800" },
    content: { padding: space[4], paddingBottom: space[6] },
    stepWrap: { gap: space[3] },
    sectionLabel: {
      fontSize: fontSize.xs,
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      fontWeight: "700",
      marginTop: space[1],
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[3],
    },
    checkItemRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
    },
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
    checkBox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: space[2],
      backgroundColor: colors.surface2,
    },
    checkBoxOn: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    checkBoxCheck: { color: colors.accentInk, fontWeight: "800", fontSize: 13 },
    foodTitle: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text },
    foodSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
    foodGrams: { fontSize: fontSize.sm, fontWeight: "800", color: colors.text },
    inputCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[3],
      gap: space[2],
    },
    prepNameInput: {
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      paddingHorizontal: space[3],
      paddingVertical: 8,
      fontSize: fontSize.sm,
      fontWeight: "700",
      color: colors.text,
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
    chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    chipText: { fontSize: fontSize.xs, color: colors.muted, fontWeight: "600" },
    chipTextOn: { color: colors.accentText, fontWeight: "700" },
    identifierTipBanner: {
      backgroundColor: colors.surface2,
      padding: space[2] + 2,
      borderRadius: radius.sm,
      marginTop: 2,
    },
    identifierTipText: { fontSize: 11, color: colors.muted, lineHeight: 16 },
    stepperCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[3],
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    stepperCardTitle: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text },
    stepperCardSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
    stepperControls: { flexDirection: "row", alignItems: "center", gap: space[2] },
    stepperBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperBtnText: { fontSize: 18, fontWeight: "700", color: colors.text },
    stepperVal: { fontSize: fontSize.lg, fontWeight: "800", color: colors.text, minWidth: 32, textAlign: "center" },
    modeSelector: {
      flexDirection: "row",
      backgroundColor: colors.surface2,
      borderRadius: radius.md,
      padding: 3,
      gap: 4,
    },
    modeBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.sm,
    },
    modeBtnOn: {
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    modeBtnText: { fontSize: 11, fontWeight: "700", color: colors.muted },
    modeBtnTextOn: { color: colors.text },
    panelHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: space[2],
    },
    panelTitle: { fontSize: fontSize.xs, fontWeight: "800", color: colors.text },
    panelSub: { fontSize: 11, color: colors.muted, marginBottom: space[2] },
    panelNote: { fontSize: 11, color: colors.muted, lineHeight: 16, marginTop: space[2] },
    compartmentList: {
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      padding: space[2],
      gap: 4,
    },
    compartmentItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 3,
    },
    compartmentItemName: { fontSize: fontSize.xs, fontWeight: "600", color: colors.text },
    compartmentItemMeta: { fontSize: 10, color: colors.muted },
    compartmentItemG: { fontSize: fontSize.xs, fontWeight: "800", color: colors.accentText },
    manualFoodRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 6,
    },
    manualInputWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
    manualInput: {
      width: 60,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 4,
      fontSize: fontSize.sm,
      fontWeight: "700",
      color: colors.text,
      textAlign: "right",
    },
    manualTotalNote: { fontSize: 11, fontWeight: "700", color: colors.accentText, marginTop: space[2] },
    aiPromptTextarea: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: radius.sm,
      padding: space[2],
      fontSize: fontSize.xs,
      color: colors.text,
      minHeight: 65,
      marginBottom: space[2],
    },
    primaryActionBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
      marginTop: space[2],
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
    pressed: { opacity: 0.8 },

    /* Review Stage */
    tupperHeroCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.accent,
      padding: space[4],
      gap: space[3],
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    tupperHeroBadgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    tupperNetWeightText: { fontSize: fontSize.xs, fontWeight: "700", color: colors.text },
    tupperKcalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    tupperKcalNum: { fontSize: 32, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    tupperKcalSub: { fontSize: fontSize.xs, fontWeight: "500", color: colors.muted },
    macroGrid: { flexDirection: "row", gap: 6 },
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
    impactText: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 18 },
    syntaxCard: {
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: radius.md,
      padding: space[3],
      gap: space[1],
    },
    syntaxHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    syntaxTag: { fontSize: fontSize.xs, fontWeight: "800", color: colors.accentText },
    syntaxSub: { fontSize: 11, color: colors.text, marginTop: 2 },
    codeBlock: {
      backgroundColor: colors.surface,
      borderRadius: radius.sm,
      padding: space[2],
      marginTop: 4,
    },
    codeText: { fontSize: 12, fontWeight: "700", color: colors.text, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },

    /* Saved Stage */
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
    dishOverviewHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space[2] },
    dishOverviewTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.text },
  });
}
