import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import type { PreviewLine, PreviewSection } from "../hooks/usePasteLog";
import { gramsToText } from "../services/entrySchema";
import { MEAL_LABELS } from "../services/mealTime";
import { formatKcal } from "../services/nutritionCalc";
import { MEAL_TYPES, type MealType } from "../types/foodLog";
import type { PastedFood } from "../types/pasteLog";

type Summary = { matched: number; check: number; notFound: number };

type Props = {
  sections: PreviewSection[];
  summary: Summary;
  onPickMeal: (sectionId: string, meal: MealType) => void;
  onOpenLine: (line: Extract<PreviewLine, { kind: "food" }>, section: PreviewSection) => void;
};

type Styles = ReturnType<typeof makeStyles>;

export function PasteLogPreview({ sections, summary, onPickMeal, onOpenLine }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [choosingMeal, setChoosingMeal] = useState<string | null>(null);
  const unread = sections.flatMap((s) => s.lines.filter((l) => l.kind === "unread"));

  return (
    <View style={styles.list}>
      <View style={styles.summary}>
        {summary.matched > 0 && <Text style={[styles.pill, styles.pillOk]}>{summary.matched} matched</Text>}
        {summary.check > 0 && <Text style={[styles.pill, styles.pillWarn]}>{summary.check} to check</Text>}
        {summary.notFound > 0 && <Text style={[styles.pill, styles.pillBad]}>{summary.notFound} not found</Text>}
      </View>
      {sections.map((section) => {
        const foods = section.lines.filter((l): l is Extract<PreviewLine, { kind: "food" }> => l.kind === "food");
        if (foods.length === 0) return null;
        const title = section.heading ?? MEAL_LABELS[section.meal];
        const open = choosingMeal === section.id;
        return (
          <View key={section.id} style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.headTitle} numberOfLines={1}>
                {title}
              </Text>
              {section.mealFromHeading ? (
                <Text style={styles.sum}>{formatKcal(section.kcal)} kcal</Text>
              ) : (
                <Pressable
                  onPress={() => setChoosingMeal(open ? null : section.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${title} logs as ${MEAL_LABELS[section.meal]}. Change meal`}
                  accessibilityState={{ expanded: open }}
                  hitSlop={8}
                  style={styles.map}
                >
                  <Text style={styles.mapText}>logs as</Text>
                  <Text style={styles.mapValue}>{MEAL_LABELS[section.meal]} ▾</Text>
                </Pressable>
              )}
            </View>
            {open && (
              <View style={styles.mealRow}>
                {MEAL_TYPES.map((meal) => {
                  const selected = section.meal === meal;
                  return (
                    <Pressable
                      key={meal}
                      onPress={() => {
                        onPickMeal(section.id, meal);
                        setChoosingMeal(null);
                      }}
                      accessibilityRole="radio"
                      accessibilityLabel={`${title}: ${MEAL_LABELS[meal]}`}
                      accessibilityState={{ checked: selected }}
                      style={[styles.chip, selected && styles.chipOn]}
                    >
                      <Text style={[styles.chipLabel, selected && styles.chipLabelOn]}>{MEAL_LABELS[meal]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {foods.map((line, index) => (
              <FoodLine key={index} line={line} styles={styles} onPress={() => onOpenLine(line, section)} />
            ))}
          </View>
        );
      })}
      {unread.length > 0 && (
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.headTitle}>Not read</Text>
          </View>
          {unread.map((line, index) => (
            <View key={index} style={styles.line}>
              <View style={[styles.dot, styles.dotBad]} />
              <View style={styles.info}>
                <Text style={styles.name}>{line.kind === "unread" ? line.raw : ""}</Text>
                <Text style={[styles.src, styles.srcBad]}>Not read. Use a line like 250g rice</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function amountText(food: PastedFood): string {
  return `${gramsToText(food.amount)}${food.unit}`;
}

function FoodLine({
  line,
  styles,
  onPress,
}: {
  line: Extract<PreviewLine, { kind: "food" }>;
  styles: Styles;
  onPress: () => void;
}) {
  const { food, match, kcal } = line;
  const product = match.product;
  const estimate = product?.source === "ai_estimate";
  let src = food.raw;
  if (match.status === "not_found") src = `${amountText(food)} · not in your library`;
  else if (match.status === "check" && match.candidates.length > 1) src = `${food.raw} · ${match.candidates.length} matches`;
  if (food.unit !== "g" && match.status !== "not_found") src = `${src} (${gramsToText(Math.round(food.grams * 10) / 10)} g)`;

  const tone = match.status === "matched" ? null : match.status === "check" ? "warn" : "bad";
  const action = match.status === "check" ? "Check" : match.status === "not_found" ? "Add" : null;
  const label = [product?.name ?? food.name, src, kcal !== null && !action ? `${formatKcal(kcal)} kcal` : null, action]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.line, pressed && styles.pressed]}
    >
      <View style={[styles.dot, tone === "warn" && styles.dotWarn, tone === "bad" && styles.dotBad]} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product?.name ?? food.name}
          {estimate && <Text style={styles.est}> est. </Text>}
        </Text>
        <Text
          style={[styles.src, tone === "warn" && styles.srcWarn, tone === "bad" && styles.srcBad]}
          numberOfLines={1}
        >
          {src}
        </Text>
      </View>
      {action ? (
        <View style={styles.fix}>
          <Text style={styles.fixLabel}>{action}</Text>
        </View>
      ) : (
        kcal !== null && <Text style={styles.kcal}>{formatKcal(kcal)}</Text>
      )}
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius } = theme;
  return StyleSheet.create({
    list: { gap: space[3] },
    summary: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
    pill: {
      fontSize: fontSize.xs,
      fontWeight: "600",
      paddingVertical: space[1],
      paddingHorizontal: space[2],
      borderRadius: radius.pill,
      overflow: "hidden",
    },
    pillOk: { color: colors.ok, backgroundColor: colors.surface2 },
    pillWarn: { color: colors.estimate, backgroundColor: colors.estimateSoft },
    pillBad: { color: colors.over, backgroundColor: colors.overSoft },
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: space[2],
      paddingTop: space[3],
      paddingBottom: space[1],
      paddingHorizontal: space[4],
    },
    headTitle: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    sum: { color: colors.muted, fontSize: fontSize.sm, fontVariant: ["tabular-nums"] },
    map: { flexDirection: "row", alignItems: "center", gap: space[1] },
    mapText: { color: colors.muted, fontSize: fontSize.xs },
    mapValue: {
      color: colors.accentText,
      fontSize: fontSize.xs,
      fontWeight: "600",
      backgroundColor: colors.accentSoft,
      paddingVertical: 2,
      paddingHorizontal: space[2],
      borderRadius: radius.pill,
      overflow: "hidden",
    },
    mealRow: { flexDirection: "row", flexWrap: "wrap", gap: space[2], paddingHorizontal: space[4], paddingBottom: space[2] },
    chip: {
      height: 32,
      justifyContent: "center",
      paddingHorizontal: space[3],
      borderRadius: radius.pill,
      backgroundColor: colors.surface2,
    },
    chipOn: { backgroundColor: colors.accentSoft },
    chipLabel: { color: colors.muted, fontSize: fontSize.sm },
    chipLabelOn: { color: colors.accentText, fontWeight: "600" },
    line: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      minHeight: 48,
      paddingVertical: space[2],
      paddingHorizontal: space[4],
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    pressed: { backgroundColor: colors.surface2 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ok },
    dotWarn: { backgroundColor: colors.estimate },
    dotBad: { backgroundColor: colors.over },
    info: { flex: 1, minWidth: 0 },
    name: { color: colors.text, fontSize: fontSize.sm, fontWeight: "500" },
    est: { color: colors.estimate, backgroundColor: colors.estimateSoft, fontSize: fontSize.xs, fontWeight: "600" },
    src: { color: colors.faint, fontSize: fontSize.xs },
    srcWarn: { color: colors.estimate },
    srcBad: { color: colors.over },
    kcal: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600", fontVariant: ["tabular-nums"] },
    fix: {
      height: 32,
      justifyContent: "center",
      paddingHorizontal: space[3],
      borderRadius: radius.pill,
      backgroundColor: colors.accentSoft,
    },
    fixLabel: { color: colors.accentText, fontSize: fontSize.xs, fontWeight: "700" },
  });
}
