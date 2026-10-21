import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import * as pantryRepo from "@/modules/pantry/repositories/pantryRepo";
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

export default function EditSupplementScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState<string | null>(null);

  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState<SupplementUnit>("g");
  const [containerSizeText, setContainerSizeText] = useState("");
  const [servingDoseText, setServingDoseText] = useState("");
  const [currentStockText, setCurrentStockText] = useState("");
  const [location, setLocation] = useState<PantryLocation>("cupboard");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const item = await pantryRepo.findItem(db, itemId);
        if (!item || !active) return;
        setProductId(item.productId);
        setName(item.name);
        setUnit(item.unit ?? "g");
        setLocation(item.location ?? "cupboard");
        setExpiresAt(item.expiresAt);
        setCurrentStockText(String(Math.round(item.gramsLeft * 10) / 10));

        if (item.productId) {
          const product = await productRepo.findById(db, item.productId);
          if (product && active) {
            setBrand(product.brand ?? "");
            setBarcode(product.barcode ?? "");
            if (product.netWeightG !== null) {
              setContainerSizeText(String(product.netWeightG));
            }
            if (product.servingGrams !== null) {
              setServingDoseText(String(product.servingGrams));
            }
          }
        }
      } catch {
        if (active) setError("Couldn't load supplement details.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [db, itemId]);

  const pickExpiry = () => {
    DateTimePickerAndroid.open({
      value: expiresAt ? dayFromKey(expiresAt) : new Date(),
      mode: "date",
      onValueChange: (_event, date) => setExpiresAt(date ? dayKey(date) : null),
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a supplement name.");
      return;
    }
    const containerSize = Number(containerSizeText.trim().replace(",", "."));
    if (!Number.isFinite(containerSize) || containerSize <= 0) {
      setError("Please enter a valid container size.");
      return;
    }

    if (!productId) {
      setError("Missing product reference.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const servingDose = Number(servingDoseText.trim().replace(",", "."));
      const validServing = Number.isFinite(servingDose) && servingDose > 0 ? servingDose : null;

      const currentStock = Number(currentStockText.trim().replace(",", "."));
      const validCurrentStock = Number.isFinite(currentStock) && currentStock >= 0 ? currentStock : undefined;

      await pantryRepo.updateSupplement(db, {
        itemId,
        productId,
        name: name.trim(),
        brand: brand.trim() || null,
        barcode: barcode.trim() || null,
        unit,
        netWeightG: containerSize,
        servingGrams: validServing,
        location,
        expiresAt,
        currentStock: validCurrentStock,
      });

      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save changes.");
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete from Pantry",
      `Are you sure you want to remove ${name || "this supplement"} from your pantry?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await pantryRepo.deletePantryItem(db, itemId);
              router.dismissTo("/pantry");
            } catch {
              setError("Couldn't delete item.");
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  const containerLabel =
    unit === "g"
      ? "Container net weight (g)"
      : unit === "tabs"
        ? "Tablets per bottle"
        : "Capsules per bottle";

  const doseLabel =
    unit === "g"
      ? "Scoop size (g)"
      : unit === "tabs"
        ? "Tablets per dose"
        : "Capsules per dose";

  const stockLabel =
    unit === "g"
      ? "Current amount left (g)"
      : unit === "tabs"
        ? "Tablets currently left"
        : "Capsules currently left";

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Cancel</Text>
        </Pressable>
        <Text style={styles.h1} accessibilityRole="header">
          Edit Supplement
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.space[6] }]} keyboardShouldPersistTaps="handled">
        {/* Barcode field with Scan button */}
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
            placeholder="e.g. Just Whey Vanilla, Creatine"
            placeholderTextColor={theme.colors.faint}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Brand (optional)</Text>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g. Optimum Nutrition, Kirkland"
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

        {/* Container & Dose Sizes */}
        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>{containerLabel} *</Text>
            <TextInput
              value={containerSizeText}
              onChangeText={setContainerSizeText}
              placeholder="e.g. 1000"
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
              placeholder="e.g. 30"
              placeholderTextColor={theme.colors.faint}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
        </View>

        {/* Current Stock Correction */}
        <View style={styles.field}>
          <Text style={styles.label}>{stockLabel}</Text>
          <TextInput
            value={currentStockText}
            onChangeText={setCurrentStockText}
            placeholder="Remaining amount"
            placeholderTextColor={theme.colors.faint}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Text style={styles.fieldHint}>Fix this if your remaining count or weight was entered incorrectly.</Text>
        </View>

        {/* Storage Location & Expiry */}
        <View style={styles.card}>
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
            <Text style={styles.label}>Expiry date</Text>
            <View style={styles.row}>
              <Pressable onPress={pickExpiry} style={[styles.input, styles.dateInput]}>
                <Text style={{ color: expiresAt ? theme.colors.text : theme.colors.faint }}>
                  {expiresAt ? formatDayShort(expiresAt) : "None set"}
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

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          onPress={handleSave}
          disabled={saving || deleting}
          accessibilityRole="button"
          style={({ pressed }) => [styles.submitBtn, (saving || deleting) && styles.btnDisabled, pressed && styles.btnPressed]}
        >
          {saving ? <ActivityIndicator color={theme.colors.accentInk} /> : <Text style={styles.submitBtnText}>Save Changes</Text>}
        </Pressable>

        <Pressable
          onPress={confirmDelete}
          disabled={saving || deleting}
          accessibilityRole="button"
          style={({ pressed }) => [styles.deleteBtn, pressed && styles.btnPressed]}
        >
          {deleting ? <ActivityIndicator color={theme.colors.over} /> : <Text style={styles.deleteBtnText}>Delete from Pantry</Text>}
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
    center: {
      justifyContent: "center",
      alignItems: "center",
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
    fieldHint: {
      color: colors.faint,
      fontSize: fontSize.xs,
      marginTop: 2,
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
    submitBtnText: {
      color: colors.accentInk,
      fontSize: fontSize.md,
      fontWeight: "700",
    },
    deleteBtn: {
      minHeight: tap,
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteBtnText: {
      color: colors.over,
      fontSize: fontSize.sm,
      fontWeight: "600",
    },
    btnDisabled: {
      opacity: 0.5,
    },
    btnPressed: {
      opacity: 0.85,
    },
  });
}
