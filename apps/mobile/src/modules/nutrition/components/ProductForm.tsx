import { zodResolver } from "@hookform/resolvers/zod";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import type { SaveResult } from "../repositories/productRepo";
import { DRAINED_REFERENCES, type DrainedReference } from "../services/drained";
import { productSchema, type ProductFormValues } from "../services/productSchema";
import type { ProductInput } from "../types/product";
import { BarcodeScanModal } from "./BarcodeScanModal";

type Props = {
  defaultValues: ProductFormValues;
  submitLabel: string;
  onSubmit: (input: ProductInput) => Promise<SaveResult>;
  onSaved: (id: string) => void;
};

const NUMBER: KeyboardTypeOptions = "decimal-pad";

export function ProductForm({ defaultValues, submitLabel, onSubmit, onSaved }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [formError, setFormError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { isSubmitting },
  } = useForm<ProductFormValues, unknown, ProductInput>({
    defaultValues,
    resolver: zodResolver(productSchema),
    // Moves focus to the first invalid field on submit.
    shouldFocusError: true,
  });

  const eatenDrained = useWatch({ control, name: "eatenDrained" });

  const applyReference = (ref: DrainedReference) => {
    const text = (value: number | null) => (value === null ? "" : String(value));
    const options = { shouldDirty: true, shouldValidate: true };
    setValue("drainedKcalPer100g", text(ref.values.kcalPer100g), options);
    setValue("drainedProteinPer100g", text(ref.values.proteinPer100g), options);
    setValue("drainedCarbsPer100g", text(ref.values.carbsPer100g), options);
    setValue("drainedFatPer100g", text(ref.values.fatPer100g), options);
  };

  const submit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      const result = await onSubmit(input);
      if (result.ok) {
        onSaved(result.id);
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
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Field control={control} name="name" label="Name" styles={styles} theme={theme} />
        <Field control={control} name="brand" label="Brand (optional)" styles={styles} theme={theme} />
        <View style={styles.barcodeRow}>
          <View style={styles.barcodeInputWrap}>
            <Field
              control={control}
              name="barcode"
              label="Barcode (optional)"
              keyboardType="default"
              styles={styles}
              theme={theme}
            />
          </View>
          <Pressable
            onPress={() => setScannerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Scan barcode with camera"
            style={({ pressed }) => [styles.scanBtn, pressed && styles.scanBtnPressed]}
          >
            <SymbolView
              name={{ android: "barcode_scanner", web: "barcode_scanner" }}
              tintColor={theme.colors.accentText}
              size={20}
            />
            <Text style={styles.scanBtnText}>Scan</Text>
          </Pressable>
        </View>
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

      <Text style={styles.basis}>Eaten drained</Text>
      <Controller
        control={control}
        name="eatenDrained"
        render={({ field }) => (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>I eat this drained</Text>
            <Switch
              value={field.value}
              onValueChange={field.onChange}
              accessibilityLabel="I eat this drained"
              trackColor={{ false: theme.colors.surface2, true: theme.colors.accent }}
              thumbColor={theme.colors.surface}
            />
          </View>
        )}
      />
      {eatenDrained && (
        <>
          <Text style={styles.note}>
            Logging counts the drained values below. The label values above stay for the record and the can&apos;s
            net weight.
          </Text>
          <Field
            control={control}
            name="usualDrainedG"
            label="Usual drained weight g"
            placeholder="Weigh the drained food once"
            keyboardType={NUMBER}
            styles={styles}
            theme={theme}
          />
          <Text style={styles.basis}>Drained per 100 g</Text>
          <View style={styles.chips}>
            {DRAINED_REFERENCES.map((ref) => (
              <Pressable
                key={ref.label}
                onPress={() => applyReference(ref)}
                accessibilityRole="button"
                accessibilityLabel={`Use ${ref.label} values`}
                hitSlop={8}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              >
                <Text style={styles.chipLabel}>{ref.label}</Text>
              </Pressable>
            ))}
          </View>
          <Field
            control={control}
            name="drainedKcalPer100g"
            label="Energy (kcal)"
            keyboardType={NUMBER}
            styles={styles}
            theme={theme}
          />
          <View style={styles.row}>
            <Field control={control} name="drainedProteinPer100g" label="Protein g" keyboardType={NUMBER} styles={styles} theme={theme} />
            <Field control={control} name="drainedCarbsPer100g" label="Carbs g" keyboardType={NUMBER} styles={styles} theme={theme} />
            <Field control={control} name="drainedFatPer100g" label="Fat g" keyboardType={NUMBER} styles={styles} theme={theme} />
          </View>
          <Text style={styles.note}>Reference values are generic estimates. Check them against your can.</Text>
        </>
      )}

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
    <BarcodeScanModal
      visible={scannerOpen}
      onClose={() => setScannerOpen(false)}
      onScanned={(code) => setValue("barcode", code, { shouldDirty: true, shouldValidate: true })}
    />
  </>
  );
}

type FieldProps = {
  control: Control<ProductFormValues, unknown, ProductInput>;
  name: Exclude<keyof ProductFormValues, "eatenDrained">;
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
    barcodeRow: { flexDirection: "row", alignItems: "flex-end", gap: space[2] },
    barcodeInputWrap: { flex: 1 },
    scanBtn: {
      height: tap,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space[1],
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    scanBtnPressed: { backgroundColor: colors.accentSoft },
    scanBtnText: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: "600" },
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
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: tap },
    switchLabel: { color: colors.text, fontSize: fontSize.md },
    note: { color: colors.muted, fontSize: fontSize.xs, lineHeight: 16 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
    chip: { height: 32, justifyContent: "center", paddingHorizontal: space[3], borderRadius: radius.pill, backgroundColor: colors.surface2 },
    chipPressed: { backgroundColor: colors.accentSoft },
    chipLabel: { color: colors.muted, fontSize: fontSize.sm },
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
