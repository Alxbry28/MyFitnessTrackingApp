import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { batchRepo } from "@/modules/recipes/repositories/batchRepo";
import { useRecipes } from "@/modules/recipes/hooks/useRecipes";
import type { Batch } from "@/modules/recipes/types/recipes";

export default function CookingScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { state: recipesState } = useRecipes();

  const [activeBatches, setActiveBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  useEffect(() => {
    let cancelled = false;
    batchRepo
      .listActive(db)
      .then((list) => {
        if (!cancelled) {
          setActiveBatches(list);
          setLoadingBatches(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.warn("Failed to load active batches:", e);
          setLoadingBatches(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const formatCookTime = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* App Bar */}
      <View style={styles.appbar}>
        <View>
          <Text style={styles.h1} accessibilityRole="header">Cooking</Text>
          <Text style={styles.sub}>Cooked meals in fridge inventory</Text>
        </View>
        <Pressable
          onPress={() => router.push("/cooking/new" as any)}
          accessibilityRole="button"
          style={styles.newBtn}
        >
          <Text style={styles.newBtnText}>+ New Dish</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Workflow steps indicator */}
        <View style={styles.flowBar}>
          <Text style={styles.flowText}>1. New dish › 2. Ingredients › 3. Cook (Timer) › 4. Cooked weight › 5. Macros › 6. Inventory</Text>
        </View>

        {/* Cooked Meals In Fridge Inventory */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>Cooked Meals In Fridge Inventory</Text>
          <Text style={styles.sectionMeta}>{activeBatches.length} batches</Text>
        </View>

        {loadingBatches ? (
          <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 12 }} />
        ) : activeBatches.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No cooked meals in the fridge yet.</Text>
            <Text style={styles.emptySub}>
              Cook a batch below, tare and weigh at the end, and track its remaining stock automatically!
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            {activeBatches.map((batch, index) => {
              const cookTime = formatCookTime(batch.cookTimeSeconds);
              return (
                <Pressable
                  key={batch.id}
                  onPress={() => {
                    if (batch.pantryItemId) {
                      router.push({ pathname: "/pantry/portion/[itemId]", params: { itemId: batch.pantryItemId } });
                    }
                  }}
                  style={({ pressed }) => [
                    styles.batchRow,
                    index > 0 && styles.divided,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.info}>
                    <Text style={styles.batchName}>🍲 {batch.name}</Text>
                    <View style={styles.batchMetaWrap}>
                      <Text style={styles.batchStockHighlight}>
                        {Math.round(batch.gramsLeft ?? batch.cookedWeightG)} g remaining
                      </Text>
                      {cookTime && <Text style={styles.batchMeta}> · Cook time {cookTime}</Text>}
                    </View>
                  </View>
                  <View style={styles.amtBox}>
                    <Text style={styles.amtVal}>{Math.round(batch.kcalPer100g)}</Text>
                    <Text style={styles.amtUnit}>kcal/100 g</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Start Cooking New Dish CTA */}
        <Text style={[styles.sectionLabel, { marginTop: theme.space[4] }]}>Start Cooking New Dish</Text>
        <View style={styles.heroCtaCard}>
          <Text style={styles.heroCtaTitle}>Ready to cook something?</Text>
          <Text style={styles.heroCtaSub}>
            Enter raw ingredients first, start the cooking duration timer on your stove, then weigh the finished batch at the end.
          </Text>
          <Pressable
            onPress={() => router.push("/cooking/new" as any)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.startFlowBtn, pressed && styles.pressed]}
          >
            <SymbolView name={{ android: "skillet", web: "kitchen" }} tintColor={theme.colors.accentInk} size={18} />
            <Text style={styles.startFlowBtnText}>Start New Dish Flow</Text>
          </Pressable>
        </View>

        {/* Workout-Style Active Timer Feature Highlight Banner */}
        <View style={styles.timerNoticeCard}>
          <View style={styles.timerNoticeHead}>
            <Text style={styles.timerNoticeIcon}>⏱️</Text>
            <Text style={styles.timerNoticeTitle}>Workout-Style Active Timer</Text>
          </View>
          <Text style={styles.timerNoticeText}>
            Just like workout logging, Cooking features a dedicated live timer with Start, Pause, Resume, and Finish buttons to track your exact simmering and cooking time!
          </Text>
        </View>

        {/* Quick Link to Meal Prep Tupperwares */}
        <Pressable
          onPress={() => router.push("/meal-prep" as any)}
          style={({ pressed }) => [styles.prepLinkCard, pressed && styles.pressed]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.prepLinkTitle}>🍱 Meal Prep &amp; Tupperware Inventory</Text>
            <Text style={styles.prepLinkSub}>Partition cooked fridge batches into tupperwares (÷ N or manual)</Text>
          </View>
          <Text style={styles.prepLinkGo}>›</Text>
        </Pressable>

        {/* Saved Recipes section if any */}
        {recipesState.status === "ready" && recipesState.recipes.length > 0 && (
          <View style={{ marginTop: theme.space[4] }}>
            <Text style={styles.sectionLabel}>Saved Recipe Bases</Text>
            <View style={styles.card}>
              {recipesState.recipes.map((recipe, idx) => (
                <Pressable
                  key={recipe.id}
                  onPress={() => router.push({ pathname: "/recipes/[id]", params: { id: recipe.id } })}
                  style={({ pressed }) => [styles.batchRow, idx > 0 && styles.divided, pressed && styles.pressed]}
                >
                  <View style={styles.info}>
                    <Text style={styles.batchName}>{recipe.name}</Text>
                    <Text style={styles.batchMeta}>
                      {recipe.ingredientCount ?? 0} ingredients · cooked {recipe.timesCooked ?? 0}×
                    </Text>
                  </View>
                  <Text style={styles.prepLinkGo}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    appbar: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    h1: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text },
    sub: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
    newBtn: {
      paddingHorizontal: space[3],
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.accentSoft,
    },
    newBtnText: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: "700" },
    content: { padding: space[4], paddingBottom: space[6] },
    flowBar: {
      backgroundColor: colors.surface2,
      paddingVertical: 8,
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
      marginBottom: space[3],
    },
    flowText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.muted,
      textAlign: "center",
      lineHeight: 16,
    },
    sectionHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: space[2],
    },
    sectionLabel: {
      fontSize: fontSize.xs,
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      fontWeight: "700",
      marginBottom: space[2],
    },
    sectionMeta: { fontSize: 11, color: colors.muted },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    emptyText: {
      padding: space[4],
      paddingBottom: 4,
      fontSize: fontSize.sm,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
    },
    emptySub: {
      paddingHorizontal: space[4],
      paddingBottom: space[4],
      fontSize: fontSize.xs,
      color: colors.muted,
      textAlign: "center",
      lineHeight: 18,
    },
    batchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: space[4],
      paddingVertical: space[3],
    },
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
    pressed: { opacity: 0.75, backgroundColor: colors.surface2 },
    info: { flex: 1, marginRight: space[2] },
    batchName: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text },
    batchMetaWrap: { flexDirection: "row", alignItems: "center", marginTop: 4, flexWrap: "wrap" },
    batchStockHighlight: { fontSize: fontSize.xs, fontWeight: "700", color: colors.text },
    batchMeta: { fontSize: fontSize.xs, color: colors.muted },
    amtBox: { alignItems: "flex-end" },
    amtVal: { fontSize: fontSize.md, fontWeight: "800", color: colors.text },
    amtUnit: { fontSize: 10, color: colors.muted },
    heroCtaCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[4],
      marginBottom: space[3],
    },
    heroCtaTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.text, marginBottom: 4 },
    heroCtaSub: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 18, marginBottom: space[3] },
    startFlowBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    startFlowBtnText: { color: colors.accentInk, fontSize: fontSize.sm, fontWeight: "700" },
    timerNoticeCard: {
      backgroundColor: colors.estimateSoft,
      borderRadius: radius.md,
      padding: space[3],
      marginBottom: space[3],
    },
    timerNoticeHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    timerNoticeIcon: { fontSize: 16 },
    timerNoticeTitle: { fontSize: fontSize.xs, fontWeight: "800", color: colors.estimate },
    timerNoticeText: { fontSize: 11, color: colors.text, lineHeight: 16 },
    prepLinkCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[3],
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    prepLinkTitle: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text },
    prepLinkSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
    prepLinkGo: { fontSize: fontSize.lg, color: colors.muted },
  });
}
