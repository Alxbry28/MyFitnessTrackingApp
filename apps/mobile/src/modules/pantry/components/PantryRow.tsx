import { StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { gramsToText } from "@/modules/nutrition/services/entrySchema";

import { expiryBadge, gramsLeftText, unitsText } from "../services/pantryStock";
import type { PantryStock } from "../types/pantry";

type Props = { item: PantryStock; today: string; last: boolean };

// A pantry.html .row. Not pressable yet: the item detail screen arrives with 8b.
export function PantryRow({ item, today, last }: Props) {
  const styles = makeStyles(useTheme());
  const badge = expiryBadge(item.expiresAt, today);
  const amount = unitsText(item.gramsLeft, item.netWeightG);
  const grams = gramsLeftText(item.gramsLeft);

  return (
    <View
      style={[styles.row, !last && styles.divided]}
      accessible
      accessibilityLabel={[item.name, amount, grams, badge?.text].filter(Boolean).join(", ")}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.meta}>
          {item.netWeightG !== null && <Text style={styles.metaText}>{gramsToText(item.netWeightG)} g each</Text>}
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
        <Text style={styles.amtSmall}>{grams}</Text>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius } = theme;
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 56, paddingVertical: space[2] },
    divided: { borderBottomWidth: 1, borderBottomColor: colors.border },
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
