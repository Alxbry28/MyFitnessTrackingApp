import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import type { AiMealParseResult } from "../services/aiMealParser";
import { formatKcal } from "../services/nutritionCalc";

type Props = {
  result: AiMealParseResult;
  dayLabel: string;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
  onRemoveItem?: (mealIdx: number, itemIdx: number) => void;
};

export function AiMealPreview({ result, dayLabel, saving, onSave, onBack, onRemoveItem }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Grand Total Summary Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalHeader}>AI PARSED TOTALS ({dayLabel.toUpperCase()})</Text>
          <Text style={styles.totalKcal}>{formatKcal(result.totalKcal)} kcal</Text>
          <View style={styles.macrosRow}>
            <View style={styles.macroPill}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={[styles.macroValue, { color: theme.colors.protein }]}>{result.totalProtein}g</Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={[styles.macroValue, { color: theme.colors.carbs }]}>{result.totalCarbs}g</Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={[styles.macroValue, { color: theme.colors.fat }]}>{result.totalFat}g</Text>
            </View>
          </View>
        </View>

        {/* Meals & Supplements Sections (Supplements separated from Snacks) */}
        {result.meals.map((meal, mealIdx) => {
          const mealKcal = meal.items.reduce((sum, item) => sum + item.calories, 0);
          const mealProtein = Math.round(meal.items.reduce((sum, item) => sum + item.protein, 0) * 10) / 10;
          const isSupplements = meal.isSupplements || /supplement/i.test(meal.label);

          return (
            <View key={meal.mealType + meal.label + mealIdx} style={styles.mealSection}>
              <View style={styles.mealHeaderRow}>
                <Text style={styles.mealTitle}>{meal.label}</Text>
                {isSupplements ? (
                  <View style={styles.suppBadge}>
                    <Text style={styles.suppBadgeText}>📦 Auto-Deducts Inventory</Text>
                  </View>
                ) : (
                  <Text style={styles.mealKcal}>
                    {formatKcal(mealKcal)} kcal · {mealProtein}g P
                  </Text>
                )}
              </View>

              <View style={[styles.mealCard, isSupplements && styles.suppCard]}>
                {meal.items.map((item, itemIdx) => {
                  const unitLabel =
                    item.unit === "caps"
                      ? `${item.amount ?? item.grams} ${(item.amount ?? item.grams) === 1 ? "cap" : "caps"}`
                      : item.unit === "tabs"
                        ? `${item.amount ?? item.grams} ${(item.amount ?? item.grams) === 1 ? "tab" : "tabs"}`
                        : `${item.grams}g`;

                  return (
                    <View
                      key={item.name + itemIdx}
                      style={[styles.itemRow, itemIdx > 0 && styles.rowDivided]}
                    >
                      <View style={styles.itemMainCol}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={[styles.itemSub, isSupplements && styles.suppItemSub]}>
                          {isSupplements
                            ? `${unitLabel} · 💊 Deducts from Supplement Inventory`
                            : `${unitLabel} · ${item.kcalPer100g} kcal/100g`}
                        </Text>
                      </View>

                      <View style={styles.itemNutrCol}>
                        <Text style={styles.itemKcal}>
                          {isSupplements && item.calories === 0 ? unitLabel : formatKcal(item.calories)}
                        </Text>
                        <Text style={styles.itemMacros}>
                          {item.protein}P · {item.carbs}C · {item.fat}F
                        </Text>
                      </View>

                      {onRemoveItem && (
                        <Pressable
                          onPress={() => onRemoveItem(mealIdx, itemIdx)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${item.name}`}
                          style={styles.removeBtn}
                          hitSlop={8}
                        >
                          <SymbolView
                            name={{ android: "close", web: "close" }}
                            tintColor={theme.colors.muted}
                            size={16}
                          />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(spaceBottom(theme), insets.bottom + theme.space[3]) }]}>
        <Pressable
          onPress={onBack}
          disabled={saving}
          accessibilityRole="button"
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>Edit text</Text>
        </Pressable>

        <Pressable
          onPress={onSave}
          disabled={saving || result.meals.every((m) => m.items.length === 0)}
          accessibilityRole="button"
          style={[
            styles.saveBtn,
            (saving || result.meals.every((m) => m.items.length === 0)) && styles.btnDisabled,
          ]}
        >
          <SymbolView
            name={{ android: "check", web: "check" }}
            tintColor={theme.colors.accentInk}
            size={18}
          />
          <Text style={styles.saveBtnText}>
            {saving ? "Saving to log..." : `Log all to ${dayLabel}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function spaceBottom(theme: Theme) {
  return theme.space[4];
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: space[4],
      gap: space[4],
      paddingBottom: 90,
    },
    totalCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[4],
      gap: space[2],
    },
    totalHeader: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.muted,
      letterSpacing: 0.6,
    },
    totalKcal: {
      fontSize: 32,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    macrosRow: {
      flexDirection: "row",
      gap: space[2],
      marginTop: 4,
    },
    macroPill: {
      flex: 1,
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      paddingVertical: 6,
      paddingHorizontal: 8,
      alignItems: "center",
      gap: 2,
    },
    macroLabel: {
      fontSize: 10,
      color: colors.muted,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    macroValue: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    mealSection: {
      gap: space[2],
    },
    mealHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: space[1],
    },
    mealTitle: {
      fontSize: fontSize.md,
      fontWeight: "700",
      color: colors.text,
    },
    mealKcal: {
      fontSize: fontSize.xs,
      fontWeight: "600",
      color: colors.muted,
    },
    suppBadge: {
      backgroundColor: colors.okSoft,
      paddingHorizontal: space[2],
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    suppBadgeText: {
      fontSize: fontSize.xs,
      fontWeight: "700",
      color: colors.ok,
    },
    mealCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    suppCard: {
      borderColor: colors.accent,
    },
    itemRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: space[3],
      paddingHorizontal: space[4],
    },
    rowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    itemMainCol: {
      flex: 1,
      paddingRight: space[3],
      gap: 2,
    },
    itemName: {
      fontSize: fontSize.sm,
      fontWeight: "600",
      color: colors.text,
    },
    itemSub: {
      fontSize: fontSize.xs,
      color: colors.muted,
    },
    suppItemSub: {
      color: colors.ok,
    },
    itemNutrCol: {
      alignItems: "flex-end",
      gap: 2,
    },
    itemKcal: {
      fontSize: fontSize.sm,
      fontWeight: "700",
      color: colors.text,
    },
    itemMacros: {
      fontSize: 11,
      color: colors.muted,
    },
    removeBtn: {
      marginLeft: space[3],
      padding: space[1],
      borderRadius: radius.sm,
      justifyContent: "center",
      alignItems: "center",
    },
    bottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      padding: space[4],
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      elevation: 8,
    },
    backBtn: {
      minHeight: tap,
      paddingHorizontal: space[3],
      borderRadius: radius.md,
      justifyContent: "center",
      alignItems: "center",
    },
    backBtnText: {
      fontSize: fontSize.sm,
      color: colors.muted,
      fontWeight: "600",
    },
    saveBtn: {
      flex: 1,
      minHeight: tap,
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space[2],
      paddingHorizontal: space[4],
    },
    btnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      fontSize: fontSize.sm,
      fontWeight: "700",
      color: colors.accentInk,
    },
  });
}
