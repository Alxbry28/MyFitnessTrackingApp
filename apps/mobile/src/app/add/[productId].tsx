import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { AmountForm } from "@/modules/nutrition/components/AmountForm";
import { useAddEntry } from "@/modules/nutrition/hooks/useAddEntry";
import { gramsToText } from "@/modules/nutrition/services/entrySchema";
import { defaultMeal } from "@/modules/nutrition/services/mealTime";
import { MEAL_TYPES, type MealType } from "@/modules/nutrition/types/foodLog";

function isMealType(value: string | undefined): value is MealType {
  return MEAL_TYPES.some((m) => m === value);
}

export default function AddToMealScreen() {
  const { productId, meal } = useLocalSearchParams<{ productId: string; meal?: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { state, retry, save } = useAddEntry(productId);

  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading product" />
      </View>
    );
  }
  if (state.status === "not_found" || state.status === "error") {
    const notFound = state.status === "not_found";
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          {notFound ? "This product doesn't exist anymore." : "Couldn't load this product."}
        </Text>
        <Pressable onPress={notFound ? () => router.back() : retry} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonLabel}>{notFound ? "Back" : "Retry"}</Text>
        </Pressable>
      </View>
    );
  }

  const { product, defaultGrams } = state;
  return (
    <AmountForm
      name={product.name}
      per100={product}
      defaultValues={{
        mealType: isMealType(meal) ? meal : defaultMeal(new Date()),
        grams: gramsToText(defaultGrams),
      }}
      submitLabel={(label) => `Add to ${label}`}
      onSubmit={(input) => save(product, input)}
      onSaved={() => router.dismissTo("/log")}
    />
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
