import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { formatDayLabel } from "@/modules/nutrition/services/mealTime";

import { formatChange, formatKg, type ChartPoint, type DailyWeight, type Trend } from "../services/weightCalc";
import { WeightChart } from "./WeightChart";

type Props = { trend: Trend; chart: ChartPoint[]; latest: DailyWeight | null; today: string; onLog: () => void };

export function WeightCard({ trend, chart, latest, today, onLog }: Props) {
  const styles = makeStyles(useTheme());

  if (!latest) {
    return (
      <View style={[styles.card, styles.empty]}>
        <Text style={styles.title}>Weight</Text>
        <Text style={styles.message}>No weigh-ins yet</Text>
        <Pressable onPress={onLog} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonLabel}>Log weight</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Weight · 7-day average</Text>
      <View style={styles.head}>
        <Text style={styles.big}>
          {trend.average !== null ? formatKg(trend.average) : "-"} <Text style={styles.unit}>kg</Text>
        </Text>
        {trend.change !== null && <Text style={styles.change}>{formatChange(trend.change)} vs last week</Text>}
      </View>
      <Text style={styles.meta}>
        Latest {formatKg(latest.weightKg)} kg · {formatDayLabel(latest.day, today)}
      </Text>
      {chart.length >= 2 && <WeightChart points={chart} today={today} />}
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    card: { padding: space[4], borderRadius: radius.md, backgroundColor: colors.surface, gap: space[1] },
    empty: { alignItems: "center", gap: space[3] },
    title: { color: colors.muted, fontSize: fontSize.sm, fontWeight: "600" },
    head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    big: { color: colors.text, fontSize: fontSize.num, fontWeight: "700", fontVariant: ["tabular-nums"] },
    unit: { color: colors.muted, fontSize: fontSize.md, fontWeight: "500" },
    change: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
    meta: { color: colors.muted, fontSize: fontSize.sm },
    message: { color: colors.muted, fontSize: fontSize.md },
    button: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.accent,
    },
    buttonLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
  });
}
