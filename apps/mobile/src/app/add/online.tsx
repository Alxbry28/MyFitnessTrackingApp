import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { searchOffProducts, type OffSearch } from "@/lib/openFoodFacts";
import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { FoodRow } from "@/modules/nutrition/components/FoodRow";
import { ProductForm } from "@/modules/nutrition/components/ProductForm";
import * as productRepo from "@/modules/nutrition/repositories/productRepo";
import type { OffSearchItem } from "@/modules/nutrition/services/offProduct";

const OFF_NOTE = "From Open Food Facts. It's community data, so check it against the label before saving.";

// Add food's "Search Open Food Facts": pick a result, check it in the product form, then
// continue to logging (or to "How many did you buy?" when adding stock).
export default function SearchOnlineScreen() {
  const { q = "", meal, day, for: target } = useLocalSearchParams<{ q?: string; meal?: string; day?: string; for?: string }>();
  const pantryMode = target === "pantry";
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [result, setResult] = useState<OffSearch | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [chosen, setChosen] = useState<OffSearchItem | null>(null);

  useEffect(() => {
    let active = true;
    searchOffProducts(q)
      .then((r) => {
        if (active) setResult(r);
      })
      .catch(() => {
        if (active) setResult({ kind: "error" });
      });
    return () => {
      active = false;
    };
  }, [q, attempt]);

  const continueWith = (productId: string) =>
    pantryMode
      ? router.replace({ pathname: "/pantry/add/[productId]", params: { productId, fresh: "1" } })
      : router.replace({
          pathname: "/add/[productId]",
          params: { productId, ...(meal ? { meal } : {}), ...(day ? { day } : {}) },
        });

  if (chosen) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.note}>{chosen.found ? OFF_NOTE : "Open Food Facts lists no calories for this one. Enter them from the label."}</Text>
        <ProductForm
          defaultValues={chosen.draft}
          submitLabel="Save product"
          onSubmit={(input) => productRepo.create(db, input, chosen.found ? "open_food_facts" : "manual")}
          onSaved={continueWith}
        />
        <Pressable onPress={() => setChosen(null)} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonLabel}>Back to results</Text>
        </Pressable>
      </ScrollView>
    );
  }

  let body;
  if (result === null) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={styles.message} accessibilityLiveRegion="polite">
          Searching Open Food Facts...
        </Text>
      </View>
    );
  } else if (result.kind === "offline" || result.kind === "error") {
    body = (
      <View style={styles.center}>
        <Text style={styles.message} accessibilityLiveRegion="polite">
          {result.kind === "offline"
            ? "You're offline. Connect to search Open Food Facts, or create the product from the label."
            : "Couldn't reach Open Food Facts. Try again, or create the product from the label."}
        </Text>
        <Pressable onPress={() => {
            setResult(null);
            setAttempt((n) => n + 1);
          }} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (result.items.length === 0) {
    body = (
      <View style={styles.center}>
        <Text style={styles.message} accessibilityLiveRegion="polite">
          {`Nothing on Open Food Facts for '${q.trim()}'.`}
        </Text>
      </View>
    );
  } else {
    body = (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel} accessibilityRole="header">
          {`Open Food Facts · ${result.items.length} ${result.items.length === 1 ? "result" : "results"}`}
        </Text>
        <View style={styles.card}>
          {result.items.map((item, index) => (
            <FoodRow
              key={index}
              name={item.draft.name}
              meta={[item.draft.brand, item.found ? `${item.draft.kcalPer100g} kcal / 100 g` : "No kcal listed"]
                .filter(Boolean)
                .join(" · ")}
              query={q}
              first={index === 0}
              onPress={() => setChosen(item)}
            />
          ))}
        </View>
      </ScrollView>
    );
  }

  return <View style={styles.screen}>{body}</View>;
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: space[4], gap: space[3] },
    formContent: { padding: space[4], gap: space[3] },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4], padding: space[5] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    note: { color: colors.muted, fontSize: fontSize.sm },
    sectionLabel: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.7 },
    card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: "hidden" },
    button: { minHeight: tap, alignItems: "center", justifyContent: "center", paddingHorizontal: space[5], borderRadius: radius.md, backgroundColor: colors.surface2 },
    buttonLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  });
}
