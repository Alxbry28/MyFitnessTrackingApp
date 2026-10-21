import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { gramsToText } from "@/modules/nutrition/services/entrySchema";
import { dayKey, formatDayShort } from "@/modules/nutrition/services/mealTime";
import { formatKcal } from "@/modules/nutrition/services/nutritionCalc";
import { StockChangeSheet, type SheetMode } from "@/modules/pantry/components/StockChangeSheet";
import { usePantryItem } from "@/modules/pantry/hooks/usePantryItem";
import {
  changeText,
  changeTone,
  expiryBadge,
  inStock,
  movementName,
  movementTime,
  unitSplit,
} from "@/modules/pantry/services/pantryStock";
import type { PantryLocation, PantryStock, StockMovement } from "@/modules/pantry/types/pantry";

const LOCATION_LABELS: Record<PantryLocation, string> = { cupboard: "Cupboard", fridge: "Fridge", freezer: "Freezer" };
const MAX_SHAPES = 12;

function backToPantry() {
  router.dismissTo("/pantry");
}

// Built to prototypes/pantry.html frame 2 ("Item detail: amount left = sum of the history").
export default function PantryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const { state, retry, remove, adjust } = usePantryItem(id);
  const [sheet, setSheet] = useState<SheetMode | null>(null);

  const back = (
    <Pressable onPress={backToPantry} accessibilityRole="button" hitSlop={8} style={styles.backBtn}>
      <Text style={styles.back}>‹ Pantry</Text>
    </Pressable>
  );

  if (state.status !== "ready") {
    const notFound = state.status === "not_found";
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {back}
        <View style={styles.center}>
          {state.status === "loading" ? (
            <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading item" />
          ) : (
            <>
              <Text style={styles.message}>
                {notFound ? "This item isn't in your pantry anymore." : "Couldn't load this item."}
              </Text>
              <Pressable onPress={notFound ? backToPantry : retry} accessibilityRole="button" style={styles.centerBtn}>
                <Text style={styles.btnLabel}>{notFound ? "Back to pantry" : "Retry"}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  }

  const { item, movements } = state;
  const hasStock = inStock(item);
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {back}
      <View style={styles.appbar}>
        <Text style={styles.h1} accessibilityRole="header">
          {item.name}
        </Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: theme.space[4] + insets.bottom }]}>
        <Hero item={item} styles={styles} />

        <View style={[styles.card, styles.fieldsCard]}>
          <Field label="Net weight per unit" value={item.netWeightG === null ? "Not set" : `${gramsToText(item.netWeightG)} g`} styles={styles} />
          <Field label="Location" value={LOCATION_LABELS[item.location]} styles={styles} />
          <Field label="Expiry date" value={item.expiresAt ? formatDayShort(item.expiresAt) : "None"} styles={styles} last />
        </View>

        <View style={styles.btnRow}>
          <Pressable
            onPress={() => router.push({ pathname: "/pantry/portion/[itemId]", params: { itemId: item.id } })}
            disabled={!hasStock}
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasStock }}
            style={[styles.btn, styles.btnWide, styles.primary, !hasStock && styles.disabled]}
          >
            <Text style={styles.primaryLabel}>Log a portion</Text>
          </Pressable>
          <Pressable
            onPress={() => setSheet("remove")}
            disabled={!hasStock}
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasStock }}
            style={[styles.btn, !hasStock && styles.disabled]}
          >
            <Text style={styles.btnLabel}>Remove</Text>
          </Pressable>
          <Pressable onPress={() => setSheet("adjust")} accessibilityRole="button" style={styles.btn}>
            <Text style={styles.btnLabel}>Adjust</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel} accessibilityRole="header">
          History
        </Text>
        <View style={[styles.card, styles.listCard]}>
          {movements.length === 0 ? (
            <Text style={styles.empty}>No changes yet.</Text>
          ) : (
            movements.map((m, index) => (
              <MovementRow key={m.id} movement={m} last={index === movements.length - 1} styles={styles} />
            ))
          )}
        </View>
      </ScrollView>
      {sheet && (
        <StockChangeSheet
          name={item.name}
          gramsLeft={Math.max(0, item.gramsLeft)}
          initialMode={hasStock ? sheet : "adjust"}
          onRemove={remove}
          onAdjust={adjust}
          onClose={() => setSheet(null)}
        />
      )}
    </View>
  );
}

