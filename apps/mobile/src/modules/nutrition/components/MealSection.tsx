import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import type { MealGroup } from "../hooks/useDayLog";
import { MEAL_LABELS } from "../services/mealTime";
import { formatKcal } from "../services/nutritionCalc";
import type { FoodLogEntry, MealType } from "../types/foodLog";
import { EntryRow } from "./EntryRow";

type Props = {
  group: MealGroup;
  onAdd: (mealType: MealType) => void;
  onEdit: (entry: FoodLogEntry) => void;
  onDelete: (entry: FoodLogEntry) => void;
};

export function MealSection({ group, onAdd, onEdit, onDelete }: Props) {
  const styles = makeStyles(useTheme());
  const label = MEAL_LABELS[group.mealType];
  const hasEntries = group.entries.length > 0;

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {label}
        </Text>
        <Text style={styles.subtotal}>{hasEntries ? `${formatKcal(group.kcal)} kcal` : "-"}</Text>
      </View>
      <View style={styles.card}>
        {group.entries.map((entry, index) => (
          <View key={entry.id} style={index > 0 && styles.divided}>
            <EntryRow entry={entry} onPress={onEdit} onDelete={onDelete} />
          </View>
        ))}
        <Pressable
          onPress={() => onAdd(group.mealType)}
          accessibilityRole="button"
          accessibilityLabel={`Add food to ${label}`}
          style={({ pressed }) => [styles.add, hasEntries && styles.divided, pressed && styles.pressed]}
        >
          <Text style={styles.addLabel}>+ Add food</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    head: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      paddingHorizontal: space[1],
      paddingTop: space[3],
      paddingBottom: space[1],
    },
    title: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    subtotal: { color: colors.muted, fontSize: fontSize.sm, fontVariant: ["tabular-nums"] },
    card: {
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    add: { minHeight: tap, justifyContent: "center", paddingHorizontal: space[4] },
    addLabel: { color: colors.accentText, fontSize: fontSize.md, fontWeight: "600" },
    pressed: { backgroundColor: colors.surface2 },
  });
}
