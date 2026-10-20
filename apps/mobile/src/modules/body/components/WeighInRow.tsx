import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { formatDayLabel } from "@/modules/nutrition/services/mealTime";

import { formatKg } from "../services/weightCalc";
import type { WeighIn, WeightSource } from "../types/body";

const SOURCE_LABELS: Record<WeightSource, string> = {
  manual: "Typed",
  csv_import: "Imported",
  health_connect: "Synced",
  apple_health: "Synced",
};

type Props = { reading: WeighIn; today: string; divided: boolean; onPress: () => void };

function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function WeighInRow({ reading, today, divided, onPress }: Props) {
  const styles = makeStyles(useTheme());
  const day = formatDayLabel(reading.day, today);
  const source = SOURCE_LABELS[reading.source];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${day}, ${formatKg(reading.weightKg)} kg, ${source}. Edit`}
      style={({ pressed }) => [styles.row, divided && styles.divided, pressed && styles.pressed]}
    >
      <View style={styles.info}>
        <Text style={styles.day}>{day}</Text>
        <Text style={styles.meta}>
          {timeOf(reading.measuredAt)} · {source}
        </Text>
      </View>
      <Text style={styles.kg}>{formatKg(reading.weightKg)} kg</Text>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, tap } = theme;
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: tap,
      paddingHorizontal: space[4],
      paddingVertical: space[2],
    },
    divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    pressed: { backgroundColor: colors.surface2 },
    info: { flex: 1 },
    day: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    meta: { color: colors.muted, fontSize: fontSize.sm },
    kg: { color: colors.text, fontSize: fontSize.md, fontWeight: "600", fontVariant: ["tabular-nums"] },
  });
}
