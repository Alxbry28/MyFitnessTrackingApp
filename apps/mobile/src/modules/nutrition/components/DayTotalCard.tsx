import { StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { formatKcal, macroTargets } from "../services/nutritionCalc";
import type { Nutrients } from "../types/foodLog";

type Props = {
  totals?: Nutrients;
  eaten?: number;
  goal: number | null;
};

// The day total from prototypes/log.html with macro breakdown: kcal / goal, badge, split bar, and consumed macros.
export function DayTotalCard({ totals, eaten: propEaten, goal }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { colors } = theme;
  const eaten = totals?.kcal ?? propEaten ?? 0;
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
  const targets = goal === null ? null : macroTargets(goal);

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${formatKcal(eaten)}${goal !== null ? ` of ${formatKcal(goal)}` : ""} kcal${badge ? `, ${badge}` : ""}. Protein: ${Math.round(totals?.proteinG ?? 0)}g, Carbs: ${Math.round(totals?.carbsG ?? 0)}g, Fat: ${Math.round(totals?.fatG ?? 0)}g`}
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
      <View style={styles.macros}>
        <Macro
          name="Protein"
          value={totals?.proteinG ?? null}
          target={targets?.proteinG ?? null}
          color={colors.protein}
          styles={styles}
        />
        <Macro
          name="Carbs"
          value={totals?.carbsG ?? null}
          target={targets?.carbsG ?? null}
          color={colors.carbs}
          styles={styles}
        />
        <Macro
          name="Fat"
          value={totals?.fatG ?? null}
          target={targets?.fatG ?? null}
          color={colors.fat}
          styles={styles}
        />
      </View>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Macro({
  name,
  value,
  target,
  color,
  styles,
}: {
  name: string;
  value: number | null;
  target: number | null;
  color: string;
  styles: Styles;
}) {
  const grams = Math.round(value ?? 0);
  const fraction = target && target > 0 ? Math.min(grams / target, 1) : 0;
  return (
    <View style={styles.macro} accessible accessibilityLabel={`${name} ${grams}${target ? ` of ${target}` : ""} grams`}>
      <Text style={styles.macroName}>{name}</Text>
      <Text style={styles.macroVal}>
        {grams}
        {target !== null && <Text style={styles.macroTarget}> / {target} g</Text>}
        {target === null && <Text style={styles.macroTarget}> g</Text>}
      </Text>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${fraction * 100}%`, backgroundColor: color }]} />
      </View>
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
    macros: {
      flexDirection: "row",
      gap: space[3],
      paddingTop: space[3],
      paddingBottom: space[3],
      paddingHorizontal: space[4],
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    macro: { flex: 1 },
    macroName: { color: colors.muted, fontSize: fontSize.xs },
    macroVal: {
      color: colors.text,
      fontSize: fontSize.sm,
      fontWeight: "600",
      marginTop: 2,
      marginBottom: space[1],
      fontVariant: ["tabular-nums"],
    },
    macroTarget: { color: colors.faint, fontWeight: "400" },
    bar: { height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: "hidden" },
    barFill: { height: "100%", borderRadius: 2 },
  });
}