function Hero({ item, styles }: { item: PantryStock; styles: Styles }) {
  const { sealed, opened } = unitSplit(item.gramsLeft, item.netWeightG);
  const shapes = sealed + (opened ? 1 : 0);
  const shown = Math.min(shapes, MAX_SHAPES);
  const badge = expiryBadge(item.expiresAt, dayKey(new Date()));
  const empty = shapes === 0;
  const note = empty
    ? "Used up. Restock from + Add stock."
    : [`About ${formatKcal(item.gramsLeft)} g left`, badge?.text].filter(Boolean).join(" · ");
  const label = empty
    ? "0 left"
    : [sealed > 0 && `${sealed} sealed`, opened && "1 opened"].filter(Boolean).join(", ");

  return (
    <View style={styles.card}>
      <View style={styles.hero} accessible accessibilityLabel={label}>
        {empty && <HeroPart value="0" word="left" styles={styles} />}
        {sealed > 0 && <HeroPart value={String(sealed)} word="sealed" styles={styles} />}
        {opened && <HeroPart value="1" word="opened" styles={styles} />}
      </View>
      {shown > 0 && (
        <View style={styles.units} importantForAccessibility="no-hide-descendants">
          {Array.from({ length: shown }, (_, i) => {
            const isOpened = opened && i === shapes - 1;
            return isOpened ? (
              <View key={i} style={[styles.unit, styles.unitOpened]}>
                <View style={styles.unitFill} />
              </View>
            ) : (
              <View key={i} style={styles.unit} />
            );
          })}
          {shapes > shown && <Text style={styles.more}>+{shapes - shown}</Text>}
        </View>
      )}
      <Text style={[styles.note, styles.heroNote]}>{note}</Text>
    </View>
  );
}

function HeroPart({ value, word, styles }: { value: string; word: string; styles: Styles }) {
  return (
    <View style={styles.heroPart}>
      <Text style={styles.heroNum}>{value}</Text>
      <Text style={styles.heroWord}>{word}</Text>
    </View>
  );
}

function Field({ label, value, last, styles }: { label: string; value: string; last?: boolean; styles: Styles }) {
  return (
    <View style={[styles.field, last && styles.fieldLast]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.lbl}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function MovementRow({ movement, last, styles }: { movement: StockMovement; last: boolean; styles: Styles }) {
  const name = movementName(movement);
  const time = movementTime(movement.occurredAt);
  const change = changeText(movement);
  const tone = changeTone(movement);
  return (
    <View style={[styles.row, !last && styles.divided]} accessible accessibilityLabel={`${name}, ${time}, ${change}`}>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{time}</Text>
      </View>
      <Text style={[styles.move, tone === "ok" ? styles.movePlus : tone === "over" ? styles.moveWaste : styles.moveMinus]}>
        {change}
      </Text>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    backBtn: { alignSelf: "flex-start", paddingTop: space[2], paddingHorizontal: space[4] },
    back: { color: colors.accentText, fontSize: fontSize.sm },
    appbar: { paddingTop: space[2], paddingHorizontal: space[4], paddingBottom: space[3] },
    h1: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", letterSpacing: -0.4 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4], padding: space[5] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    centerBtn: { minHeight: tap, justifyContent: "center", paddingHorizontal: space[5], borderRadius: radius.md, backgroundColor: colors.surface2 },
    content: { paddingHorizontal: space[4], gap: space[3] },
    card: {
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    // pantry.html .hero: numbers in num 700 with a muted word after each, baseline aligned.
    hero: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: space[2] },
    heroPart: { flexDirection: "row", alignItems: "baseline", gap: space[2] },
    heroNum: { color: colors.text, fontSize: fontSize.num, fontWeight: "700", letterSpacing: -1, lineHeight: fontSize.num, fontVariant: ["tabular-nums"] },
    heroWord: { color: colors.muted, fontSize: fontSize.sm },
    units: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[2], marginTop: space[3] },
    unit: { width: 34, height: 44, borderRadius: 6, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSoft, overflow: "hidden" },
    // .can.opened: dashed outline, filled only on the lower 45%.
    unitOpened: { borderStyle: "dashed", backgroundColor: "transparent", justifyContent: "flex-end" },
    unitFill: { height: "45%", backgroundColor: colors.accentSoft },
    more: { color: colors.muted, fontSize: fontSize.sm },
    note: { color: colors.muted, fontSize: fontSize.xs, lineHeight: 16 },
    heroNote: { marginTop: space[3] },
    fieldsCard: { paddingVertical: space[1] },
    field: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: space[3],
      minHeight: 48,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    fieldLast: { borderBottomWidth: 0 },
    lbl: { color: colors.muted, fontSize: fontSize.sm },
    value: { color: colors.text, fontSize: fontSize.sm, flexShrink: 1, textAlign: "right" },
    // .btn-row.three: 1.4fr 1fr 1fr.
    btnRow: { flexDirection: "row", gap: space[2] },
    btn: { flex: 1, height: tap, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.surface2 },
    btnWide: { flex: 1.4 },
    primary: { backgroundColor: colors.accent },
    disabled: { opacity: 0.4 },
    btnLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
    primaryLabel: { color: colors.accentInk, fontSize: fontSize.sm, fontWeight: "600" },
    sectionLabel: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.7 },
    listCard: { paddingVertical: 0 },
    empty: { color: colors.muted, fontSize: fontSize.sm, paddingVertical: space[4] },
    row: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 56, paddingVertical: space[2] },
    divided: { borderBottomWidth: 1, borderBottomColor: colors.border },
    info: { flex: 1, minWidth: 0 },
    name: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
    meta: { color: colors.muted, fontSize: fontSize.sm, marginTop: 2 },
    move: { fontSize: fontSize.md, fontWeight: "600", fontVariant: ["tabular-nums"] },
    movePlus: { color: colors.ok },
    moveMinus: { color: colors.text },
    moveWaste: { color: colors.over },
  });
}
