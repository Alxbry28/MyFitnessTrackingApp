import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { useQuickAdd } from "../hooks/useQuickAdd";
import type { Product } from "../types/product";

function addProduct(product: Product) {
  router.push({ pathname: "/add/[productId]", params: { productId: product.id } });
}

// One-tap chips: the add screen already picks the meal by time and prefills the last grams.
export function QuickAdd() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { state, retry } = useQuickAdd();

  let body;
  if (state.status === "loading") {
    body = <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading quick add" />;
  } else if (state.status === "error") {
    body = (
      <View style={styles.errorRow}>
        <Text style={styles.message}>{"Couldn't load quick add."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.chip}>
          <Text style={styles.chipLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (state.recent.length === 0 && state.favorites.length === 0) {
    body = <Text style={styles.message}>Log a food or star a favorite to see it here.</Text>;
  } else {
    body = (
      <>
        <ChipGroup title="Recent" products={state.recent} styles={styles} />
        <ChipGroup title="Favorites" products={state.favorites} styles={styles} />
      </>
    );
  }

  return (
    <View style={styles.card}>
      {body}
      <Pressable onPress={() => router.push("/add")} accessibilityRole="button" style={styles.search}>
        <Text style={styles.searchLabel}>Search library</Text>
      </Pressable>
    </View>
  );
}

type ChipGroupProps = { title: string; products: Product[]; styles: ReturnType<typeof makeStyles> };

function ChipGroup({ title, products, styles }: ChipGroupProps) {
  if (products.length === 0) return null;
  return (
    <View style={styles.group}>
      <Text style={styles.overline} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.chips}>
        {products.map((product) => (
          <Pressable
            key={product.id}
            onPress={() => addProduct(product)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name}`}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
          >
            <Text style={styles.chipLabel} numberOfLines={1}>
              {product.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    card: { padding: space[4], gap: space[3], borderRadius: radius.md, backgroundColor: colors.surface },
    group: { gap: space[2] },
    overline: {
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
    chip: {
      minHeight: tap,
      maxWidth: "100%",
      justifyContent: "center",
      paddingHorizontal: space[4],
      borderRadius: radius.pill,
      backgroundColor: colors.surface2,
    },
    chipPressed: { backgroundColor: colors.accentSoft },
    chipLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
    message: { color: colors.muted, fontSize: fontSize.md },
    errorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[3] },
    search: { minHeight: tap, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
    searchLabel: { color: colors.accentText, fontSize: fontSize.md, fontWeight: "600" },
  });
}
