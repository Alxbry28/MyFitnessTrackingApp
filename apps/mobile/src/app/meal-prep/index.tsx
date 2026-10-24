import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { useMealPrep } from "@/modules/mealprep/hooks/useMealPrep";
import { mealPrepRepo } from "@/modules/mealprep/repositories/mealPrepRepo";
import type { AvailableCookedFood } from "@/modules/mealprep/types/mealPrep";

export default function MealPrepHubScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const { mealPreps, loading, eatOneBox, deletePrep } = useMealPrep();
  const [cookedFoods, setCookedFoods] = useState<AvailableCookedFood[]>([]);
  const [eatingId, setEatingId] = useState<string | null>(null);
  const [eatNotice, setEatNotice] = useState<string | null>(null);

  useEffect(() => {
    mealPrepRepo.listAvailableCookedFoods(db).then(setCookedFoods);
  }, [db, mealPreps]);

  const handleEatOne = async (id: string, name: string) => {
    setEatingId(id);
    setEatNotice(null);
    try {
      const res = await eatOneBox(id);
      setEatNotice(`🍽️ Logged 1 tupperware of "${name}" into Food Diary! (${res.remaining} left)`);
      setTimeout(() => setEatNotice(null), 4000);
    } catch (e: any) {
      Alert.alert("Unable to log meal", e.message || "Failed to log tupperware box.");
    } finally {
      setEatingId(null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Delete Meal Prep",
      `Are you sure you want to remove "${name}" from inventory?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePrep(id);
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* App Bar */}
      <View style={styles.appbar}>
        <View>
          <Text style={styles.h1} accessibilityRole="header">Meal Prep</Text>
          <Text style={styles.sub}>Tupperware boxes &amp; batch portioning</Text>
        </View>
        <Pressable
          onPress={() => router.push("/meal-prep/new" as any)}
          accessibilityRole="button"
          style={styles.newBtn}
        >
          <Text style={styles.newBtnText}>+ New Prep</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {eatNotice && (
          <View style={styles.eatNoticeCard}>
            <Text style={styles.eatNoticeText}>{eatNotice}</Text>
          </View>
        )}

        {/* Ready Tupperwares in Fridge */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>Ready Tupperwares in Fridge</Text>
          <Text style={styles.sectionMeta}>{mealPreps.length} active types</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 12 }} />
        ) : mealPreps.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No meal prep tupperwares ready yet.</Text>
            <Text style={styles.emptySub}>
              Partition your cooked foods into tupperwares using ÷ N, manual grams, or AI prompts. When you eat, 1-tap logs the whole box!
            </Text>
          </View>
        ) : (
          <View style={styles.tupperList}>
            {mealPreps.map((prep) => (
              <View key={prep.id} style={styles.tupperCard}>
                <View style={styles.tupperCardHead}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.tupperName}>🍱 {prep.name}</Text>
                    {prep.items && prep.items.length > 0 && (
                      <Text style={styles.tupperItemsSummary} numberOfLines={1}>
                        {prep.items.map((i) => i.foodName.replace(/^[^\w]+/, "").trim()).join(", ")}
                      </Text>
                    )}
                  </View>
                  <View style={styles.badgeBox}>
                    <Text style={styles.badgeBoxText}>
                      {prep.tupperwaresLeft} {prep.tupperwaresLeft === 1 ? "box" : "boxes"} left
                    </Text>
                  </View>
                </View>

                {/* Macro Grid */}
                <View style={styles.macroGrid}>
                  <View style={styles.macroBox}>
                    <Text style={styles.macroVal}>{prep.kcalPerBox}</Text>
                    <Text style={styles.macroLabel}>kcal/box</Text>
                  </View>
                  <View style={styles.macroBox}>
                    <Text style={[styles.macroVal, { color: theme.colors.protein }]}>
                      {prep.proteinPerBox}g
                    </Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                  <View style={styles.macroBox}>
                    <Text style={[styles.macroVal, { color: theme.colors.carbs }]}>
                      {prep.carbsPerBox}g
                    </Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                  <View style={styles.macroBox}>
                    <Text style={[styles.macroVal, { color: theme.colors.fat }]}>
                      {prep.fatPerBox}g
                    </Text>
                    <Text style={styles.macroLabel}>Fat</Text>
                  </View>
                </View>

                {/* Stock & Action Bar */}
                <View style={styles.tupperActionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.portionNetText}>
                      Portion: <Text style={{ fontWeight: "700", color: theme.colors.text }}>{prep.netWeightG}g</Text> per container
                    </Text>
                    <Text style={styles.portionSubText}>1-tap logs all foods into Diary</Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Pressable
                      onPress={() => handleEatOne(prep.id, prep.name)}
                      disabled={eatingId === prep.id}
                      style={({ pressed }) => [styles.eatBtn, pressed && styles.pressed]}
                    >
                      {eatingId === prep.id ? (
                        <ActivityIndicator color={theme.colors.accentInk} size="small" />
                      ) : (
                        <Text style={styles.eatBtnText}>Eat 1 Box 🍽️</Text>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => handleDelete(prep.id, prep.name)}
                      style={styles.delPrepBtn}
                    >
                      <Text style={styles.delPrepBtnText}>✕</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Cooked Food Inventory from Fridge */}
        <Text style={[styles.sectionLabel, { marginTop: theme.space[4] }]}>
          Available Cooked Foods in Fridge
        </Text>
        <View style={styles.card}>
          {cookedFoods.map((f, idx) => (
            <View key={f.id} style={[styles.foodRow, idx > 0 && styles.divided]}>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{f.name}</Text>
                <Text style={styles.foodMeta}>Cooked batch · Ready to portion</Text>
              </View>
              <View style={styles.amtBox}>
                <Text style={styles.amtVal}>{f.gramsAvailable} g</Text>
                <Text style={styles.amtUnit}>{Math.round(f.kcalPer100g)} kcal/100g</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom CTA */}
        <Pressable
          onPress={() => router.push("/meal-prep/new" as any)}
          style={({ pressed }) => [styles.prepCtaBtn, pressed && styles.pressed]}
        >
          <SymbolView name={{ android: "bento", web: "kitchen" }} tintColor={theme.colors.accentInk} size={20} />
          <Text style={styles.prepCtaBtnText}>🍱 Prep Cooked Foods into Tupperwares →</Text>
        </Pressable>

        {/* Link back to Cooking */}
        <Pressable
          onPress={() => router.push("/cooking" as any)}
          style={({ pressed }) => [styles.cookingLinkCard, pressed && styles.pressed]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cookingLinkTitle}>🍳 Cook a New Dish or Batch?</Text>
            <Text style={styles.cookingLinkSub}>Use the active cooking timer and weigh cooked batch</Text>
          </View>
          <Text style={styles.cookingLinkGo}>›</Text>
        </Pressable>
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
    eatNoticeCard: {
      backgroundColor: colors.okSoft,
      borderColor: colors.ok,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: space[3],
      marginBottom: space[3],
    },
    eatNoticeText: { color: colors.ok, fontSize: fontSize.xs, fontWeight: "700" },
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
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[4],
    },
    emptyTitle: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 4 },
    emptySub: { fontSize: fontSize.xs, color: colors.muted, textAlign: "center", lineHeight: 18 },
    tupperList: { gap: space[3] },
    tupperCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.accent,
      padding: space[4],
      gap: space[3],
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    tupperCardHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    tupperName: { fontSize: fontSize.md, fontWeight: "800", color: colors.text },
    tupperItemsSummary: { fontSize: 11, color: colors.muted, marginTop: 2 },
    badgeBox: {
      backgroundColor: "rgba(245, 184, 65, 0.16)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    badgeBoxText: { color: "#f5b841", fontSize: 11, fontWeight: "800" },
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
    tupperActionRow: {
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      padding: space[3],
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    portionNetText: { fontSize: fontSize.xs, color: colors.muted },
    portionSubText: { fontSize: 10, color: colors.muted, marginTop: 2 },
    eatBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      paddingHorizontal: space[3],
      paddingVertical: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    eatBtnText: { color: colors.accentInk, fontSize: fontSize.xs, fontWeight: "800" },
    delPrepBtn: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    delPrepBtnText: { color: colors.muted, fontSize: 12 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    foodRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: space[4],
      paddingVertical: space[3],
    },
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
    foodInfo: { flex: 1, marginRight: space[2] },
    foodName: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text },
    foodMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
    amtBox: { alignItems: "flex-end" },
    amtVal: { fontSize: fontSize.sm, fontWeight: "800", color: colors.text },
    amtUnit: { fontSize: 10, color: colors.muted },
    prepCtaBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: space[4],
    },
    prepCtaBtnText: { color: colors.accentInk, fontSize: fontSize.sm, fontWeight: "800" },
    cookingLinkCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[3],
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: space[3],
    },
    cookingLinkTitle: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text },
    cookingLinkSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
    cookingLinkGo: { fontSize: fontSize.lg, color: colors.muted },
    pressed: { opacity: 0.8 },
  });
}
