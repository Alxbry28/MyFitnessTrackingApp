import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useMemo, useState } from "react";
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

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { dayKey } from "@/modules/nutrition/services/mealTime";
import { monthDay } from "@/modules/pantry/services/pantryStock";
import { useRecipeDetail } from "@/modules/recipes/hooks/useRecipes";
import { batchRepo } from "@/modules/recipes/repositories/batchRepo";
import {
  calculateCookedPer100g,
  calculateRawTotals,
  estimateCookedWeight,
} from "@/modules/recipes/services/recipeCalc";
import type { WeightMethod } from "@/modules/recipes/types/recipes";

export default function CookBatchScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();

  const { state, retry } = useRecipeDetail(recipeId);
  const today = dayKey(new Date());

  const [weightMethod, setWeightMethod] = useState<WeightMethod>("settled");
  const [containerWeights, setContainerWeights] = useState<string[]>(["400", "350"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recipe = state.status === "ready" ? state.recipe : null;

  const rawTotals = useMemo(() => {
    if (!recipe || !recipe.ingredients) return { rawWeightG: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, incomplete: false };
    return calculateRawTotals(recipe.ingredients);
  }, [recipe]);

  const estimatedCookedG = useMemo(() => {
    return estimateCookedWeight(rawTotals.rawWeightG, recipe?.learnedCookedRatio ?? null);
  }, [rawTotals.rawWeightG, recipe?.learnedCookedRatio]);

  const partsTotalG = useMemo(() => {
    return containerWeights.reduce((sum, w) => {
      const g = parseFloat(w.replace(",", "."));
      return sum + (isNaN(g) || g <= 0 ? 0 : g);
    }, 0);
  }, [containerWeights]);

  const finalCookedG = useMemo(() => {
    if (weightMethod === "weighed_parts") {
      return partsTotalG > 0 ? partsTotalG : estimatedCookedG;
    }
    return estimatedCookedG;
  }, [weightMethod, partsTotalG, estimatedCookedG]);

  const cookedNutrition = useMemo(() => {
    return calculateCookedPer100g(rawTotals, finalCookedG);
  }, [rawTotals, finalCookedG]);

  const handleAddContainer = () => {
    setContainerWeights((prev) => [...prev, ""]);
  };

  const handleUpdateContainer = (index: number, val: string) => {
    setContainerWeights((prev) => prev.map((w, i) => (i === index ? val : w)));
  };

  const handleRemoveContainer = (index: number) => {
    setContainerWeights((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveBatch = async () => {
    if (!recipe) return;
    if (finalCookedG <= 0) {
      setError("Cooked weight must be greater than 0");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const isSettled = weightMethod === "weighed_parts";
      const formattedDate = monthDay(today);
      const batchName = `${recipe.name} · ${formattedDate}`;

      await batchRepo.create(db, {
        recipeId: recipe.id,
        name: batchName,
        cookedAt: new Date().toISOString(),
        cookedWeightG: finalCookedG,
        weightMethod,
        isSettled,
        ingredients: recipe.ingredients.map((ing) => ({
          productId: ing.productId,
          rawGrams: ing.rawGrams,
          isEstimated: ing.isEstimated,
          kcalPer100g: ing.kcalPer100g ?? 0,
          proteinPer100g: ing.proteinPer100g ?? 0,
          carbsPer100g: ing.carbsPer100g ?? 0,
          fatPer100g: ing.fatPer100g ?? 0,
        })),
      });

      router.replace("/(tabs)/pantry");
    } catch {
      setError("Couldn't save cooked batch. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (state.status === "loading") {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading recipe" />
      </View>
    );
  }

  if (state.status === "error" || !recipe) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.message}>{"Couldn't load recipe to cook."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.backBtn}>
          <Text style={styles.backText}>‹ {recipe.name}</Text>
        </Pressable>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Cook a batch</Text>
          <Text style={styles.sub}>{monthDay(today)}</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Totals summary card */}
        <View style={styles.card}>
          <View style={styles.totalsRow}>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{rawTotals.rawWeightG} g</Text>
              <Text style={styles.totalUnit}>raw</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{rawTotals.kcal}</Text>
              <Text style={styles.totalUnit}>kcal</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{rawTotals.protein} g</Text>
              <Text style={styles.totalUnit}>protein</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{recipe.ingredients.length}</Text>
              <Text style={styles.totalUnit}>ingredients</Text>
            </View>
          </View>
          <Text style={styles.cardNote}>
            {`${recipe.ingredients.filter((i) => i.isEstimated).length} ingredients estimated · `}
            {cookedNutrition.kcalPer100g} kcal/100 g cooked
          </Text>
        </View>

        {/* Weight method selector */}
        <Text style={styles.sectionLabel}>How will you get the cooked weight?</Text>

        {/* Option 1: Settle at the end */}
        <Pressable
          onPress={() => setWeightMethod("settled")}
          accessibilityRole="radio"
          accessibilityState={{ selected: weightMethod === "settled" }}
          style={[styles.optionCard, weightMethod === "settled" && styles.optionSelected]}
        >
          <View style={[styles.radioCircle, weightMethod === "settled" && styles.radioCircleOn]} />
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Settle at the end</Text>
            <Text style={styles.optionDesc}>
              Log portions in grams. When it&apos;s finished, cooked weight = everything taken out. Best for day batches.
            </Text>
          </View>
        </Pressable>

        {/* Option 2: Weigh in parts */}
        <Pressable
          onPress={() => setWeightMethod("weighed_parts")}
          accessibilityRole="radio"
          accessibilityState={{ selected: weightMethod === "weighed_parts" }}
          style={[styles.optionCard, weightMethod === "weighed_parts" && styles.optionSelected]}
        >
          <View style={[styles.radioCircle, weightMethod === "weighed_parts" && styles.radioCircleOn]} />
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Weigh in parts</Text>
            <Text style={styles.optionDesc}>
              Scoop into containers that fit the scale; the app adds them up.
            </Text>
            {weightMethod === "weighed_parts" && (
              <View style={styles.partsContainer}>
                {containerWeights.map((w, index) => (
                  <View key={index} style={styles.partRow}>
                    <Text style={styles.partLabel}>Container {index + 1}:</Text>
                    <TextInput
                      value={w}
                      onChangeText={(val) => handleUpdateContainer(index, val)}
                      placeholder="0"
                      keyboardType="numeric"
                      style={styles.partInput}
                    />
                    <Text style={styles.partUnit}>g</Text>
                    {containerWeights.length > 1 && (
                      <Pressable onPress={() => handleRemoveContainer(index)} style={styles.removePartBtn}>
                        <Text style={styles.removePartText}>×</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
                <View style={styles.partsSummaryRow}>
                  <Pressable onPress={handleAddContainer} style={styles.addPartBtn}>
                    <Text style={styles.addPartBtnText}>+ Add container</Text>
                  </Pressable>
                  <Text style={styles.partsTotalText}>
                    Total: <Text style={{ fontWeight: "700" }}>{partsTotalG} g</Text>
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Pressable>

        {/* Option 3: Estimate */}
        <Pressable
          onPress={() => setWeightMethod("estimated")}
          accessibilityRole="radio"
          accessibilityState={{ selected: weightMethod === "estimated" }}
          style={[styles.optionCard, weightMethod === "estimated" && styles.optionSelected]}
        >
          <View style={[styles.radioCircle, weightMethod === "estimated" && styles.radioCircleOn]} />
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Estimate</Text>
            <Text style={styles.optionDesc}>
              {`${rawTotals.rawWeightG} g raw × learned ratio ${recipe.learnedCookedRatio ?? 1} ≈ ${estimatedCookedG} g (approx.)`}
            </Text>
          </View>
        </Pressable>

        <Text style={styles.explainerNote}>
          Until it&apos;s settled, portions use the estimate (≈ {cookedNutrition.kcalPer100g} kcal/100 g) and show ⚠. Cooking never counts toward today; only the portions you eat do.
        </Text>

        {/* Submit button */}
        <Pressable
          onPress={handleSaveBatch}
          disabled={saving}
          accessibilityRole="button"
          style={[styles.submitBtn, saving && styles.btnDisabled]}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.accentInk} />
          ) : (
            <Text style={styles.submitBtnText}>Save batch to fridge</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { justifyContent: "center", alignItems: "center", padding: space[4] },
    message: { fontSize: fontSize.md, color: colors.muted, marginBottom: space[3] },
    retryBtn: { minHeight: tap, paddingHorizontal: space[4], justifyContent: "center" },
    retryText: { fontSize: fontSize.md, color: colors.accentText, fontWeight: "600" },
    appbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: space[4],
      paddingVertical: space[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      minHeight: 52,
    },
    backBtn: { minHeight: tap, justifyContent: "center", minWidth: 48 },
    backText: { fontSize: fontSize.sm, color: colors.accentText, fontWeight: "500" },
    titleBox: { alignItems: "center" },
    title: { fontSize: fontSize.md, fontWeight: "700", color: colors.text },
    sub: { fontSize: fontSize.xs, color: colors.muted },
    content: { padding: space[4], gap: space[3], paddingBottom: space[6] },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[4],
    },
    totalsRow: { flexDirection: "row", justifyContent: "space-between" },
    totalItem: { alignItems: "center", flex: 1 },
    totalValue: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text },
    totalUnit: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
    cardNote: { fontSize: fontSize.xs, color: colors.muted, marginTop: space[3], textAlign: "center" },
    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: "600",
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: space[2],
    },
    optionCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[4],
      flexDirection: "row",
      gap: space[3],
      alignItems: "flex-start",
    },
    optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    radioCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.faint,
      marginTop: 2,
    },
    radioCircleOn: {
      borderWidth: 6,
      borderColor: colors.accent,
      backgroundColor: colors.surface,
    },
    optionContent: { flex: 1 },
    optionTitle: { fontSize: fontSize.md, fontWeight: "600", color: colors.text },
    optionDesc: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2, lineHeight: 19 },
    partsContainer: { marginTop: space[3], gap: space[2] },
    partRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
    partLabel: { fontSize: fontSize.sm, color: colors.muted, minWidth: 90 },
    partInput: {
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      paddingHorizontal: space[2],
      height: 36,
      minWidth: 70,
      fontSize: fontSize.sm,
      fontWeight: "600",
      color: colors.text,
      textAlign: "right",
    },
    partUnit: { fontSize: fontSize.sm, color: colors.muted },
    removePartBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    removePartText: { fontSize: fontSize.md, color: colors.muted },
    partsSummaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: space[2] },
    addPartBtn: { paddingVertical: space[1], paddingHorizontal: space[2] },
    addPartBtnText: { fontSize: fontSize.xs, fontWeight: "600", color: colors.accentText },
    partsTotalText: { fontSize: fontSize.sm, color: colors.text },
    explainerNote: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 18, marginTop: space[2] },
    submitBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      height: tap,
      justifyContent: "center",
      alignItems: "center",
      marginTop: space[3],
    },
    submitBtnText: { fontSize: fontSize.md, fontWeight: "700", color: colors.accentInk },
    btnDisabled: { opacity: 0.6 },
    errorBox: { backgroundColor: colors.overSoft, borderRadius: radius.md, padding: space[3] },
    errorText: { color: colors.over, fontSize: fontSize.sm, fontWeight: "500" },
  });
}
