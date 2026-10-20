import { router } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { ProductRow } from "@/modules/nutrition/components/ProductRow";
import { useProducts } from "@/modules/nutrition/hooks/useProducts";
import type { Product } from "@/modules/nutrition/types/product";

function openProduct(id: string) {
  router.push({ pathname: "/product/[id]", params: { id } });
}

export default function ProductsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { query, setQuery, products, total, status, retry } = useProducts();

  const addButton = (
    <Pressable
      onPress={() => openProduct("new")}
      accessibilityRole="button"
      style={({ pressed }) => [styles.addButton, pressed && styles.addPressed]}
    >
      <Text style={styles.addLabel}>Add product</Text>
    </Pressable>
  );

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
        <Pressable onPress={retry} accessibilityRole="button" style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (total === 0) {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>No products yet</Text>
        {addButton}
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
        renderItem={({ item }) => <ProductRow product={item} onPress={(p) => openProduct(p.id)} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    );
  }

  const showFloatingAdd = status === "ready" && total > 0;

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your products"
          placeholderTextColor={theme.colors.faint}
          accessibilityLabel="Search your products"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.search}
        />
        <Pressable onPress={() => router.push("/scan")} accessibilityRole="button" style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>Scan</Text>
        </Pressable>
      </View>
      <Text style={styles.count}>
        {total} {total === 1 ? "product" : "products"} · values per 100 g
      </Text>
      {body}
      {showFloatingAdd && <View style={styles.fab}>{addButton}</View>}
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, gap: space[3], paddingHorizontal: space[4], paddingTop: space[2], backgroundColor: colors.bg },
    searchRow: { flexDirection: "row", gap: space[2] },
    search: {
      flex: 1,
      height: tap,
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
      paddingHorizontal: space[3],
      color: colors.text,
      fontSize: fontSize.md,
    },
    count: { color: colors.muted, fontSize: fontSize.xs },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    listContent: {
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
      // Leaves room so the floating Add button never covers the last row.
      marginBottom: tap * 2,
    },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    fab: { position: "absolute", right: space[4], bottom: space[4] },
    addButton: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.accent,
    },
    addPressed: { opacity: 0.85 },
    addLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
    secondaryButton: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    secondaryLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  });
}
