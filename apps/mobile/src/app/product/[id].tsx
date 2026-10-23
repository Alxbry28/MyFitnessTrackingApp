import { router, Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { ProductForm } from "@/modules/nutrition/components/ProductForm";
import { useProduct } from "@/modules/nutrition/hooks/useProduct";
import { newProductForm, productToForm } from "@/modules/nutrition/services/productSchema";

export default function ProductScreen() {
  // barcode and then=log come from the scanner: prefill, then continue to logging.
  // then=pantry comes from adding stock: continue to "How many did you buy?".
  // name, meal and day come from Add food's "Create ... product".
  const { id, barcode, then, name, meal, day, kind } = useLocalSearchParams<{
    id: string;
    barcode?: string;
    then?: string;
    name?: string;
    meal?: string;
    day?: string;
    kind?: string;
  }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { isNew, state, retry, save } = useProduct(id);
  const title = isNew ? "New product" : "Edit product";

  let body;
  if (state.status === "loading") {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading product" />
      </View>
    );
  } else if (state.status === "not_found") {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>{"This product doesn't exist anymore."}</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonLabel}>Back to products</Text>
        </Pressable>
      </View>
    );
  } else if (state.status === "error") {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>{"Couldn't load this product."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  } else {
    body = (
      <ProductForm
        defaultValues={state.product ? productToForm(state.product) : newProductForm(barcode ?? null, name ?? "")}
        submitLabel={isNew ? "Save product" : "Save changes"}
        onSubmit={save}
        isPantry={then === "pantry"}
        onSaved={(savedId) =>
          then === "log"
            ? router.replace({
                pathname: "/add/[productId]",
                params: { productId: savedId, ...(meal ? { meal } : {}), ...(day ? { day } : {}) },
              })
            : then === "pantry"
              ? router.replace({
                  pathname: "/pantry/add/[productId]",
                  params: { productId: savedId, fresh: "1", ...(kind ? { kind } : {}) },
                })
              : router.back()
        }
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      {body}
    </>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4], padding: space[5], backgroundColor: colors.bg },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
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
