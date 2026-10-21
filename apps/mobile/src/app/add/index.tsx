import { router, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { ProductRow } from "@/modules/nutrition/components/ProductRow";
import { useProducts } from "@/modules/nutrition/hooks/useProducts";
import type { Product } from "@/modules/nutrition/types/product";

export default function PickProductScreen() {
  const { meal, day, for: target } = useLocalSearchParams<{ meal?: string; day?: string; for?: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { query, setQuery, products, total, status, retry } = useProducts();

  // meal and day pass through from the Log tab; the add screen validates them.
  // for=pantry comes from the scanner's Search products while adding stock.
  const pick = (product: Product) =>
    target === "pantry"
      ? router.push({ pathname: "/pantry/add/[productId]", params: { productId: product.id } })
      : router.push({
          pathname: "/add/[productId]",
          params: { productId: product.id, ...(meal ? { meal } : {}), ...(day ? { day } : {}) },
        });

  let body: ReactNode;
  if (status === "loading") {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading products" />
      </View>
    );
  } else if (status === "error") {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>{"Couldn't load your products."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (total === 0) {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>Your library is empty. Add a product first.</Text>
        <Pressable
          onPress={() => router.push({ pathname: "/product/[id]", params: { id: "new" } })}
          accessibilityRole="button"
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>Add product</Text>
        </Pressable>
      </View>
    );
  } else if (products.length === 0) {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>{`No products match '${query.trim()}'`}</Text>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={products}
        keyExtractor={(item: Product) => item.id}
        renderItem={({ item }) => <ProductRow product={item} onPress={pick} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    );
  }

  return (
    <View style={styles.screen}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search your products"
        placeholderTextColor={theme.colors.faint}
        accessibilityLabel="Search your products"
        autoCorrect={false}
        autoFocus
        returnKeyType="search"
        style={styles.search}
      />
      {body}
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, gap: space[3], padding: space[4], backgroundColor: colors.bg },
    search: {
      height: tap,
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
      paddingHorizontal: space[3],
      color: colors.text,
      fontSize: fontSize.md,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    listContent: {
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
    },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    button: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    buttonLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  });
}
