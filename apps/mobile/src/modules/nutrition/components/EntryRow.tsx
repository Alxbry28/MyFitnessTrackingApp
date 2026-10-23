import { Pressable, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { formatGrams, formatKcal, formatMacro } from "../services/nutritionCalc";
import type { FoodLogEntry } from "../types/foodLog";

type Props = {
  entry: FoodLogEntry;
  onPress: (entry: FoodLogEntry) => void;
  onDelete: (entry: FoodLogEntry) => void;
};

const DELETE_WIDTH = 88;

// A log row from prototypes/log.html; swipe left to reveal Delete. Long press and the
// accessibility action still delete for anyone who can't swipe. Shows grams and consumed macros.
export function EntryRow({ entry, onPress, onDelete }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { colors } = theme;
  const grams = formatGrams(entry.grams);
  const kcal = formatKcal(entry.kcal);
  const hasMacros = entry.proteinG !== null || entry.carbsG !== null || entry.fatG !== null;
  const macroAccessibility = hasMacros
    ? `, protein ${formatMacro(entry.proteinG)}g, carbs ${formatMacro(entry.carbsG)}g, fat ${formatMacro(entry.fatG)}g`
    : "";

  return (
    <ReanimatedSwipeable
      friction={1.5}
      rightThreshold={DELETE_WIDTH / 2}
      overshootRight={false}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          onPress={() => {
            methods.close();
            onDelete(entry);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${entry.productName}`}
          style={styles.delete}
        >
          <Text style={styles.deleteLabel}>Delete</Text>
        </Pressable>
      )}
    >
      <Pressable
        onPress={() => onPress(entry)}
        onLongPress={() => onDelete(entry)}
        accessibilityRole="button"
        accessibilityLabel={`${entry.productName}, ${grams}, ${kcal} kcal${macroAccessibility}. Edit`}
        accessibilityHint="Swipe left or long-press to delete"
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
          <Text style={styles.qty} numberOfLines={1}>
            {grams}
            {hasMacros && (
              <>
                {" · "}
                <Text style={{ color: colors.protein }}>{formatMacro(entry.proteinG)}g P</Text>
                {" · "}
                <Text style={{ color: colors.carbs }}>{formatMacro(entry.carbsG)}g C</Text>
                {" · "}
                <Text style={{ color: colors.fat }}>{formatMacro(entry.fatG)}g F</Text>
              </>
            )}
          </Text>
        </View>
        <Text style={styles.kcal}>{kcal}</Text>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize } = theme;
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      minHeight: 52,
      paddingVertical: space[2],
      paddingHorizontal: space[4],
      backgroundColor: colors.surface,
    },
    pressed: { backgroundColor: colors.surface2 },
    info: { flex: 1, minWidth: 0 },
    name: { color: colors.text, fontSize: fontSize.md },
    qty: { color: colors.muted, fontSize: fontSize.sm, fontVariant: ["tabular-nums"] },
    kcal: { color: colors.text, fontSize: fontSize.md, fontWeight: "500", fontVariant: ["tabular-nums"] },
    delete: { width: DELETE_WIDTH, alignItems: "center", justifyContent: "center", backgroundColor: colors.over },
    deleteLabel: { color: colors.bg, fontSize: fontSize.sm, fontWeight: "700" },
  });
}
