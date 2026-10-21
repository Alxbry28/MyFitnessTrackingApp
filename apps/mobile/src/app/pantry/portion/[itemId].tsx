import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { AmountForm } from "@/modules/nutrition/components/AmountForm";
import { gramsToText } from "@/modules/nutrition/services/entrySchema";
import { defaultMeal } from "@/modules/nutrition/services/mealTime";
import { MEAL_TYPES, type MealType } from "@/modules/nutrition/types/foodLog";
import { useLogPortion } from "@/modules/pantry/hooks/useLogPortion";
import { portionDefault } from "@/modules/pantry/services/pantryStock";

function isMealType(value: string | undefined): value is MealType {
  return MEAL_TYPES.some((m) => m === value);
}

// "Log a portion" from frame 2: the shared amount form, saved as a log entry plus an "eaten" movement.
export default function LogPortionScreen() {
  // meal, day and from=add come from Add food's "In my pantry"; the item screen sends none.
  const { itemId, meal, day, from } = useLocalSearchParams<{ itemId: string; meal?: string; day?: string; from?: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { state, retry, save } = useLogPortion(itemId, day);

  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading item" />
      </View>
    );
  }
  if (state.status === "not_found" || state.status === "error") {
    const notFound = state.status === "not_found";
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          {notFound ? "This item isn't in your pantry anymore." : "Couldn't load this item."}
        </Text>
        <Pressable
          onPress={notFound ? () => router.dismissTo("/pantry") : retry}
          accessibilityRole="button"
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>{notFound ? "Back to pantry" : "Retry"}</Text>
        </Pressable>
      </View>
    );
  }

  const { item, product } = state;
  return (
    <AmountForm
      name={product.name}
      per100={product}
      defaultValues={{
        mealType: isMealType(meal) ? meal : defaultMeal(new Date()),
        grams: gramsToText(portionDefault(item.gramsLeft, item.netWeightG)),
      }}
      submitLabel={(label) => `Add to ${label}`}
      onSubmit={(input) => save(item, product, input)}
      onSaved={() => (from === "add" ? router.dismissTo("/log") : router.back())}
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
