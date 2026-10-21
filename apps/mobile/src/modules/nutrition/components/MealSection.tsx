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

// A meal card from prototypes/log.html. The "+ Add" link is an addition so past days stay editable.
export function MealSection({ group, onAdd, onEdit, onDelete }: Props) {
  const styles = makeStyles(useTheme());
  const label = MEAL_LABELS[group.mealType];

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {label}
        </Text>
        <View style={styles.headRight}>
          <Text style={styles.subtotal}>{formatKcal(group.kcal)} kcal</Text>
          <Pressable
            onPress={() => onAdd(group.mealType)}
            accessibilityRole="button"
            accessibilityLabel={`Add food to ${label}`}
            // Extends the small link to a 48 dp touch target (DESIGN_SYSTEM.md) without moving the layout.
            hitSlop={{ top: 15, bottom: 15, left: 12, right: 12 }}
          >
            <Text style={styles.add}>+ Add</Text>
          </Pressable>
        </View>
      </View>
      {group.entries.map((entry, index) => (
        <View key={entry.id} style={index > 0 && styles.divided}>
          <EntryRow entry={entry} onPress={onEdit} onDelete={onDelete} />
        </View>
      ))}
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius } = theme;
  return StyleSheet.create({
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    head: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      paddingTop: space[3],
      paddingHorizontal: space[4],
      paddingBottom: space[1],
    },
    headRight: { flexDirection: "row", alignItems: "baseline", gap: space[3] },
    title: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    subtotal: { color: colors.muted, fontSize: fontSize.sm, fontVariant: ["tabular-nums"] },
    add: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: "600" },
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
  });
}
