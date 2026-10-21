import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { BarcodeScanModal } from "@/modules/nutrition/components/BarcodeScanModal";
import * as productRepo from "@/modules/nutrition/repositories/productRepo";
import { dayFromKey, dayKey, formatDayShort } from "@/modules/nutrition/services/mealTime";
import type { ProductInput } from "@/modules/nutrition/types/product";
import * as pantryRepo from "@/modules/pantry/repositories/pantryRepo";
import { formatAmount } from "@/modules/pantry/services/pantryStock";
import {
  LOCATIONS,
  type PantryLocation,
  type SupplementUnit,
} from "@/modules/pantry/types/pantry";

const UNITS: { value: SupplementUnit; label: string; icon: string }[] = [
  { value: "g", label: "Powder (Grams)", icon: "🥄" },
  { value: "tabs", label: "Tablets", icon: "💊" },
  { value: "caps", label: "Capsules", icon: "💊" },
];

export default function NewSupplementScreen() {
  const params = useLocalSearchParams<{ barcode?: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [barcode, setBarcode] = useState(params.barcode ?? "");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState<SupplementUnit>("g");
  const [containerSizeText, setContainerSizeText] = useState("");
  const [servingDoseText, setServingDoseText] = useState("");
  const [unitsBought, setUnitsBought] = useState(1);
  const [location, setLocation] = useState<PantryLocation>("cupboard");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // Optional nutrition per serving
  const [showNutrition, setShowNutrition] = useState(false);
  const [kcalText, setKcalText] = useState("");
  const [proteinText, setProteinText] = useState("");
  const [carbsText, setCarbsText] = useState("");
  const [fatText, setFatText] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerSize = Number(containerSizeText.trim().replace(",", "."));
  const servingDose = Number(servingDoseText.trim().replace(",", "."));
  const hasValidName = name.trim().length > 0;
  const hasValidContainer = containerSizeText.trim() !== "" && Number.isFinite(containerSize) && containerSize > 0;

  const pickExpiry = () => {
    DateTimePickerAndroid.open({
      value: expiresAt ? dayFromKey(expiresAt) : new Date(),
      mode: "date",
      onValueChange: (_event, date) => setExpiresAt(date ? dayKey(date) : null),
    });
  };

  const handleSave = async () => {
    if (!hasValidName) {
      setError("Please enter a supplement name.");
      return;
    }
    if (!hasValidContainer) {
      setError(
        unit === "g"
          ? "Please enter container weight in grams."
          : `Please enter number of ${unit} per bottle.`,
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const validServing = Number.isFinite(servingDose) && servingDose > 0 ? servingDose : null;

      // Calculate per 100g or per unit nutrition
      let kcalPer100 = 0;
      let proteinPer100: number | null = null;
      let carbsPer100: number | null = null;
      let fatPer100: number | null = null;

      if (showNutrition) {
        const kcal = Number(kcalText.trim().replace(",", "."));
        const protein = Number(proteinText.trim().replace(",", "."));
        const carbs = Number(carbsText.trim().replace(",", "."));
        const fat = Number(fatText.trim().replace(",", "."));

        const baseDose = validServing ?? 1;
        if (Number.isFinite(kcal) && kcal >= 0) {
          kcalPer100 = unit === "g" ? Math.round((kcal / baseDose) * 100) : kcal;
        }
        if (Number.isFinite(protein) && protein >= 0) {
          proteinPer100 = unit === "g" ? Math.round(((protein / baseDose) * 100) * 10) / 10 : protein;
        }
        if (Number.isFinite(carbs) && carbs >= 0) {
          carbsPer100 = unit === "g" ? Math.round(((carbs / baseDose) * 100) * 10) / 10 : carbs;
        }
        if (Number.isFinite(fat) && fat >= 0) {
          fatPer100 = unit === "g" ? Math.round(((fat / baseDose) * 100) * 10) / 10 : fat;
        }
      }

      const servingLabel =
        unit === "g"
          ? validServing ? `${validServing} g scoop` : "1 scoop"
          : validServing ? `${validServing} ${unit}` : `1 ${unit}`;

      const productInput: ProductInput = {
        name: name.trim(),
        brand: brand.trim() || null,
        barcode: barcode.trim() || null,
        servingSize: servingLabel,
        servingGrams: validServing,
        kcalPer100g: kcalPer100,
        proteinPer100g: proteinPer100,
        carbsPer100g: carbsPer100,
        fatPer100g: fatPer100,
        netWeightG: containerSize,
        eatenDrained: false,
        drainedKcalPer100g: null,
        drainedProteinPer100g: null,
        drainedCarbsPer100g: null,
        drainedFatPer100g: null,
        usualDrainedG: null,
      };

      const result = await productRepo.create(db, productInput, "manual");
      if (!result.ok) {
        if (result.error === "duplicate_barcode") {
          setError("Another product already uses this barcode.");
        } else {
          setError("Couldn't save this product.");
        }
        setSaving(false);
        return;
      }

      // Automatically add stock to pantry
      await pantryRepo.addStock(db, {
        productId: result.id,
        kind: "supplement",
        units: unitsBought,
        netWeightG: containerSize,
        location,
        expiresAt,
        unit,
      });

      router.dismissTo("/pantry");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save supplement.");
      setSaving(false);
    }
  };

  const containerLabel =
    unit === "g"
      ? "Container net weight (g)"
      : unit === "tabs"
        ? "Tablets per bottle"
        : "Capsules per bottle";

  const doseLabel =
    unit === "g"
      ? "Scoop size in grams"
      : unit === "tabs"
        ? "Tablets per dose"
        : "Capsules per dose";

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Pantry</Text>
        </Pressable>
        <Text style={styles.h1} accessibilityRole="header">
          New Supplement
        </Text>
        <Text style={styles.sub}>Add directly to pantry stock</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.space[6] }]} keyboardShouldPersistTaps="handled">
        {/* Barcode row with scan button */}
        <View style={styles.field}>
          <Text style={styles.label}>Barcode (optional)</Text>
          <View style={styles.barcodeRow}>
            <TextInput
              value={barcode}
              onChangeText={setBarcode}
              placeholder="e.g. 074892702410"
              placeholderTextColor={theme.colors.faint}
              keyboardType="number-pad"
              style={[styles.input, { flex: 1 }]}
            />
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
        </View>

        {/* Basic Info */}
        <View style={styles.field}>
          <Text style={styles.label}>Supplement Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Just Whey Vanilla, Creatine, Multivitamin"
            placeholderTextColor={theme.colors.faint}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Brand (optional)</Text>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g. Optimum Nutrition, Kirkland, Thorne"
            placeholderTextColor={theme.colors.faint}
            style={styles.input}
          />
        </View>

        {/* Unit Selector */}
        <View style={styles.field}>
          <Text style={styles.label}>Supplement Form</Text>
          <View style={styles.unitChips}>
            {UNITS.map((u) => {
              const on = u.value === unit;
              return (
                <Pressable
                  key={u.value}
                  onPress={() => setUnit(u.value)}
                  style={[styles.unitChip, on && styles.unitChipOn]}
                >
                  <Text style={styles.unitChipIcon}>{u.icon}</Text>
                  <Text style={[styles.unitChipLabel, on && styles.unitChipLabelOn]}>{u.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sizes */}
        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>{containerLabel} *</Text>
            <TextInput
              value={containerSizeText}
              onChangeText={setContainerSizeText}
              placeholder={unit === "g" ? "e.g. 1000" : "e.g. 120"}
              placeholderTextColor={theme.colors.faint}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{doseLabel}</Text>
            <TextInput
              value={servingDoseText}
              onChangeText={setServingDoseText}
              placeholder={unit === "g" ? "e.g. 30" : "e.g. 1"}
              placeholderTextColor={theme.colors.faint}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
        </View>

        {/* Stock added */}
        <View style={styles.card}>
          <View style={styles.stepperRow}>
            <Text style={styles.cardLabel}>{unit === "g" ? "Containers bought" : "Bottles bought"}</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setUnitsBought((u) => Math.max(1, u - 1))}
                accessibilityRole="button"
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{unitsBought}</Text>
              <Pressable
                onPress={() => setUnitsBought((u) => u + 1)}
                accessibilityRole="button"
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          {hasValidContainer && (
            <Text style={styles.stockPreview}>
              Initial stock: <Text style={{ color: theme.colors.accentText, fontWeight: "700" }}>{formatAmount(unitsBought * containerSize, unit)}</Text>
            </Text>
          )}

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>Storage Location</Text>
            <View style={styles.chips}>
              {LOCATIONS.map((loc) => {
                const on = loc === location;
                return (
                  <Pressable
                    key={loc}
                    onPress={() => setLocation(loc)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>
                      {loc.charAt(0).toUpperCase() + loc.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Expiry date (optional)</Text>
            <View style={styles.row}>
              <Pressable onPress={pickExpiry} style={[styles.input, styles.dateInput]}>
                <Text style={{ color: expiresAt ? theme.colors.text : theme.colors.faint }}>
                  {expiresAt ? formatDayShort(expiresAt) : "Set date"}
                </Text>
              </Pressable>
              {expiresAt && (
                <Pressable onPress={() => setExpiresAt(null)} style={styles.clearDateBtn}>
                  <Text style={styles.clearDateText}>Clear</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Optional Nutrition */}
        <Pressable
          onPress={() => setShowNutrition((s) => !s)}
          style={styles.toggleNutritionBtn}
        >
          <Text style={styles.toggleNutritionText}>
            {showNutrition ? "▾ Hide nutrition / macros" : "▸ Add nutrition / macros (optional)"}
          </Text>
        </Pressable>

        {showNutrition && (
          <View style={styles.card}>
            <Text style={styles.nutritionHint}>
              Enter macros per serving ({servingDoseText ? `${servingDoseText} ${unit}` : "1 dose"}). For vitamins or creatine, you can leave these as 0.
            </Text>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Calories (kcal)</Text>
                <TextInput
                  value={kcalText}
                  onChangeText={setKcalText}
                  placeholder="0"
                  placeholderTextColor={theme.colors.faint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Protein (g)</Text>
                <TextInput
                  value={proteinText}
                  onChangeText={setProteinText}
                  placeholder="0"
                  placeholderTextColor={theme.colors.faint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Carbs (g)</Text>
                <TextInput
                  value={carbsText}
                  onChangeText={setCarbsText}
                  placeholder="0"
                  placeholderTextColor={theme.colors.faint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Fat (g)</Text>
                <TextInput
                  value={fatText}
                  onChangeText={setFatText}
                  placeholder="0"
                  placeholderTextColor={theme.colors.faint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
            </View>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          onPress={handleSave}
          disabled={saving || !hasValidName}
          accessibilityRole="button"
          style={({ pressed }) => [styles.submitBtn, (!hasValidName || saving) && styles.submitBtnDisabled, pressed && styles.submitBtnPressed]}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.accentInk} />
          ) : (
            <Text style={styles.submitBtnText}>Save &amp; Add to Pantry</Text>
          )}
        </Pressable>
      </ScrollView>

      <BarcodeScanModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={(code) => setBarcode(code)}
      />
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    appbar: {
      paddingHorizontal: space[4],
      paddingTop: space[2],
      paddingBottom: space[3],
    },
    backBtn: {
      paddingBottom: space[1],
    },
    backText: {
      color: colors.accentText,
      fontSize: fontSize.sm,
      fontWeight: "600",
    },
    h1: {
      color: colors.text,
      fontSize: fontSize.xl,
      fontWeight: "700",
      letterSpacing: -0.5,
    },
    sub: {
      color: colors.muted,
      fontSize: fontSize.sm,
      marginTop: 2,
    },
    content: {
      paddingHorizontal: space[4],
      gap: space[3],
    },
    field: {
      flex: 1,
      gap: space[1],
    },
    label: {
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "600",
    },
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
    dateInput: {
      flex: 1,
      justifyContent: "center",
    },
    clearDateBtn: {
      height: tap,
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    clearDateText: {
      color: colors.muted,
      fontSize: fontSize.sm,
    },
    row: {
      flexDirection: "row",
      gap: space[2],
    },
    barcodeRow: {
      flexDirection: "row",
      gap: space[2],
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
    scanBtnPressed: {
      backgroundColor: colors.accentSoft,
    },
    scanBtnText: {
      color: colors.accentText,
      fontSize: fontSize.sm,
      fontWeight: "600",
    },
    unitChips: {
      flexDirection: "row",
      gap: space[2],
    },
    unitChip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space[1],
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unitChipOn: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    unitChipIcon: {
      fontSize: 14,
    },
    unitChipLabel: {
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "500",
    },
    unitChipLabelOn: {
      color: colors.accentText,
      fontWeight: "700",
    },
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: space[4],
      gap: space[3],
    },
    cardLabel: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: "600",
    },
    stepperRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
    },
    stepperBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepperBtnText: {
      color: colors.text,
      fontSize: fontSize.lg,
      fontWeight: "700",
    },
    stepperValue: {
      color: colors.text,
      fontSize: fontSize.lg,
      fontWeight: "700",
      minWidth: 24,
      textAlign: "center",
    },
    stockPreview: {
      color: colors.muted,
      fontSize: fontSize.sm,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    chips: {
      flexDirection: "row",
      gap: space[2],
    },
    chip: {
      height: 32,
      paddingHorizontal: space[3],
      borderRadius: radius.pill,
      backgroundColor: colors.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    chipOn: {
      backgroundColor: colors.accentSoft,
    },
    chipLabel: {
      color: colors.muted,
      fontSize: fontSize.sm,
    },
    chipLabelOn: {
      color: colors.accentText,
      fontWeight: "600",
    },
    toggleNutritionBtn: {
      paddingVertical: space[2],
    },
    toggleNutritionText: {
      color: colors.accentText,
      fontSize: fontSize.sm,
      fontWeight: "600",
    },
    nutritionHint: {
      color: colors.muted,
      fontSize: fontSize.xs,
      lineHeight: 18,
    },
    errorText: {
      color: colors.over,
      fontSize: fontSize.sm,
    },
    submitBtn: {
      minHeight: tap,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginTop: space[2],
    },
    submitBtnDisabled: {
      opacity: 0.5,
    },
    submitBtnPressed: {
      opacity: 0.85,
    },
    submitBtnText: {
      color: colors.accentInk,
      fontSize: fontSize.md,
      fontWeight: "700",
    },
  });
}
