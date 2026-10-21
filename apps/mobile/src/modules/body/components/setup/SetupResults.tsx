import { StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { formatKcal } from "@/modules/nutrition/services/nutritionCalc";

import { bmi, bmiCategory } from "../../services/weightCalc";
import type { MacroTargets } from "@/modules/nutrition/services/nutritionCalc";
import type { BmiScale } from "../../types/body";
import { Helper, PrimaryButton, Segmented } from "./SetupParts";

// Segment widths and labels for the BMI bar: Asia-Pacific cutoffs 18.5 / 23 / 25 (prototype),
// WHO cutoffs 18.5 / 25 / 30, each ending 5 points past the last cutoff.
const SCALES: Record<BmiScale, { widths: number[]; labels: string[] }> = {
  asia_pacific: { widths: [18.5, 4.5, 2, 5], labels: ["under 18.5", "23", "25", "30+"] },
  who: { widths: [18.5, 6.5, 5, 5], labels: ["under 18.5", "25", "30", "35+"] },
};

type Props = {
  kcal: number;
  subLine: { lead: string; bold: string | null };
  bmrKcal: number;
  tdeeKcal: number;
  offset: number;
  heightCm: number;
  weightKg: number;
  bmiScale: BmiScale;
  onBmiScale: (scale: BmiScale) => void;
  macros: MacroTargets;
  saving: boolean;
  error: string | null;
  onStart: () => void;
};

export function SetupResults(props: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { colors } = theme;
  const value = bmi(props.weightKg, props.heightCm);
  const scale = SCALES[props.bmiScale];
  const total = scale.widths.reduce((a, b) => a + b, 0);
  const pin = Math.min(1, Math.max(0, value / total));
  const barColors = [colors.protein, colors.ok, colors.estimate, colors.over];

  return (
    <View style={styles.content}>
      <View style={[styles.card, styles.hero]}>
        {/* A View, not nested Text: Android ignores padding and radius on nested Text. */}
        <View style={styles.lblRow}>
          <Text style={styles.lbl}>Daily calorie target</Text>
          <View style={styles.est}>
            <Text style={styles.estText}>est.</Text>
          </View>
        </View>
        <Text style={styles.num} accessibilityLabel={`${formatKcal(props.kcal)} kcal a day, estimate`}>
          {formatKcal(props.kcal)}
        </Text>
        <Text style={styles.sub}>
          {props.subLine.lead}
          {props.subLine.bold && <Text style={styles.subBold}>{props.subLine.bold}</Text>}
        </Text>
      </View>
      <View style={styles.metrics}>
        <Metric k="BMR" v={formatKcal(props.bmrKcal)} styles={styles} />
        <Metric k="TDEE" v={formatKcal(props.tdeeKcal)} styles={styles} />
        {props.offset !== 0 && (
          <Metric
            k={props.offset < 0 ? "Deficit" : "Surplus"}
            v={`${props.offset < 0 ? "−" : "+"}${formatKcal(Math.abs(props.offset))}`}
            styles={styles}
          />
        )}
      </View>
      <View style={styles.card}>
        <View style={styles.bmiHead}>
          <Text style={styles.bmiValue}>
            BMI {value.toFixed(1)}
            <Text style={styles.bmiCat}> {bmiCategory(value, props.bmiScale)}</Text>
          </Text>
          <View style={styles.bmiToggle}>
            <Segmented
              label="BMI scale"
              small
              value={props.bmiScale}
              onChange={props.onBmiScale}
              options={[
                { value: "asia_pacific", label: "Asia-Pac" },
                { value: "who", label: "WHO" },
              ]}
            />
          </View>
        </View>
        <View style={styles.scale} accessibilityLabel={`BMI ${value.toFixed(1)} on the scale`}>
          {scale.widths.map((w, i) => (
            <View key={i} style={[styles.scalePart, { flex: w, backgroundColor: barColors[i] }]} />
          ))}
          <View style={[styles.pin, { left: `${pin * 100}%` }]} />
        </View>
        <View style={styles.scaleLabels}>
          {scale.labels.map((l) => (
            <Text key={l} style={styles.scaleLabel}>
              {l}
            </Text>
          ))}
        </View>
        <Helper>{"BMI doesn't account for muscle. Your weight trend tells you more."}</Helper>
      </View>
      <View style={styles.split}>
        <Macro color={colors.protein} grams={props.macros.proteinG} label="Protein 30%" styles={styles} />
        <Macro color={colors.carbs} grams={props.macros.carbsG} label="Carbs 40%" styles={styles} />
        <Macro color={colors.fat} grams={props.macros.fatG} label="Fat 30%" styles={styles} />
      </View>
      <View style={styles.spacer} />
      <Text style={styles.disclaimer}>
        {"Estimates from the Mifflin-St Jeor formula, not medical advice.\nChange any of this in Settings."}
      </Text>
      {props.error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {props.error}
        </Text>
      )}
      <PrimaryButton label={props.saving ? "Saving..." : "Start tracking"} onPress={props.onStart} disabled={props.saving} />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Metric({ k, v, styles }: { k: string; v: string; styles: Styles }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricK}>{k}</Text>
      <Text style={styles.metricV}>
        {v}
        <Text style={styles.metricUnit}> kcal</Text>
      </Text>
    </View>
  );
}

