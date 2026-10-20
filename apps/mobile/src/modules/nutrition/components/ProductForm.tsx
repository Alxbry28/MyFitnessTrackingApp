import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import type { SaveResult } from "../repositories/productRepo";
import { productSchema, type ProductFormValues } from "../services/productSchema";
import type { ProductInput } from "../types/product";

type Props = {
  defaultValues: ProductFormValues;
  submitLabel: string;
  onSubmit: (input: ProductInput) => Promise<SaveResult>;
  onSaved: () => void;
};

const NUMBER: KeyboardTypeOptions = "decimal-pad";

export function ProductForm({ defaultValues, submitLabel, onSubmit, onSaved }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<ProductFormValues, unknown, ProductInput>({
    defaultValues,
    resolver: zodResolver(productSchema),
    // Moves focus to the first invalid field on submit.
    shouldFocusError: true,
  });

  const submit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      const result = await onSubmit(input);
      if (result.ok) {
        onSaved();
      } else if (result.error === "duplicate_barcode") {
        setError("barcode", { message: "Another product already uses this barcode" }, { shouldFocus: true });
      } else {
        setFormError("This product no longer exists, so it couldn't be saved.");
      }
    } catch {
      // Every typed value stays in the form, so the user can just try again.
      setFormError("Couldn't save the product. Your values are kept, so try again.");
    }
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Field control={control} name="name" label="Name" styles={styles} theme={theme} />
      <Field control={control} name="brand" label="Brand (optional)" styles={styles} theme={theme} />
      <Field
        control={control}
        name="barcode"
        label="Barcode (optional)"
        keyboardType="number-pad"
        styles={styles}
        theme={theme}
      />
      <View style={styles.row}>
        <Field
          control={control}
          name="servingSize"
          label="Serving (optional)"
          placeholder="e.g. 1 can"
          styles={styles}
          theme={theme}
        />
        <Field
          control={control}
          name="servingGrams"
          label="Serving grams"
          keyboardType={NUMBER}
          styles={styles}
          theme={theme}
        />
      </View>
      <Field
        control={control}
        name="netWeightG"
        label="Net weight g (optional)"
        keyboardType={NUMBER}
        styles={styles}
        theme={theme}
      />

      <Text style={styles.basis}>Nutrition per 100 g</Text>
      <Field
        control={control}
        name="kcalPer100g"
        label="Energy (kcal)"
        keyboardType={NUMBER}
        styles={styles}
        theme={theme}
      />
      <View style={styles.row}>
        <Field control={control} name="proteinPer100g" label="Protein g" keyboardType={NUMBER} styles={styles} theme={theme} />
        <Field control={control} name="carbsPer100g" label="Carbs g" keyboardType={NUMBER} styles={styles} theme={theme} />
        <Field control={control} name="fatPer100g" label="Fat g" keyboardType={NUMBER} styles={styles} theme={theme} />
      </View>

      {formError && (
        <Text style={styles.formError} accessibilityLiveRegion="polite">
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
        <Text style={styles.saveLabel}>{isSubmitting ? "Saving..." : submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}

type FieldProps = {
  control: Control<ProductFormValues, unknown, ProductInput>;
  name: keyof ProductFormValues;
  label: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
};

function Field({ control, name, label, placeholder, keyboardType, styles, theme }: FieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            ref={field.ref}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.faint}
            keyboardType={keyboardType}
            accessibilityLabel={label}
            style={[styles.input, fieldState.error && styles.inputError]}
          />
          {fieldState.error?.message && <Text style={styles.error}>{fieldState.error.message}</Text>}
        </View>
      )}
    />
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { gap: space[3], padding: space[4] },
    row: { flexDirection: "row", gap: space[2] },
    field: { flex: 1, gap: space[1] },
    label: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "600" },
    input: {
      height: tap,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.surface2,
      backgroundColor: colors.surface2,
      paddingHorizontal: space[3],
      color: colors.text,
      fontSize: fontSize.md,
      fontVariant: ["tabular-nums"],
    },
    inputError: { borderColor: colors.over },
    error: { color: colors.over, fontSize: fontSize.sm },
    basis: {
      marginTop: space[2],
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    formError: { color: colors.over, fontSize: fontSize.sm },
    save: {
      marginTop: space[2],
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
