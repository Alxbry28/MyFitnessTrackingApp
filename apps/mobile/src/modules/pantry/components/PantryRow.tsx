import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { gramsToText } from "@/modules/nutrition/services/entrySchema";

import { daysText, expiryBadge, stockLeftText, supplementView, unitsText } from "../services/pantryStock";
import type { PantryStock } from "../types/pantry";

type Props = { item: PantryStock; today: string; last: boolean };

// A pantry.html .row; tapping it opens the item (frame 2).
export function PantryRow({ item, today, last }: Props) {
  const styles = makeStyles(useTheme());
  const supplement = item.kind === "supplement" ? supplementView(item, new Date()) : null;
  const low = supplement?.low && supplement.days !== null ? `low · ${daysText(supplement.days)}` : null;
  const badge = low ? { text: low, tone: "over" as const } : expiryBadge(item.expiresAt, today);
  const amount = supplement ? supplement.amount : unitsText(item.gramsLeft, item.netWeightG);
  // A low supplement says its days in the badge instead (frame 1's Wake row).
  const grams = supplement
    ? supplement.days !== null && !supplement.low
      ? daysText(supplement.days)
      : null
    : stockLeftText(item);
  const meta = supplement
    ? supplement.meta
    : [item.netWeightG !== null && `${gramsToText(item.netWeightG)} g each`, item.drained && "eaten drained"]
        .filter(Boolean)
        .join(" · ");

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/pantry/[id]", params: { id: item.id } })}
      style={({ pressed }) => [styles.row, !last && styles.divided, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={[item.name, amount, grams, badge?.text].filter(Boolean).join(", ")}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.meta}>
          {meta !== "" && <Text style={styles.metaText}>{meta}</Text>}
          {badge && (
            <View style={[styles.badge, badge.tone === "over" ? styles.badgeOver : styles.badgeEst]}>
              <Text style={[styles.badgeText, badge.tone === "over" ? styles.badgeTextOver : styles.badgeTextEst]}>
                {badge.text}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View>
        <Text style={styles.amt}>{amount}</Text>
        {grams !== null && <Text style={styles.amtSmall}>{grams}</Text>}
      </View>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius } = theme;
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 56, paddingVertical: space[2] },
    divided: { borderBottomWidth: 1, borderBottomColor: colors.border },
    pressed: { backgroundColor: colors.surface2 },
    info: { flex: 1, minWidth: 0 },
    name: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
    meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[1], marginTop: 2 },
    metaText: { color: colors.muted, fontSize: fontSize.sm },
    badge: { paddingVertical: 1, paddingHorizontal: 6, borderRadius: radius.pill },
    badgeOver: { backgroundColor: colors.overSoft },
    badgeEst: { backgroundColor: colors.estimateSoft },
    badgeText: { fontSize: fontSize.xs, fontWeight: "600" },
    badgeTextOver: { color: colors.over },
    badgeTextEst: { color: colors.estimate },
    amt: { color: colors.text, fontSize: fontSize.md, fontWeight: "600", textAlign: "right", fontVariant: ["tabular-nums"] },
    amtSmall: { color: colors.muted, fontSize: fontSize.xs, textAlign: "right" },
  });
}