function Macro({ color, grams, label, styles }: { color: string; grams: number; label: string; styles: Styles }) {
  return (
    <View style={styles.macro}>
      <View style={[styles.macroBar, { backgroundColor: color }]} />
      <Text style={styles.macroG}>{grams} g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius } = theme;
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      gap: space[4],
      paddingTop: space[2],
      paddingHorizontal: space[4],
      paddingBottom: space[4],
    },
    spacer: { flex: 1 },
    card: {
      padding: space[4],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    hero: { alignItems: "center", paddingVertical: space[5] },
    lbl: { color: colors.muted, fontSize: fontSize.sm },
    lblRow: { flexDirection: "row", alignItems: "center", gap: space[1] },
    // prototypes/onboarding.html .est: padding 1px 6px, pill radius.
    est: { paddingVertical: 1, paddingHorizontal: 6, borderRadius: 999, backgroundColor: colors.estimateSoft },
    estText: { color: colors.estimate, fontSize: fontSize.xs, fontWeight: "600" },
    num: {
      color: colors.accentText,
      fontSize: 48,
      fontWeight: "700",
      letterSpacing: -1.4,
      lineHeight: 53,
      marginVertical: space[1],
      fontVariant: ["tabular-nums"],
    },
    sub: { color: colors.muted, fontSize: fontSize.sm, textAlign: "center" },
    subBold: { color: colors.text, fontWeight: "700" },
    metrics: { flexDirection: "row", gap: space[2] },
    metric: {
      flex: 1,
      padding: space[3],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    metricK: { color: colors.muted, fontSize: fontSize.xs },
    metricV: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", marginTop: 2, fontVariant: ["tabular-nums"] },
    metricUnit: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "400" },
    bmiHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space[3] },
    bmiValue: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
    bmiCat: { color: colors.estimate, fontSize: fontSize.sm, fontWeight: "600" },
    bmiToggle: { width: 150 },
    scale: { height: 8, flexDirection: "row", gap: 2 },
    scalePart: { borderRadius: 2 },
    pin: { position: "absolute", top: -5, width: 4, height: 18, marginLeft: -2, borderRadius: 2, backgroundColor: colors.text },
    scaleLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: space[2] },
    scaleLabel: { color: colors.faint, fontSize: fontSize.xs },
    split: { flexDirection: "row", gap: space[2] },
    macro: { flex: 1, paddingVertical: space[2], paddingHorizontal: space[3], borderRadius: radius.sm, backgroundColor: colors.surface2 },
    macroBar: { width: 24, height: 3, borderRadius: 2, marginBottom: space[2] },
    macroG: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
    macroLabel: { color: colors.muted, fontSize: fontSize.xs },
    disclaimer: { color: colors.faint, fontSize: fontSize.xs, textAlign: "center", lineHeight: 16 },
    error: { color: colors.over, fontSize: fontSize.sm, textAlign: "center" },
  });
}
