import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { formatGrams, formatKcal } from "../services/nutritionCalc";
import type { FoodLogEntry } from "../types/foodLog";

type Props = {
  entry: FoodLogEntry;
  onPress: (entry: FoodLogEntry) => void;
  onDelete: (entry: FoodLogEntry) => void;
};

export function EntryRow({ entry, onPress, onDelete }: Props) {
  const styles = makeStyles(useTheme());
  const grams = formatGrams(entry.grams);
  const kcal = formatKcal(entry.kcal);

  return (
    <Pressable
      onPress={() => onPress(entry)}
      onLongPress={() => onDelete(entry)}
      accessibilityRole="button"
      accessibilityLabel={`${entry.productName}, ${grams}, ${kcal} kcal. Edit`}
      accessibilityHint="Long-press to delete"
      accessibilityActions={[{ name: "delete", label: "Delete" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "delete") onDelete(entry);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.productName}
        </Text>
        <Text style={styles.qty}>{grams}</Text>
      </View>
      <Text style={styles.kcal}>{kcal}</Text>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, tap } = theme;
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      minHeight: tap,
      paddingVertical: space[2],
      paddingHorizontal: space[4],
      backgroundColor: colors.surface,
    },
    pressed: { backgroundColor: colors.surface2 },
    info: { flex: 1, minWidth: 0 },
    name: { color: colors.text, fontSize: fontSize.md },
    qty: { color: colors.muted, fontSize: fontSize.sm },
    kcal: { color: colors.text, fontSize: fontSize.md, fontWeight: "600", fontVariant: ["tabular-nums"] },
  });
}
