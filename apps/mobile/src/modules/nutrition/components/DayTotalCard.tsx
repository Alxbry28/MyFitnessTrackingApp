import { StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { formatKcal } from "../services/nutritionCalc";

type Props = { eaten: number; goal: number | null };

// The day total from prototypes/log.html: kcal / goal, an over or left badge, and a split bar.
export function DayTotalCard({ eaten, goal }: Props) {
  const styles = makeStyles(useTheme());
  const over = goal !== null && Math.round(eaten) > goal;

  let accentWidth = 0;
  let overWidth = 0;
  if (goal !== null && goal > 0) {
    if (over) {
      accentWidth = goal / eaten;
      overWidth = 1 - accentWidth;
    } else {
      accentWidth = Math.min(eaten / goal, 1);
    }
  }
  const badge = goal === null ? null : over ? `${formatKcal(eaten - goal)} over` : `${formatKcal(goal - eaten)} left`;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${formatKcal(eaten)}${goal !== null ? ` of ${formatKcal(goal)}` : ""} kcal${badge ? `, ${badge}` : ""}`}
    >
      <View style={styles.total}>
        <Text style={styles.big}>
          {formatKcal(eaten)}
          <Text style={styles.of}>{goal !== null ? ` / ${formatKcal(goal)} kcal` : " kcal"}</Text>
        </Text>
        {badge && (
          <View style={[styles.badge, over ? styles.badgeOver : styles.badgeLeft]}>
            <Text style={[styles.badgeText, over ? styles.badgeTextOver : styles.badgeTextLeft]}>{badge}</Text>
          </View>
        )}
      </View>
      {goal !== null && (
        <View style={styles.progress}>
          <View style={[styles.segment, styles.accent, { flex: accentWidth }]} />
          {overWidth > 0 && <View style={[styles.segment, styles.overFill, { flex: overWidth }]} />}
          <View style={{ flex: Math.max(0, 1 - accentWidth - overWidth) }} />
        </View>
      )}
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
      backgroundColor: colors.surface,
    },
    total: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: space[3],
      paddingHorizontal: space[4],
    },
    big: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", fontVariant: ["tabular-nums"] },
    of: { color: colors.muted, fontSize: fontSize.sm, fontWeight: "400" },
    badge: { paddingVertical: space[1], paddingHorizontal: space[3], borderRadius: radius.pill },
    badgeOver: { backgroundColor: colors.overSoft },
    badgeLeft: { backgroundColor: colors.surface2 },
    badgeText: { fontSize: fontSize.sm, fontWeight: "600", fontVariant: ["tabular-nums"] },
    badgeTextOver: { color: colors.over },
    badgeTextLeft: { color: colors.ok },
    progress: {
      height: 4,
      flexDirection: "row",
      marginHorizontal: space[4],
      marginBottom: space[3],
      borderRadius: 2,
      backgroundColor: colors.track,
      overflow: "hidden",
    },
    segment: { height: "100%" },
    accent: { backgroundColor: colors.accent },
    overFill: { backgroundColor: colors.over },
  });
}
