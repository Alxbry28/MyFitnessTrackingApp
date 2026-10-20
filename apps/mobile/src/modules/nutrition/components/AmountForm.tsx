import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { entrySchema, type EntryFormValues } from "../services/entrySchema";
import { MEAL_LABELS } from "../services/mealTime";
import { forGrams, formatKcal, formatMacro } from "../services/nutritionCalc";
import { MEAL_TYPES, type EntryInput, type Per100g } from "../types/foodLog";

type SubmitResult = { ok: true } | { ok: false; message: string };

type Props = {
  name: string;
  per100: Per100g;
  defaultValues: EntryFormValues;
  submitLabel: (mealLabel: string) => string;
  onSubmit: (input: EntryInput) => Promise<SubmitResult>;
  onSaved: () => void;
};

function previewGrams(text: string): number | null {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(value) && value > 0 ? value : null;
}

// Shared by the add and edit screens: meal choice, grams and a live preview.
export function AmountForm({ name, per100, defaultValues, submitLabel, onSubmit, onSaved }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<EntryFormValues, unknown, EntryInput>({
    defaultValues,
    resolver: zodResolver(entrySchema),
    shouldFocusError: true,
  });
  const mealType = useWatch({ control, name: "mealType" });
  const gramsText = useWatch({ control, name: "grams" });
  const grams = previewGrams(gramsText);
  const preview = grams === null ? null : forGrams(per100, grams);

  const submit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      const result = await onSubmit(input);
      if (result.ok) onSaved();
      else setFormError(result.message);
    } catch {
      setFormError("Couldn't save. Your values are kept, so try again.");
    }
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{formatKcal(per100.kcalPer100g)} kcal per 100 g</Text>
      </View>

      <Controller
        control={control}
        name="mealType"
        render={({ field }) => (
          <View style={styles.meals} accessibilityRole="radiogroup" accessibilityLabel="Meal">
            {MEAL_TYPES.map((meal) => {
              const selected = field.value === meal;
              return (
                <Pressable
                  key={meal}
                  onPress={() => field.onChange(meal)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={[styles.meal, selected && styles.mealSelected]}
                >
                  <Text style={[styles.mealLabel, selected && styles.mealLabelSelected]}>{MEAL_LABELS[meal]}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      />

      <Controller
        control={control}
        name="grams"
        render={({ field, fieldState }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Amount (g)</Text>
            <TextInput
              ref={field.ref}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              keyboardType="decimal-pad"
              selectTextOnFocus
              accessibilityLabel="Amount in grams"
              style={[styles.input, fieldState.error && styles.inputError]}
            />
            {fieldState.error?.message && <Text style={styles.error}>{fieldState.error.message}</Text>}
          </View>
        )}
      />

      <View style={styles.preview} accessibilityLiveRegion="polite">
        <Text style={styles.previewKcal}>{preview ? `${formatKcal(preview.kcal)} kcal` : "- kcal"}</Text>
        <Text style={styles.macros}>
          P {formatMacro(preview?.proteinG ?? null)} · C {formatMacro(preview?.carbsG ?? null)} · F{" "}
          {formatMacro(preview?.fatG ?? null)}
        </Text>
      </View>

      {formError && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {formError}
        </Text>
      )}
      <Pressable
        onPress={() => void submit()}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting }}
        style={({ pressed }) => [styles.save, (pressed || isSubmitting) && styles.savePressed]}
      >
        <Text style={styles.saveLabel}>{isSubmitting ? "Saving..." : submitLabel(MEAL_LABELS[mealType])}</Text>
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { gap: space[4], padding: space[4] },
    name: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
    meta: { color: colors.muted, fontSize: fontSize.sm },
    meals: { flexDirection: "row", gap: space[2] },
    meal: {
      flex: 1,
      minHeight: tap,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
    },
    mealSelected: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent },
    mealLabel: { color: colors.muted, fontSize: fontSize.sm, fontWeight: "600" },
    mealLabelSelected: { color: colors.accentText },
    field: { gap: space[1] },
    label: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "600" },
    input: {
      height: tap,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.surface2,
      backgroundColor: colors.surface2,
      paddingHorizontal: space[3],
      color: colors.text,
      fontSize: fontSize.lg,
      fontVariant: ["tabular-nums"],
    },
    inputError: { borderColor: colors.over },
    error: { color: colors.over, fontSize: fontSize.sm },
    preview: { padding: space[4], borderRadius: radius.md, backgroundColor: colors.surface, gap: space[1] },
    previewKcal: { color: colors.text, fontSize: fontSize.xl, fontWeight: "700", fontVariant: ["tabular-nums"] },
    macros: { color: colors.muted, fontSize: fontSize.sm, fontVariant: ["tabular-nums"] },
    save: {
      minHeight: tap,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: colors.accent,
    },
    savePressed: { opacity: 0.85 },
    saveLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
  });
}
