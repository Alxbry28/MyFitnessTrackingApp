import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { gramsToText } from "@/modules/nutrition/services/entrySchema";
import { dayFromKey, dayKey, formatDayShort } from "@/modules/nutrition/services/mealTime";
import { useAddStock } from "@/modules/pantry/hooks/useAddStock";
import { gramsLeftText, unitsText } from "@/modules/pantry/services/pantryStock";
import type { Product } from "@/modules/nutrition/types/product";
import { LOCATIONS, type PantryLocation, type PantryStock } from "@/modules/pantry/types/pantry";

const LOCATION_LABELS: Record<PantryLocation, string> = { cupboard: "Cupboard", fridge: "Fridge", freezer: "Freezer" };
const MAX_UNITS = 99;

function backToPantry() {
  router.dismissTo("/pantry");
}

// Built to prototypes/pantry.html frame 3 ("How many did you buy?").
export default function AddStockScreen() {
  const { productId, fresh } = useLocalSearchParams<{ productId: string; fresh?: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { state, retry, save } = useAddStock(productId);

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
        <Text style={styles.message}>{notFound ? "This product doesn't exist anymore." : "Couldn't load this product."}</Text>
        <Pressable onPress={notFound ? backToPantry : retry} accessibilityRole="button" style={styles.ghostBtn}>
          <Text style={styles.ghostLabel}>{notFound ? "Back to pantry" : "Retry"}</Text>
        </Pressable>
      </View>
    );
  }
  return <AddStockForm product={state.product} stock={state.stock} fresh={fresh === "1"} save={save} styles={styles} theme={theme} />;
}

type FormProps = {
  product: Product;
  stock: PantryStock | null;
  fresh: boolean;
  save: ReturnType<typeof useAddStock>["save"];
  styles: Styles;
  theme: Theme;
};

