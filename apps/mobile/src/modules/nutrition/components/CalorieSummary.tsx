import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { formatKcal } from "../services/nutritionCalc";

type Props = { eaten: number; goal: number | null; onSetGoal: () => void };

export function CalorieSummary({ eaten, goal, onSetGoal }: Props) {
  const styles = makeStyles(useTheme());

  if (goal === null) {
    return (
      <View style={styles.card}>
        <Text style={styles.big}>{formatKcal(eaten)} kcal eaten</Text>
        <Pressable onPress={onSetGoal} accessibilityRole="button" style={styles.setGoal}>
          <Text style={styles.setGoalLabel}>Set your goal</Text>
        </Pressable>
      </View>
    );
  }

  // Over is information, not an error: the bar fills and the copy says how far.
  const over = eaten > goal;
  const headline = over ? `${formatKcal(eaten - goal)} kcal over` : `${formatKcal(goal - eaten)} kcal left`;
  const fraction = Math.min(eaten / goal, 1);

  return (
    <View style={styles.card} accessible accessibilityLabel={`${headline}. Eaten ${formatKcal(eaten)} of ${formatKcal(goal)} kcal`}>
      <Text style={[styles.big, over && styles.over]}>{headline}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, over && styles.fillOver, { width: `${fraction * 100}%` }]} />
      </View>
      <View style={styles.captions}>
        <Text style={styles.caption}>Eaten {formatKcal(eaten)}</Text>
        <Text style={styles.caption}>Goal {formatKcal(goal)}</Text>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    card: { padding: space[4], gap: space[3], borderRadius: radius.md, backgroundColor: colors.surface },
    big: {
      color: colors.text,
      fontSize: fontSize.xl,
      fontWeight: "700",
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    over: { color: colors.over },
    track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.track, overflow: "hidden" },
    fill: { height: "100%", backgroundColor: colors.accent },
    fillOver: { backgroundColor: colors.over },
    captions: { flexDirection: "row", justifyContent: "space-between" },
    caption: { color: colors.muted, fontSize: fontSize.sm, fontVariant: ["tabular-nums"] },
    setGoal: {
      minHeight: tap,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: colors.accent,
    },
    setGoalLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
  });
}
