import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { AmountForm } from "@/modules/nutrition/components/AmountForm";
import { isDrained, loggedPer100 } from "@/modules/nutrition/services/drained";
import { gramsToText } from "@/modules/nutrition/services/entrySchema";
import { defaultMeal } from "@/modules/nutrition/services/mealTime";
import { MEAL_TYPES, type EntryInput, type MealType } from "@/modules/nutrition/types/foodLog";
import type { Product } from "@/modules/nutrition/types/product";
import { useLogPortion, type PortionResult } from "@/modules/pantry/hooks/useLogPortion";
import { netToDrained, openedGrams, portionDefault, scoopDefault, unitSplit } from "@/modules/pantry/services/pantryStock";
import type { PantryStock } from "@/modules/pantry/types/pantry";

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
  const mealType = isMealType(meal) ? meal : defaultMeal(new Date());
  const onSaved = () => (from === "add" ? router.dismissTo("/log") : router.back());
  if (isDrained(product) && product.usualDrainedG !== null && product.netWeightG !== null) {
    return (
      <DrainedPortion
        item={item}
        product={product}
        usualDrainedG={product.usualDrainedG}
        netWeightG={product.netWeightG}
        mealType={mealType}
        onSubmit={(input, wholeUnit) => save(item, product, input, wholeUnit)}
        onSaved={onSaved}
        styles={styles}
      />
    );
  }
  return (
    <AmountForm
      name={product.name}
      per100={loggedPer100(product)}
      defaultValues={{
        mealType,
        grams: gramsToText(
          item.kind === "supplement"
            ? scoopDefault(item.gramsLeft, product.servingGrams)
            : portionDefault(item.gramsLeft, item.netWeightG),
        ),
      }}
      amountLabel={item.kind === "supplement" && item.unit !== "g" ? `Amount (${item.unit})` : undefined}
      submitLabel={(label) => `Add to ${label}`}
      onSubmit={(input) => save(item, product, input, false)}
      onSaved={onSaved}
    />
  );
}

type DrainedProps = {
  item: PantryStock;
  product: Product;
  usualDrainedG: number;
  netWeightG: number;
  mealType: MealType;
  onSubmit: (input: EntryInput, wholeUnit: boolean) => Promise<PortionResult>;
  onSaved: () => void;
  styles: Styles;
};

// Eaten drained: a whole unit takes one unit off stock whatever drained grams were weighed;
// a part converts drained grams to net ones. The opened unit is offered first.
function DrainedPortion({ item, product, usualDrainedG, netWeightG, mealType, onSubmit, onSaved, styles }: DrainedProps) {
  const { sealed } = unitSplit(item.gramsLeft, netWeightG);
  const openNet = openedGrams(item.gramsLeft, netWeightG);
  const [wholeUnit, setWholeUnit] = useState(openNet === 0 && sealed > 0);
  const drainedLeft = netToDrained(item.gramsLeft, netWeightG, usualDrainedG);
  const openDrained = netToDrained(openNet, netWeightG, usualDrainedG);
  const grams = wholeUnit ? usualDrainedG : openNet > 0 ? openDrained : Math.min(usualDrainedG, drainedLeft);
  const note = wholeUnit
    ? "Weigh the drained food if you can. One whole unit comes off your stock."
    : openNet > 0
      ? `The opened unit has about ${Math.round(openDrained)} g drained left.`
      : "This opens a sealed unit.";

  const choice = (whole: boolean, label: string, disabled: boolean) => {
    const on = wholeUnit === whole;
    return (
      <Pressable
        onPress={() => setWholeUnit(whole)}
        disabled={disabled}
        accessibilityRole="radio"
        accessibilityState={{ checked: on, disabled }}
        hitSlop={8}
        style={[styles.chip, on && styles.chipOn, disabled && styles.disabled]}
      >
        <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{label}</Text>
      </Pressable>
    );
  };

  const header = (
    <View style={styles.choice}>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Portion">
        {choice(true, "Whole unit", sealed === 0)}
        {choice(false, "Part of a unit", false)}
      </View>
      <Text style={styles.note}>{note}</Text>
    </View>
  );

  return (
    <AmountForm
      // A new key resets the amount to the chosen option's default.
      key={wholeUnit ? "whole" : "part"}
      name={product.name}
      per100={loggedPer100(product)}
      header={header}
      defaultValues={{ mealType, grams: gramsToText(Math.round(grams * 10) / 10) }}
      submitLabel={(label) => `Add to ${label}`}
      onSubmit={(input) => onSubmit(input, wholeUnit)}
      onSaved={onSaved}
    />
  );
}

type Styles = ReturnType<typeof makeStyles>;

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
    choice: { gap: space[2] },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
    chip: { height: 32, justifyContent: "center", paddingHorizontal: space[3], borderRadius: radius.pill, backgroundColor: colors.surface2 },
    chipOn: { backgroundColor: colors.accentSoft },
    chipLabel: { color: colors.muted, fontSize: fontSize.sm },
    chipLabelOn: { color: colors.accentText, fontWeight: "600" },
    disabled: { opacity: 0.4 },
    note: { color: colors.muted, fontSize: fontSize.xs, lineHeight: 16 },
  });
}
