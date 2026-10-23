import { zodResolver } from "@hookform/resolvers/zod";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";

import { fetchOffProduct } from "@/lib/openFoodFacts";
import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import * as pantryRepo from "@/modules/pantry/repositories/pantryRepo";
import * as productRepo from "../repositories/productRepo";
import type { SaveResult } from "../repositories/productRepo";
import { getAiConfig } from "../repositories/settingsRepo";
import { parseGroceriesWithAi, type ParsedGroceryItem } from "../services/aiGroceryParser";
import { DRAINED_REFERENCES, type DrainedReference } from "../services/drained";
import { productSchema, type ProductFormValues } from "../services/productSchema";
import type { ProductInput } from "../types/product";
import { BarcodeScanModal } from "./BarcodeScanModal";

type Props = {
  defaultValues: ProductFormValues;
  submitLabel: string;
  onSubmit: (input: ProductInput) => Promise<SaveResult>;
  onSaved: (id: string) => void;
  isPantry?: boolean;
};

const NUMBER: KeyboardTypeOptions = "decimal-pad";

export function ProductForm({ defaultValues, submitLabel, onSubmit, onSaved, isPantry }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [formError, setFormError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupNote, setLookupNote] = useState<string | null>(null);

  // AI Quick Fill state
  const db = useSQLiteContext();
  const [aiInput, setAiInput] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessNote, setAiSuccessNote] = useState<string | null>(null);
  const [aiParsedItems, setAiParsedItems] = useState<ParsedGroceryItem[]>([]);
  const [savingAll, setSavingAll] = useState(false);
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

  const handleBarcodeLookup = async (rawCode: string) => {
    const code = rawCode.trim();
    const options = { shouldDirty: true, shouldValidate: true };
    setValue("barcode", code, options);
    if (!code) return;

    setLookingUp(true);
    setLookupNote(null);
    setFormError(null);

    try {
      const off = await fetchOffProduct(code);
      if (
        off.kind === "found" ||
        (off.kind === "not_found" &&
          Boolean(
            off.draft.name ||
              off.draft.brand ||
              off.draft.netWeightG ||
              off.draft.servingGrams ||
              off.draft.servingSize,
          ))
      ) {
        if (off.draft.name) setValue("name", off.draft.name, options);
        if (off.draft.brand) setValue("brand", off.draft.brand, options);
        if (off.draft.servingSize) setValue("servingSize", off.draft.servingSize, options);
        if (off.draft.servingGrams) setValue("servingGrams", off.draft.servingGrams, options);
        if (off.draft.netWeightG) setValue("netWeightG", off.draft.netWeightG, options);
        if (off.kind === "found") {
          if (off.draft.kcalPer100g !== "") setValue("kcalPer100g", off.draft.kcalPer100g, options);
          if (off.draft.proteinPer100g !== "") setValue("proteinPer100g", off.draft.proteinPer100g, options);
          if (off.draft.carbsPer100g !== "") setValue("carbsPer100g", off.draft.carbsPer100g, options);
          if (off.draft.fatPer100g !== "") setValue("fatPer100g", off.draft.fatPer100g, options);
        }
        setLookupNote(
          "Found on Open Food Facts. Check the values against the label before saving.",
        );
      } else if (off.kind === "not_found") {
        setLookupNote(
          "This barcode isn't on Open Food Facts yet. Enter the values from the label.",
        );
      } else {
        setLookupNote("Couldn't reach Open Food Facts. Enter the values from the label.");
      }
    } catch {
      setLookupNote("Couldn't look up this barcode. Enter the values manually.");
    } finally {
      setLookingUp(false);
    }
  };

  const applyParsedGroceryToForm = (item: ParsedGroceryItem) => {
    const options = { shouldDirty: true, shouldValidate: true };
    setValue("name", item.name, options);
    setValue("brand", item.brand ?? "", options);
    setValue("netWeightG", item.netWeightG ? String(item.netWeightG) : "", options);
    setValue("servingSize", item.servingSize ?? "", options);
    setValue("servingGrams", item.servingGrams ? String(item.servingGrams) : "", options);
    setValue("kcalPer100g", String(item.kcalPer100g), options);
    setValue(
      "proteinPer100g",
      item.proteinPer100g !== null && item.proteinPer100g !== undefined
        ? String(item.proteinPer100g)
        : "",
      options,
    );
    setValue(
      "carbsPer100g",
      item.carbsPer100g !== null && item.carbsPer100g !== undefined
        ? String(item.carbsPer100g)
        : "",
      options,
    );
    setValue(
      "fatPer100g",
      item.fatPer100g !== null && item.fatPer100g !== undefined ? String(item.fatPer100g) : "",
      options,
    );

    if (item.eatenDrained) {
      setValue("eatenDrained", true, options);
      if (item.usualDrainedG) setValue("usualDrainedG", String(item.usualDrainedG), options);
      if (item.drainedKcalPer100g !== null && item.drainedKcalPer100g !== undefined) {
        setValue("drainedKcalPer100g", String(item.drainedKcalPer100g), options);
      }
      if (item.drainedProteinPer100g !== null && item.drainedProteinPer100g !== undefined) {
        setValue("drainedProteinPer100g", String(item.drainedProteinPer100g), options);
      }
      if (item.drainedCarbsPer100g !== null && item.drainedCarbsPer100g !== undefined) {
        setValue("drainedCarbsPer100g", String(item.drainedCarbsPer100g), options);
      }
      if (item.drainedFatPer100g !== null && item.drainedFatPer100g !== undefined) {
        setValue("drainedFatPer100g", String(item.drainedFatPer100g), options);
      }
    } else {
      setValue("eatenDrained", false, options);
      setValue("usualDrainedG", "", options);
      setValue("drainedKcalPer100g", "", options);
      setValue("drainedProteinPer100g", "", options);
      setValue("drainedCarbsPer100g", "", options);
      setValue("drainedFatPer100g", "", options);
    }

    const brandPrefix = item.brand ? `${item.brand} ` : "";
    setAiSuccessNote(
      `✨ Filled: ${brandPrefix}${item.name} (${item.kcalPer100g} kcal/100g). Review below before saving.`,
    );
    setAiError(null);
  };

  const handleParseAi = async () => {
    const trimmed = aiInput.trim();
    if (!trimmed) {
      setAiError("Please type or paste grocery text first.");
      return;
    }
    setAiParsing(true);
    setAiError(null);
    setAiSuccessNote(null);
    try {
      const config = await getAiConfig(db);
      if (!config.apiKey) {
        setAiError("No AI API key found. Please add your API key in Settings.");
        setAiParsing(false);
        return;
      }
      const results = await parseGroceriesWithAi({
        text: trimmed,
        apiKey: config.apiKey,
        provider: config.provider,
        model: config.model,
        baseUrl: config.baseUrl,
      });

      if (results.length === 1) {
        applyParsedGroceryToForm(results[0]);
        setAiParsedItems([]);
      } else {
        setAiParsedItems(results);
        setAiSuccessNote(
          `✨ Found ${results.length} items. Tap one to fill the form, or save all below.`,
        );
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Couldn't parse with AI.");
    } finally {
      setAiParsing(false);
    }
  };

  const handleSaveAllParsed = async () => {
    if (aiParsedItems.length === 0) return;
    setSavingAll(true);
    setAiError(null);
    try {
      for (const item of aiParsedItems) {
        const productInput: ProductInput = {
          name: item.name,
          brand: item.brand,
          barcode: null,
          servingSize: item.servingSize,
          servingGrams: item.servingGrams,
          kcalPer100g: item.kcalPer100g,
          proteinPer100g: item.proteinPer100g,
          carbsPer100g: item.carbsPer100g,
          fatPer100g: item.fatPer100g,
          netWeightG: item.netWeightG,
          eatenDrained: item.eatenDrained ?? false,
          usualDrainedG: item.usualDrainedG ?? null,
          drainedKcalPer100g: item.drainedKcalPer100g ?? null,
          drainedProteinPer100g: item.drainedProteinPer100g ?? null,
          drainedCarbsPer100g: item.drainedCarbsPer100g ?? null,
          drainedFatPer100g: item.drainedFatPer100g ?? null,
        };

        const res = await productRepo.create(db, productInput, "ai_estimate");
        if (res.ok && isPantry) {
          const netWeight = item.netWeightG ?? item.servingGrams ?? 100;
          await pantryRepo.addStock(db, {
            productId: res.id,
            kind: "packaged",
            units: 1,
            netWeightG: netWeight,
            location: "cupboard",
            expiresAt: null,
            unit: "g",
          });
        }
      }
      if (isPantry) {
        router.dismissTo("/pantry");
      } else {
        router.back();
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Couldn't save all grocery items.");
      setSavingAll(false);
    }
  };

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
        {/* AI Quick Fill Card */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiTitleRow}>
              <SymbolView
                name={{ android: "auto_awesome", web: "auto_awesome" }}
                tintColor={theme.colors.accent}
                size={18}
              />
              <Text style={styles.aiTitle}>AI Quick Fill</Text>
            </View>
            <Text style={styles.aiBadge}>AI Assistant</Text>
          </View>
          <Text style={styles.aiSub}>
            Type or paste grocery items, packaging, or a shopping list to autofill.
          </Text>

          <TextInput
            value={aiInput}
            onChangeText={(t) => {
              setAiInput(t);
              if (aiError) setAiError(null);
            }}
            placeholder={"e.g. 500g Kirkland rolled oats\n1L Almond Milk by Silk\n400g Canned Black Beans by Heinz"}
            placeholderTextColor={theme.colors.faint}
            multiline
            numberOfLines={2}
            style={styles.aiInput}
          />

          <View style={styles.aiActionsRow}>
            <Pressable
              onPress={handleParseAi}
              disabled={aiParsing || !aiInput.trim()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.aiParseBtn,
                (!aiInput.trim() || aiParsing) && styles.aiParseBtnDisabled,
                pressed && styles.aiParseBtnPressed,
              ]}
            >
              {aiParsing ? (
                <ActivityIndicator size="small" color={theme.colors.accentInk} />
              ) : (
                <>
                  <SymbolView
                    name={{ android: "auto_awesome", web: "auto_awesome" }}
                    tintColor={theme.colors.accentInk}
                    size={16}
                  />
                  <Text style={styles.aiParseBtnText}>Parse with AI</Text>
                </>
              )}
            </Pressable>

            {aiInput.trim().length > 0 && !aiParsing && (
              <Pressable
                onPress={() => {
                  setAiInput("");
                  setAiParsedItems([]);
                  setAiSuccessNote(null);
                  setAiError(null);
                }}
                accessibilityRole="button"
                style={styles.aiClearBtn}
              >
                <Text style={styles.aiClearBtnText}>Clear</Text>
              </Pressable>
            )}
          </View>

          {aiError && (
            <View style={styles.aiErrorRow}>
              <Text style={styles.aiErrorText}>{aiError}</Text>
              {aiError.includes("Settings") && (
                <Pressable onPress={() => router.push("/settings")}>
                  <Text style={styles.aiSettingsLink}>Go to Settings →</Text>
                </Pressable>
              )}
            </View>
          )}

          {aiSuccessNote && (
            <Text style={styles.aiSuccessText} accessibilityLiveRegion="polite">
              {aiSuccessNote}
            </Text>
          )}

          {/* Multi-item preview */}
          {aiParsedItems.length > 0 && (
            <View style={styles.multiPreviewBox}>
              <Text style={styles.multiPreviewTitle}>
                Parsed Items ({aiParsedItems.length}):
              </Text>
              {aiParsedItems.map((item, idx) => {
                const brandStr = item.brand ? `${item.brand} • ` : "";
                const macroStr = `${item.kcalPer100g} kcal/100g${item.proteinPer100g ? ` • ${item.proteinPer100g}g P` : ""}${item.netWeightG ? ` • ${item.netWeightG}g` : ""}`;
                return (
                  <View key={`${item.name}-${idx}`} style={styles.multiPreviewCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.multiItemName}>
                        {brandStr}
                        {item.name}
                      </Text>
                      <Text style={styles.multiItemMeta}>{macroStr}</Text>
                      {item.notes ? (
                        <Text style={styles.multiItemNotes}>{item.notes}</Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => applyParsedGroceryToForm(item)}
                      style={styles.multiItemFillBtn}
                      accessibilityRole="button"
                    >
                      <Text style={styles.multiItemFillText}>Use in form</Text>
                    </Pressable>
                  </View>
                );
              })}

              <Pressable
                onPress={handleSaveAllParsed}
                disabled={savingAll}
                style={({ pressed }) => [
                  styles.saveAllBtn,
                  savingAll && styles.saveAllBtnDisabled,
                  pressed && styles.saveAllBtnPressed,
                ]}
                accessibilityRole="button"
              >
                {savingAll ? (
                  <ActivityIndicator size="small" color={theme.colors.accentInk} />
                ) : (
                  <>
                    <SymbolView
                      name={{ android: "check", web: "check" }}
                      tintColor={theme.colors.accentInk}
                      size={18}
                    />
                    <Text style={styles.saveAllBtnText}>
                      {isPantry
                        ? `Save All (${aiParsedItems.length}) to Pantry`
                        : `Save All (${aiParsedItems.length}) to Food Library`}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>

        <Field control={control} name="name" label="Name" styles={styles} theme={theme} />
        <Field control={control} name="brand" label="Brand (optional)" styles={styles} theme={theme} />
        <View>
          <View style={styles.barcodeRow}>
            <View style={styles.barcodeInputWrap}>
              <Field
                control={control}
                name="barcode"
                label="Barcode (optional)"
                keyboardType="default"
                onSubmitEditing={(val) => void handleBarcodeLookup(val)}
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
          {lookingUp && (
            <View style={styles.lookupRow}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.lookupText}>Looking up barcode on Open Food Facts...</Text>
            </View>
          )}
          {!lookingUp && lookupNote && (
            <Text style={styles.lookupNote} accessibilityLiveRegion="polite">
              {lookupNote}
            </Text>
          )}
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
        onScanned={(code) => void handleBarcodeLookup(code)}
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
  onSubmitEditing?: (value: string) => void;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
};

function Field({ control, name, label, placeholder, keyboardType, onSubmitEditing, styles, theme }: FieldProps) {
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
            onSubmitEditing={onSubmitEditing ? () => onSubmitEditing(field.value) : undefined}
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
    lookupRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
      marginTop: space[1],
    },
    lookupText: {
      color: colors.muted,
      fontSize: fontSize.xs,
    },
    lookupNote: {
      color: colors.accentText,
      fontSize: fontSize.xs,
      marginTop: space[1],
    },
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
    aiCard: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: space[4],
      gap: space[2],
      marginBottom: space[1],
    },
    aiHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    aiTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
    },
    aiTitle: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: "700",
    },
    aiBadge: {
      color: colors.accentText,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: space[2],
      paddingVertical: 2,
      borderRadius: radius.pill,
      fontSize: fontSize.xs,
      fontWeight: "600",
    },
    aiSub: {
      color: colors.muted,
      fontSize: fontSize.xs,
      lineHeight: 18,
    },
    aiInput: {
      minHeight: 56,
      maxHeight: 120,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      color: colors.text,
      fontSize: fontSize.sm,
      textAlignVertical: "top",
    },
    aiActionsRow: {
      flexDirection: "row",
      gap: space[2],
      alignItems: "center",
      marginTop: space[1],
    },
    aiParseBtn: {
      height: 38,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space[2],
      paddingHorizontal: space[4],
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    aiParseBtnDisabled: {
      opacity: 0.5,
    },
    aiParseBtnPressed: {
      opacity: 0.85,
    },
    aiParseBtnText: {
      color: colors.accentInk,
      fontSize: fontSize.sm,
      fontWeight: "700",
    },
    aiClearBtn: {
      height: 38,
      paddingHorizontal: space[3],
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    aiClearBtnText: {
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "500",
    },
    aiErrorRow: {
      marginTop: space[1],
      gap: 4,
    },
    aiErrorText: {
      color: colors.over,
      fontSize: fontSize.xs,
    },
    aiSettingsLink: {
      color: colors.accentText,
      fontSize: fontSize.xs,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
    aiSuccessText: {
      color: colors.accentText,
      fontSize: fontSize.xs,
      fontWeight: "600",
      marginTop: space[1],
    },
    multiPreviewBox: {
      marginTop: space[2],
      paddingTop: space[3],
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: space[2],
    },
    multiPreviewTitle: {
      color: colors.text,
      fontSize: fontSize.sm,
      fontWeight: "700",
    },
    multiPreviewCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface2,
      padding: space[3],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      gap: space[2],
    },
    multiItemName: {
      color: colors.text,
      fontSize: fontSize.sm,
      fontWeight: "600",
    },
    multiItemMeta: {
      color: colors.muted,
      fontSize: fontSize.xs,
      marginTop: 2,
    },
    multiItemNotes: {
      color: colors.accentText,
      fontSize: fontSize.xs,
      marginTop: 2,
    },
    multiItemFillBtn: {
      backgroundColor: colors.accentSoft,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    multiItemFillText: {
      color: colors.accentText,
      fontSize: fontSize.xs,
      fontWeight: "700",
    },
    saveAllBtn: {
      minHeight: tap,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space[2],
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
      marginTop: space[2],
    },
    saveAllBtnDisabled: {
      opacity: 0.5,
    },
    saveAllBtnPressed: {
      opacity: 0.85,
    },
    saveAllBtnText: {
      color: colors.accentInk,
      fontSize: fontSize.sm,
      fontWeight: "700",
    },
  });
}