function AddStockForm({ product, stock, fresh, save, styles, theme }: FormProps) {
  const insets = useSafeAreaInsets();
  const [units, setUnits] = useState(1);
  const [netText, setNetText] = useState(product.netWeightG === null ? "" : gramsToText(product.netWeightG));
  const [location, setLocation] = useState<PantryLocation>(stock?.location ?? "cupboard");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const net = Number(netText.trim().replace(",", "."));
  const netValid = netText.trim() !== "" && Number.isFinite(net) && net >= 1 && net <= 100000;
  const gramsAfter = (stock?.gramsLeft ?? 0) + (netValid ? units * net : 0);
  const disabled = !netValid || saving;

  const pickExpiry = () =>
    DateTimePickerAndroid.open({
      value: expiresAt ? dayFromKey(expiresAt) : new Date(),
      mode: "date",
      onValueChange: (_event, date) => setExpiresAt(dayKey(date)),
    });

  const add = async () => {
    if (disabled) return;
    setSaving(true);
    setError(null);
    try {
      await save({ productId: product.id, units, netWeightG: net, location, expiresAt });
      backToPantry();
    } catch {
      setError("Couldn't add to your pantry. Nothing was changed.");
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.found}>{fresh ? "✓ Saved to your library" : "✓ Found in your library"}</Text>
        <View>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.meta}>
            {[product.netWeightG !== null ? `${gramsToText(product.netWeightG)} g each` : null, "in your library"]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Units bought</Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => setUnits((u) => Math.max(1, u - 1))}
              accessibilityRole="button"
              accessibilityLabel="One fewer"
              disabled={units <= 1}
              style={styles.stepBtn}
            >
              <Text style={[styles.stepGlyph, units <= 1 && styles.faint]}>−</Text>
            </Pressable>
            <Text style={styles.stepValue} accessibilityLabel={`${units} units`}>
              {units}
            </Text>
            <Pressable
              onPress={() => setUnits((u) => Math.min(MAX_UNITS, u + 1))}
              accessibilityRole="button"
              accessibilityLabel="One more"
              disabled={units >= MAX_UNITS}
              style={styles.stepBtn}
            >
              <Text style={[styles.stepGlyph, units >= MAX_UNITS && styles.faint]}>+</Text>
            </Pressable>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLbl}>Net weight per unit</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={netText}
                onChangeText={setNetText}
                keyboardType="decimal-pad"
                placeholder="g"
                placeholderTextColor={theme.colors.faint}
                accessibilityLabel="Net weight per unit in grams"
                style={[styles.input, !netValid && styles.inputEmpty]}
              />
              <Text style={styles.unit}>g</Text>
            </View>
          </View>
          {!netValid && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {netText.trim() === "" ? "Enter the weight on the pack" : "Enter a weight from 1 to 100,000 g"}
            </Text>
          )}
        </View>

        <View style={styles.result} accessible accessibilityLabel={`In stock after this: ${unitsText(gramsAfter, netValid ? net : null)}, ${gramsLeftText(gramsAfter)}`}>
          <Text style={styles.resultLbl}>In stock after this</Text>
          <View>
            <Text style={styles.resultValue}>{unitsText(gramsAfter, netValid ? net : null)}</Text>
            <Text style={styles.resultSmall}>{gramsLeftText(gramsAfter)}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.label}>Location</Text>
          <View style={styles.seg} accessibilityRole="radiogroup">
            {LOCATIONS.map((l) => {
              const on = l === location;
              return (
                <Pressable
                  key={l}
                  onPress={() => setLocation(l)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.segItem, on && styles.segOn]}
                >
                  <Text style={[styles.segLabel, on && styles.segLabelOn]}>{LOCATION_LABELS[l]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.field, styles.fieldLast]}>
          <Text style={styles.fieldLbl}>Expiry date</Text>
          <View style={styles.expiry}>
            <Pressable
              onPress={pickExpiry}
              accessibilityRole="button"
              accessibilityLabel={expiresAt ? `Expiry date ${formatDayShort(expiresAt)}. Change` : "Expiry date, optional. Pick"}
            >
              <Text style={[styles.input, !expiresAt && styles.inputEmpty]}>{expiresAt ? formatDayShort(expiresAt) : "Optional"}</Text>
            </Pressable>
            {expiresAt && (
              <Pressable onPress={() => setExpiresAt(null)} accessibilityRole="button" accessibilityLabel="Clear expiry date" hitSlop={12}>
                <Text style={styles.clear}>Clear</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.note}>{"Adding stock doesn't count toward today's calories. Only eating does."}</Text>
        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </ScrollView>
      <View style={[styles.btnRow, { paddingBottom: theme.space[4] + insets.bottom }]}>
        <Pressable onPress={backToPantry} accessibilityRole="button" style={[styles.btn, styles.ghost]}>
          <Text style={styles.ghostLabel}>Library only</Text>
        </Pressable>
        <Pressable
          onPress={() => void add()}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: saving }}
          style={[styles.btn, styles.primary, disabled && styles.disabled]}
        >
          <Text style={styles.primaryLabel}>{saving ? "Adding..." : `Add ${units} to pantry`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4], padding: space[5], backgroundColor: colors.bg },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    content: { padding: space[4], gap: space[3] },
    found: { color: colors.ok, fontSize: fontSize.sm, fontWeight: "600" },
    name: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
    meta: { color: colors.muted, fontSize: fontSize.sm, marginTop: 2 },
    card: {
      gap: space[2],
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    label: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: space[2] },
    stepper: { flexDirection: "row", alignItems: "center", gap: space[4] },
    stepBtn: { width: tap, height: tap, borderRadius: tap / 2, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface2 },
    stepGlyph: { color: colors.text, fontSize: fontSize.lg, fontWeight: "600" },
    faint: { color: colors.faint },
    stepValue: { minWidth: 40, textAlign: "center", color: colors.text, fontSize: fontSize.num, fontWeight: "700", fontVariant: ["tabular-nums"] },
    field: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: space[3],
      minHeight: 48,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    fieldLast: { borderTopWidth: 0, borderBottomWidth: 0 },
    fieldLbl: { color: colors.muted, fontSize: fontSize.sm },
    inputWrap: { flexDirection: "row", alignItems: "center", gap: space[1] },
    input: {
      minWidth: 88,
      paddingVertical: space[2],
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: "600",
      textAlign: "right",
    },
    inputEmpty: { color: colors.faint, fontWeight: "400" },
    unit: { color: colors.muted, fontSize: fontSize.sm },
    expiry: { flexDirection: "row", alignItems: "center", gap: space[3] },
    clear: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: "600" },
    result: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    resultLbl: { color: colors.text, fontSize: fontSize.sm },
    resultValue: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", textAlign: "right" },
    resultSmall: { color: colors.muted, fontSize: fontSize.xs, textAlign: "right" },
    seg: { flexDirection: "row", padding: 3, borderRadius: radius.md, backgroundColor: colors.surface2 },
    segItem: { flex: 1, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 9 },
    segOn: { backgroundColor: colors.surface },
    segLabel: { color: colors.muted, fontSize: fontSize.sm },
    segLabelOn: { color: colors.text, fontWeight: "600" },
    note: { color: colors.muted, fontSize: fontSize.xs, lineHeight: 16 },
    error: { color: colors.over, fontSize: fontSize.sm },
    btnRow: { flexDirection: "row", gap: space[2], paddingTop: space[3], paddingHorizontal: space[4], backgroundColor: colors.bg },
    btn: { flex: 1, height: tap, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
    ghost: { borderWidth: 1, borderColor: colors.border },
    ghostBtn: { minHeight: tap, justifyContent: "center", paddingHorizontal: space[5], borderRadius: radius.md, backgroundColor: colors.surface2 },
    ghostLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
    primary: { backgroundColor: colors.accent },
    disabled: { opacity: 0.4 },
    primaryLabel: { color: colors.accentInk, fontSize: fontSize.sm, fontWeight: "700" },
  });
}
