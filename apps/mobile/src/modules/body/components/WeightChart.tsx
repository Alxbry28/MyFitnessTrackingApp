import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { addDays, dayFromKey, formatDayLabel } from "@/modules/nutrition/services/mealTime";

import { formatKg, type ChartPoint } from "../services/weightCalc";

type Props = { points: ChartPoint[]; today: string; days?: number };

const HEIGHT = 120;
const DOT = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

// Plain Views until a chart library lands: daily weights as small dots and the
// 7-day trend as accent dots, matching prototypes/progress.html.
export function WeightChart({ points, today, days = 30 }: Props) {
  const styles = makeStyles(useTheme());
  const [width, setWidth] = useState(0);
  const from = addDays(today, -(days - 1));
  const values = points.flatMap((p) => [p.weightKg, p.trendKg]);
  const max = Math.max(...values) + 0.2;
  const min = Math.min(...values) - 0.2;
  const x = (day: string) =>
    (Math.round((dayFromKey(day).getTime() - dayFromKey(from).getTime()) / DAY_MS) / (days - 1)) * (width - DOT);
  const y = (kg: number) => ((max - kg) / (max - min)) * (HEIGHT - DOT);

  const first = points[0];
  const last = points[points.length - 1];
  return (
    <View
      accessible
      accessibilityLabel={`Weight chart, last ${days} days: ${formatKg(first.weightKg)} kg ${formatDayLabel(first.day, today)}, ${formatKg(last.weightKg)} kg ${formatDayLabel(last.day, today)}`}
    >
      <View style={styles.plot} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={[styles.grid, { top: 0 }]} />
        <View style={[styles.grid, { top: HEIGHT / 2 }]} />
        <View style={[styles.grid, { top: HEIGHT - 1 }]} />
        {width > 0 &&
          points.map((p) => (
            <View key={p.day}>
              <View style={[styles.dot, styles.daily, { left: x(p.day), top: y(p.weightKg) }]} />
              <View style={[styles.dot, styles.trend, { left: x(p.day), top: y(p.trendKg) }]} />
            </View>
          ))}
        <Text style={[styles.axis, styles.axisTop]}>{formatKg(max)}</Text>
        <Text style={[styles.axis, styles.axisBottom]}>{formatKg(min)}</Text>
      </View>
      <View style={styles.dates}>
        <Text style={styles.axis}>{formatDayLabel(from, today)}</Text>
        <Text style={styles.axis}>Today</Text>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius } = theme;
  return StyleSheet.create({
    plot: { height: HEIGHT, marginTop: space[2] },
    grid: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: colors.border },
    dot: { position: "absolute", width: DOT, height: DOT, borderRadius: radius.pill },
    daily: { backgroundColor: colors.faint },
    trend: { backgroundColor: colors.accent },
    axis: { color: colors.muted, fontSize: fontSize.xs, fontVariant: ["tabular-nums"] },
    axisTop: { position: "absolute", right: 0, top: 2 },
    axisBottom: { position: "absolute", right: 0, bottom: 2 },
    dates: { flexDirection: "row", justifyContent: "space-between", marginTop: space[1] },
  });
}
