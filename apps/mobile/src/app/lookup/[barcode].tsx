import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { ProductForm } from "@/modules/nutrition/components/ProductForm";
import { useOffLookup } from "@/modules/nutrition/hooks/useOffLookup";
import * as productRepo from "@/modules/nutrition/repositories/productRepo";
import { newProductForm } from "@/modules/nutrition/services/productSchema";

const NOTES = {
  found: "Found on Open Food Facts. It's community data, so check it against the label before saving.",
  not_found: "This barcode isn't in your library or on Open Food Facts. Add it once from the label.",
  offline: "Couldn't reach Open Food Facts. Enter the values from the label.",
} as const;

export default function LookupScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const db = useSQLiteContext();
  const result = useOffLookup(barcode);

  if (!result) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={styles.message}>Looking up on Open Food Facts...</Text>
        <Pressable
          onPress={() =>
            router.replace({ pathname: "/product/[id]", params: { id: "new", barcode, then: "log" } })
          }
          accessibilityRole="button"
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>Enter manually</Text>
        </Pressable>
      </View>
    );
  }

  const found = result.kind === "found";
  const fellBack = result.kind === "offline" || result.kind === "error";
  const draft = result.kind === "found" || result.kind === "not_found" ? result.draft : newProductForm(barcode);

  return (
    <View style={styles.screen}>
      <Text
        style={[styles.note, fellBack && styles.offline]}
        accessibilityLiveRegion="polite"
      >
        {found ? NOTES.found : fellBack ? NOTES.offline : NOTES.not_found}
      </Text>
      <ProductForm
        defaultValues={draft}
        submitLabel="Save and add amount"
        onSubmit={(input) => productRepo.create(db, input, found ? "open_food_facts" : "manual")}
        onSaved={(id) => router.replace({ pathname: "/add/[productId]", params: { productId: id } })}
      />
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4], padding: space[5], backgroundColor: colors.bg },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    note: {
      marginHorizontal: space[4],
      marginTop: space[4],
      padding: space[3],
      borderRadius: radius.sm,
      backgroundColor: colors.estimateSoft,
      color: colors.text,
      fontSize: fontSize.sm,
    },
    offline: { backgroundColor: colors.accentSoft },
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
