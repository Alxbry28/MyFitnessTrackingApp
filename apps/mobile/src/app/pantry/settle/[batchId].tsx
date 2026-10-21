import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { MEAL_LABELS } from "@/modules/nutrition/services/mealTime";
import type { MealType } from "@/modules/nutrition/types/foodLog";
import { batchRepo } from "@/modules/recipes/repositories/batchRepo";
import {
  calculateCookedPer100g,
  calculateCookedRatio,
  type RawTotals,
} from "@/modules/recipes/services/recipeCalc";
import type { BatchDetail } from "@/modules/recipes/types/recipes";

type PortionItem = {
  id: string;
  mealType: string;
  day: string;
  grams: number;
  estKcal: number;
};

type SettleData = {
  batch: BatchDetail;
  totalTakenOutG: number;
  portions: PortionItem[];
  rawTotals: RawTotals;
};

export default function SettleBatchScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(Boolean(batchId));
  const [data, setData] = useState<SettleData | null>(null);
  const [weightText, setWeightText] = useState("");
  const [confirmedAllLogged, setConfirmedAllLogged] = useState(false);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    if (!batchId) return;
    let active = true;
    batchRepo
      .getSettlePreview(db, batchId)
      .then((res) => {
        if (!active) return;
        if (res) {
          setData(res);
          const initialWeight =
            res.totalTakenOutG > 0 ? res.totalTakenOutG : res.batch.cookedWeightG;
          setWeightText(String(Math.round(initialWeight)));
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          Alert.alert("Error", "Could not load batch details for settling.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [db, batchId]);

  if (loading || !data) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  const { batch, totalTakenOutG, portions, rawTotals } = data;
  const parsedWeight = parseFloat(weightText.trim().replace(",", ".")) || 0;
  const effectiveWeight = parsedWeight > 0 ? parsedWeight : batch.cookedWeightG;

  const newCookedNutrition = calculateCookedPer100g(rawTotals, effectiveWeight);
  const newKcalPer100g = newCookedNutrition.kcalPer100g;

  const totalPortionGrams = portions.reduce((sum, p) => sum + p.grams, 0);
  const totalOldKcal = portions.reduce((sum, p) => sum + p.estKcal, 0);
  const totalNewKcal = portions.reduce((sum, p) => {
    return sum + Math.round((newKcalPer100g * p.grams) / 100);
  }, 0);

  const nextRatio =
    rawTotals.rawWeightG > 0
      ? calculateCookedRatio(effectiveWeight, rawTotals.rawWeightG)
      : null;

  const handleSettle = async () => {
    if (effectiveWeight <= 0) {
      Alert.alert("Invalid weight", "Please enter a valid cooked weight in grams.");
      return;
    }
    setSettling(true);
    try {
      await batchRepo.settle(db, batch.id, effectiveWeight);
      router.dismissTo("/pantry");
    } catch (e) {
      Alert.alert("Error settling batch", e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSettling(false);
    }
  };

  const isFinished = (batch.gramsLeft ?? 0) <= 0.5;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.appbar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>Cancel</Text>
        </Pressable>
        <Text style={styles.appbarTitle}>Settle batch</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.space[6] + insets.bottom },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.h2}>
            {isFinished ? `${batch.name} is finished` : `Settle ${batch.name}`}
          </Text>
          <Text style={styles.sub}>
            You took out{" "}
            <Text style={styles.boldText}>
              {Math.round(totalTakenOutG)} g
            </Text>{" "}
            in total. Use it as the cooked weight?
          </Text>
        </View>

        <View style={styles.weightCard}>
          <Text style={styles.weightLabel}>Cooked weight (g)</Text>
          <TextInput
            value={weightText}
            onChangeText={setWeightText}
            keyboardType="decimal-pad"
            style={styles.weightInput}
            placeholder="Cooked g"
            placeholderTextColor={theme.colors.faint}
          />
        </View>

        {portions.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colPortion]}>Portion</Text>
              <Text style={[styles.th, styles.colGrams]}>g</Text>
              <Text style={[styles.th, styles.colEst]}>est.</Text>
              <Text style={[styles.th, styles.colSettled]}>settled</Text>
            </View>

            {portions.map((p) => {
              const portionSettledKcal = Math.round((newKcalPer100g * p.grams) / 100);
              const label =
                MEAL_LABELS[p.mealType as MealType] ?? p.mealType ?? "Portion";
              return (
                <View key={p.id} style={styles.tableRow}>
                  <Text style={[styles.td, styles.colPortion]}>{label}</Text>
                  <Text style={[styles.td, styles.colGrams]}>{Math.round(p.grams)}</Text>
                  <Text style={[styles.td, styles.tdOld, styles.colEst]}>
                    {p.estKcal}
                  </Text>
                  <Text style={[styles.td, styles.tdNew, styles.colSettled]}>
                    {portionSettledKcal}
                  </Text>
                </View>
              );
            })}

            <View style={[styles.tableRow, styles.totalRow]}>
              <Text style={[styles.td, styles.colPortion, styles.bold]}>Total kcal</Text>
              <Text style={[styles.td, styles.colGrams, styles.bold]}>
                {Math.round(totalPortionGrams)}
              </Text>
              <Text style={[styles.td, styles.tdOld, styles.colEst]}>
                {totalOldKcal}
              </Text>
              <Text style={[styles.td, styles.tdNew, styles.colSettled, styles.totalNewKcal]}>
                {totalNewKcal}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.noPortionsText}>
              No portions were logged yet. Settle will set the final cooked weight and per-100 g macros.
            </Text>
          </View>
        )}

        <View style={styles.result}>
          <Text style={styles.resultLabel}>Per 100 g</Text>
          <Text style={styles.resultValue}>
            <Text style={styles.boldText}>{`${batch.kcalPer100g} → ${newKcalPer100g} kcal`}</Text>
          </Text>
        </View>

        <Pressable
          onPress={() => setConfirmedAllLogged((prev) => !prev)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmedAllLogged }}
          style={styles.checkRow}
        >
          <View style={[styles.box, confirmedAllLogged && styles.boxChecked]}>
            {confirmedAllLogged && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkText}>
            I logged every portion (eaten, shared, discarded)
          </Text>
        </Pressable>

        <Text style={styles.note}>
          Only this batch&apos;s portions are updated.
          {nextRatio !== null
            ? ` Ratio ${nextRatio} is saved for next time.`
            : ""}
        </Text>

        <View style={styles.btnRow}>
          {batch.pantryItemId && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/pantry/portion/[itemId]",
                  params: { itemId: batch.pantryItemId! },
                })
              }
              accessibilityRole="button"
              style={[styles.btn, styles.ghostBtn]}
            >
              <Text style={styles.ghostBtnLabel}>Add missing portion</Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleSettle}
            disabled={settling}
            accessibilityRole="button"
            style={[styles.btn, styles.primaryBtn, settling && styles.disabled]}
          >
            {settling ? (
              <ActivityIndicator color={theme.colors.accentInk} />
            ) : (
              <Text style={styles.primaryBtnLabel}>Settle batch</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { justifyContent: "center", alignItems: "center" },
    appbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: space[4],
      paddingVertical: space[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { minHeight: tap, justifyContent: "center" },
    backText: { color: colors.accentText, fontSize: fontSize.md },
    appbarTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    spacer: { width: 48 },
    content: { padding: space[4], gap: space[3] },
    header: { gap: space[1] },
    h2: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
    sub: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
    boldText: { color: colors.text, fontWeight: "700" },
    weightCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: space[4],
      paddingVertical: space[2],
    },
    weightLabel: { fontSize: fontSize.sm, color: colors.muted, fontWeight: "500" },
    weightInput: {
      fontSize: fontSize.lg,
      fontWeight: "700",
      color: colors.text,
      textAlign: "right",
      minWidth: 80,
      paddingVertical: space[1],
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
    },
    tableHeader: {
      flexDirection: "row",
      paddingBottom: space[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: space[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    totalRow: { borderBottomWidth: 0, paddingTop: space[2] },
    th: { fontSize: fontSize.xs, color: colors.muted, fontWeight: "600" },
    td: { fontSize: fontSize.sm, color: colors.text },
    colPortion: { flex: 2 },
    colGrams: { flex: 1, textAlign: "right" },
    colEst: { flex: 1, textAlign: "right" },
    colSettled: { flex: 1, textAlign: "right" },
    tdOld: { color: colors.faint, textDecorationLine: "line-through" },
    tdNew: { fontWeight: "600" },
    bold: { fontWeight: "700" },
    totalNewKcal: { color: colors.ok, fontWeight: "700" },
    noPortionsText: {
      fontSize: fontSize.sm,
      color: colors.muted,
      paddingVertical: space[2],
      lineHeight: 20,
    },
    result: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surface2,
      borderRadius: radius.md,
      paddingVertical: space[3],
      paddingHorizontal: space[4],
    },
    resultLabel: { fontSize: fontSize.sm, color: colors.text },
    resultValue: { fontSize: fontSize.md },
    checkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      paddingVertical: space[1],
    },
    box: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    boxChecked: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    checkMark: { color: colors.accentInk, fontSize: fontSize.xs, fontWeight: "700" },
    checkText: { flex: 1, fontSize: fontSize.sm, color: colors.text },
    note: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 16 },
    btnRow: { flexDirection: "row", gap: space[2], marginTop: space[2] },
    btn: {
      flex: 1,
      minHeight: tap,
      borderRadius: radius.md,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: space[3],
    },
    ghostBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: "transparent",
    },
    ghostBtnLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
    primaryBtn: { backgroundColor: colors.accent },
    primaryBtnLabel: { color: colors.accentInk, fontSize: fontSize.sm, fontWeight: "700" },
    disabled: { opacity: 0.5 },
  });
}
