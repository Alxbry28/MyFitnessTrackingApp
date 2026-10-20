import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { bmi, bmiCategory, BMI_SCALE_LABELS, type DailyWeight } from "../services/weightCalc";
import type { BodyProfile } from "../types/body";

type Props = { profile: BodyProfile; latest: DailyWeight | null; onEditProfile: () => void };

export function BmiCard({ profile, latest, onEditProfile }: Props) {
  const styles = makeStyles(useTheme());
  const { heightCm, bmiScale } = profile;

  let body;
  if (heightCm === null) {
    body = (
      <>
        <Text style={styles.message}>Add your height to see your BMI</Text>
        <Pressable onPress={onEditProfile} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonLabel}>Add height</Text>
        </Pressable>
      </>
    );
  } else if (!latest) {
    body = <Text style={styles.message}>Log a weight to see your BMI</Text>;
  } else {
    const value = bmi(latest.weightKg, heightCm);
    body = (
      <>
        <View style={styles.head}>
          <Text style={styles.big}>{value.toFixed(1)}</Text>
          <Text style={styles.category}>{bmiCategory(value, bmiScale)}</Text>
        </View>
        <Text style={styles.note}>{"BMI can't tell muscle from fat."}</Text>
      </>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>BMI</Text>
        <Text style={styles.badge}>{BMI_SCALE_LABELS[bmiScale]} scale</Text>
      </View>
      {body}
      {heightCm !== null && (
        <Pressable
          onPress={onEditProfile}
          accessibilityRole="button"
          accessibilityLabel={`Height ${heightCm} cm. Edit body profile`}
          style={styles.profileRow}
        >
          <Text style={styles.meta}>Height {heightCm} cm</Text>
          <Text style={styles.link}>Edit</Text>
        </Pressable>
      )}
      <Text style={styles.note}>Estimate, not medical advice.</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    card: { padding: space[4], borderRadius: radius.md, backgroundColor: colors.surface, gap: space[2] },
    head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    title: { color: colors.muted, fontSize: fontSize.sm, fontWeight: "600" },
    badge: { color: colors.estimate, fontSize: fontSize.xs, fontWeight: "600" },
    big: { color: colors.text, fontSize: fontSize.num, fontWeight: "700", fontVariant: ["tabular-nums"] },
    category: { color: colors.estimate, fontSize: fontSize.md, fontWeight: "600" },
    message: { color: colors.muted, fontSize: fontSize.md },
    note: { color: colors.faint, fontSize: fontSize.sm },
    meta: { color: colors.muted, fontSize: fontSize.sm },
    link: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: "600" },
    profileRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: tap,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    button: {
      alignSelf: "flex-start",
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    buttonLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  });
}
