import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import type { MealGroup } from "../hooks/useDayLog";
import { MEAL_LABELS } from "../services/mealTime";
import { formatKcal } from "../services/nutritionCalc";

type Props = { group: MealGroup; onOpen: () => void; onAdd: () => void };

// A meal on Today (prototypes/today.html .meal): foods and kcal, or an empty "+ Add".
export function MealCard({ group, onOpen, onAdd }: Props) {
  const styles = makeStyles(useTheme());
  const title = MEAL_LABELS[group.mealType];

  if (group.entries.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.items, styles.empty]}>Nothing logged yet</Text>
        </View>
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add to ${title}`}
          style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
        >
          <Text style={styles.addLabel}>+ Add</Text>
        </Pressable>
      </View>
    );
  }

  const foods = group.entries.map((e) => e.productName).join(", ");
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatKcal(group.kcal)} kcal: ${foods}. Open log`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.items} numberOfLines={1}>
          {foods}
        </Text>
      </View>
      <Text style={styles.kcal}>
        {formatKcal(group.kcal)}
        <Text style={styles.kcalUnit}> kcal</Text>
      </Text>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius } = theme;
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      minHeight: 64,
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    pressed: { backgroundColor: colors.surface2 },
    info: { flex: 1, minWidth: 0 },
    title: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    items: { color: colors.muted, fontSize: fontSize.sm },
    empty: { color: colors.faint },
    kcal: { color: colors.text, fontSize: fontSize.md, fontWeight: "600", fontVariant: ["tabular-nums"] },
    kcalUnit: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "400" },
    add: {
      height: 36,
      justifyContent: "center",
      paddingHorizontal: space[3],
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addPressed: { backgroundColor: colors.surface2 },
    addLabel: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: "600" },
  });
}
