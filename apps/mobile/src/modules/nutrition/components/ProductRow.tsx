import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import type { Product } from "../types/product";

type Props = { product: Product; onPress: (product: Product) => void };

export function ProductRow({ product, onPress }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const meta = [product.brand ?? "Custom", product.servingSize].filter(Boolean).join(" · ");
  const kcal = Math.round(product.kcalPer100g);

  return (
    <Pressable
      onPress={() => onPress(product)}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${meta}, ${kcal} kcal per 100 grams. Edit`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <View>
        <Text style={styles.kcal}>{kcal}</Text>
        <Text style={styles.unit}>kcal</Text>
      </View>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, tap } = theme;
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      minHeight: tap + space[3],
      paddingVertical: space[2],
      paddingHorizontal: space[4],
      backgroundColor: colors.surface,
    },
    pressed: { backgroundColor: colors.surface2 },
    info: { flex: 1, minWidth: 0 },
    name: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
    meta: { color: colors.muted, fontSize: fontSize.sm },
    kcal: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: "600",
      textAlign: "right",
      fontVariant: ["tabular-nums"],
    },
    unit: { color: colors.muted, fontSize: fontSize.xs, textAlign: "right" },
  });
}
