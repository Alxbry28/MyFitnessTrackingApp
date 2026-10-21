import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { formatKcal, macroTargets } from "../services/nutritionCalc";
import type { Nutrients } from "../types/foodLog";

// Ring geometry from prototypes/today.html: 128 box, r 54, stroke 12.
const SIZE = 128;
const RADIUS = 54;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = { totals: Nutrients; goal: number | null; onSetGoal: () => void };

export function TodaySummary({ totals, goal, onSetGoal }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { colors } = theme;
  const eaten = totals.kcal;

  // Over is information, not an error: the ring fills and the copy says how far.
  const over = goal !== null && Math.round(eaten) > goal;
  const left = goal === null ? null : goal - eaten;
  const fraction = goal === null || goal <= 0 ? 0 : Math.min(eaten / goal, 1);

  let centerNum: string;
  let centerLbl: string;
  if (left === null) {
    centerNum = formatKcal(eaten);
    centerLbl = "kcal eaten";
  } else if (over) {
    centerNum = formatKcal(-left);
    centerLbl = "kcal over";
  } else {
    centerNum = formatKcal(left);
    centerLbl = "kcal left";
  }

  const targets = goal === null ? null : macroTargets(goal);
  const summary =
    left === null
      ? `${formatKcal(eaten)} kcal eaten. No goal set`
      : `${centerNum} ${centerLbl}. Eaten ${formatKcal(eaten)} of ${formatKcal(goal ?? 0)} kcal`;

  return (
    <View style={styles.card}>
      <View style={styles.summary}>
        <View style={styles.ring} accessible accessibilityLabel={summary}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={styles.ringSvg}>
            <Circle cx={64} cy={64} r={RADIUS} fill="none" stroke={colors.track} strokeWidth={STROKE} />
            {fraction > 0 && (
              <Circle
                cx={64}
                cy={64}
                r={RADIUS}
                fill="none"
                stroke={over ? colors.over : colors.accent}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={`${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              />
            )}
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.num, over && styles.overText, left === null && styles.neutral]}>{centerNum}</Text>
            <Text style={styles.lbl}>{centerLbl}</Text>
          </View>
        </View>
        <View style={styles.stats}>
          <Stat label="Eaten" value={formatKcal(eaten)} styles={styles} />
          {goal === null ? (
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Goal</Text>
              <Pressable onPress={onSetGoal} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.link}>Set goal</Text>
              </Pressable>
            </View>
          ) : (
            <Stat label="Goal" value={formatKcal(goal)} styles={styles} />
          )}
          {left !== null && (
            <Stat
              label={over ? "Over" : "Remaining"}
              value={formatKcal(Math.abs(left))}
              valueStyle={over ? styles.overText : styles.okText}
              styles={styles}
            />
          )}
          <View style={[styles.stat, styles.burned]}>
            {/* A View, not nested Text: Android ignores padding and radius on nested Text. */}
            <View style={styles.burnedLabel}>
              <Text style={styles.statLabel}>Burned</Text>
              <View style={styles.est}>
                <Text style={styles.estText}>est.</Text>
              </View>
            </View>
            <Text style={styles.statValue} accessibilityLabel="Burned calories not available">
              —
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.macros}>
        <Macro name="Protein" value={totals.proteinG} target={targets?.proteinG ?? null} color={colors.protein} styles={styles} />
        <Macro name="Carbs" value={totals.carbsG} target={targets?.carbsG ?? null} color={colors.carbs} styles={styles} />
        <Macro name="Fat" value={totals.fatG} target={targets?.fatG ?? null} color={colors.fat} styles={styles} />
      </View>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Stat({
  label,
  value,
  valueStyle,
  styles,
}: {
  label: string;
  value: string;
  valueStyle?: object;
  styles: Styles;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueStyle]}>{value}</Text>
    </View>
  );
}

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
  const fraction = target ? Math.min(grams / target, 1) : 0;
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
      padding: space[4],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    summary: { flexDirection: "row", alignItems: "center", gap: space[4] },
    ring: { width: SIZE, height: SIZE },
    // The prototype rotates the SVG -90° so the arc starts at the top.
    ringSvg: { transform: [{ rotate: "-90deg" }] },
    ringCenter: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
    num: {
      color: colors.ok,
      fontSize: fontSize.num,
      fontWeight: "700",
      letterSpacing: -1,
      lineHeight: fontSize.num,
      fontVariant: ["tabular-nums"],
    },
    overText: { color: colors.over },
    okText: { color: colors.ok },
    neutral: { color: colors.text },
    lbl: { color: colors.muted, fontSize: fontSize.xs, marginTop: space[1] },
    stats: { flex: 1, gap: space[2] },
    stat: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    burned: { marginTop: space[1] },
    statLabel: { color: colors.muted, fontSize: fontSize.sm },
    statValue: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600", fontVariant: ["tabular-nums"] },
    link: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: "600" },
    burnedLabel: { flexDirection: "row", alignItems: "center", gap: space[1] },
    // prototypes/today.html .est: padding 1px 6px, pill radius.
    est: { paddingVertical: 1, paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: colors.estimateSoft },
    estText: { color: colors.estimate, fontSize: fontSize.xs, fontWeight: "600" },
    macros: {
      flexDirection: "row",
      gap: space[3],
      marginTop: space[4],
      paddingTop: space[4],
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    macro: { flex: 1 },
    macroName: { color: colors.muted, fontSize: fontSize.xs },
    macroVal: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600", marginTop: 2, marginBottom: space[1], fontVariant: ["tabular-nums"] },
    macroTarget: { color: colors.faint, fontWeight: "400" },
    bar: { height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: "hidden" },
    barFill: { height: "100%", borderRadius: 2 },
  });
}
