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
  daysText,
  expiryBadge,
  formatAmount,
  inStock,
  monthDay,
  movementName,
  movementTime,
  netToDrained,
  openedGrams,
  supplementView,
  unitSplit,
} from "@/modules/pantry/services/pantryStock";
import type { PantryLocation, PantryStock, StockMovement, SupplementUnit } from "@/modules/pantry/types/pantry";

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

  const { item, movements, drainedSamples } = state;
  const hasStock = inStock(item);
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {back}
      <View style={styles.appbar}>
        <Text style={styles.h1} numberOfLines={1} accessibilityRole="header">
          {item.name}
        </Text>
        <Pressable
          onPress={() => {
            if (item.kind === "supplement") {
              router.push({ pathname: "/pantry/edit-supplement", params: { itemId: item.id } });
            } else if (item.productId) {
              router.push({ pathname: "/product/[id]", params: { id: item.productId, then: "pantry" } });
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.name}`}
          hitSlop={8}
          style={styles.editBtn}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: theme.space[4] + insets.bottom }]}>
        {item.kind === "supplement" ? (
          <SupplementHero item={item} styles={styles} />
        ) : item.kind === "batch" ? (
          <BatchHero item={item} styles={styles} />
        ) : (
          <Hero item={item} styles={styles} />
        )}

        <View style={[styles.card, styles.fieldsCard]}>
          {item.kind === "supplement" ? (
            <SupplementFields item={item} styles={styles} />
          ) : item.kind === "batch" ? (
            <>
              <Field label="Batch type" value="Cooked batch" styles={styles} />
              <Field
                label="Status"
                value={item.isSettled === false ? "Unsettled estimate" : "Settled"}
                badge={item.isSettled === false ? "⚠ estimate" : undefined}
                styles={styles}
              />
            </>
          ) : (
            <Field label="Net weight per unit" value={item.netWeightG === null ? "Not set" : `${gramsToText(item.netWeightG)} g`} styles={styles} />
          )}
          {item.drained && <Field label="Eaten drained" value="Yes · drained values" styles={styles} />}
          {item.drained && item.usualDrainedG !== null && (
            <Field
              label="Usual drained weight"
              value={`${gramsToText(item.usualDrainedG)} g`}
              badge={drainedSamples >= 2 ? `avg of ${drainedSamples}` : undefined}
              styles={styles}
            />
          )}
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
          {item.kind === "batch" && item.batchId && item.isSettled === false ? (
            <Pressable
              onPress={() => router.push({ pathname: "/pantry/settle/[batchId]" as any, params: { batchId: item.batchId } })}
              accessibilityRole="button"
              style={[styles.btn, styles.settleBtn]}
            >
              <Text style={styles.settleBtnLabel}>Settle</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setSheet("remove")}
              disabled={!hasStock}
              accessibilityRole="button"
              accessibilityState={{ disabled: !hasStock }}
              style={[styles.btn, !hasStock && styles.disabled]}
            >
              <Text style={styles.btnLabel}>Remove</Text>
            </Pressable>
          )}
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
              <MovementRow key={m.id} movement={m} unit={item.unit} last={index === movements.length - 1} styles={styles} />
            ))
          )}
        </View>
      </ScrollView>
      {sheet && (
        <StockChangeSheet
          name={item.name}
          gramsLeft={Math.max(0, item.gramsLeft)}
          unit={item.unit}
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
  const note = empty ? "Used up. Restock from + Add stock." : [...amountNote(item), badge?.text].filter(Boolean).join(" · ");
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

// Supplements are counted with a days-left estimate (story K3), so no unit shapes.
function SupplementHero({ item, styles }: { item: PantryStock; styles: Styles }) {
  const unit = item.unit ?? "g";
  const view = supplementView(item, new Date());
  const badge = expiryBadge(item.expiresAt, dayKey(new Date()));
  const empty = !inStock(item);
  const unitSuffix = unit === "tabs" ? "tabs" : unit === "caps" ? "caps" : "g";
  const estimate =
    view.days !== null && view.dailyUse !== null
      ? `About ${view.days} ${view.days === 1 ? "day" : "days"} left at ${formatKcal(view.dailyUse)} ${unitSuffix} a day`
      : "Log it to see how long it lasts.";
  const note = empty ? "Used up. Restock from + Add stock." : [estimate, badge?.text].filter(Boolean).join(" · ");
  const amount = empty ? `0 ${unitSuffix}` : view.amount;
  return (
    <View style={styles.card}>
      <View style={styles.hero} accessible accessibilityLabel={`${amount} left`}>
        <HeroPart value={amount} word="left" styles={styles} />
        {view.low && view.days !== null && (
          <View style={[styles.badge, styles.badgeOver]}>
            <Text style={[styles.badgeText, styles.badgeTextOver]}>{`low · ${daysText(view.days)}`}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.note, styles.heroNote]}>{note}</Text>
    </View>
  );
}

function BatchHero({ item, styles }: { item: PantryStock; styles: Styles }) {
  const empty = !inStock(item);
  const isUnsettled = item.isSettled === false;
  const amount = empty ? "0 g" : `${formatKcal(Math.max(0, item.gramsLeft))} g`;
  const note = empty
    ? "Batch finished."
    : isUnsettled
      ? "Cooked weight is an estimate. Settle when finished or anytime."
      : "Cooked weight settled.";

  return (
    <View style={styles.card}>
      <View style={styles.hero} accessible accessibilityLabel={`${amount} left`}>
        <HeroPart value={amount} word="left" styles={styles} />
        {isUnsettled && (
          <View style={[styles.badge, styles.badgeOver]}>
            <Text style={[styles.badgeText, styles.badgeTextOver]}>⚠ unsettled</Text>
          </View>
        )}
      </View>
      <Text style={[styles.note, styles.heroNote]}>{note}</Text>
    </View>
  );
}

function SupplementFields({ item, styles }: { item: PantryStock; styles: Styles }) {
  const unit = item.unit ?? "g";
  const { dailyUse } = supplementView(item, new Date());
  const unitSuffix = unit === "tabs" ? "tabs" : unit === "caps" ? "caps" : "g";
  const containerLabel = unit === "g" ? "Container size" : "Bottle size";
  const servingLabel = unit === "g" ? "Scoop" : "Serving";
  return (
    <>
      <Field label={containerLabel} value={item.netWeightG === null ? "Not set" : formatAmount(item.netWeightG, unit)} styles={styles} />
      <Field label={servingLabel} value={item.servingGrams === null ? "Not set" : formatAmount(item.servingGrams, unit)} styles={styles} />
      <Field
        label="Daily use"
        value={dailyUse === null ? "Not enough history" : `${formatKcal(dailyUse)} ${unitSuffix} a day`}
        styles={styles}
      />
    </>
  );
}

// "Opened Oct 20 · about 60 g drained left" for the opened unit, else the whole stock.
function amountNote(item: PantryStock): string[] {
  const usual = item.drained ? item.usualDrainedG : null;
  const word = usual === null ? "left" : "drained left";
  const toShown = (net: number) => formatKcal(usual === null ? net : netToDrained(net, item.netWeightG, usual));
  const opened = openedGrams(item.gramsLeft, item.netWeightG);
  if (opened > 0 && item.openedAt) return [`Opened ${monthDay(item.openedAt)}`, `about ${toShown(opened)} g ${word}`];
  return [`About ${toShown(item.gramsLeft)} g ${word}`];
}

function HeroPart({ value, word, styles }: { value: string; word: string; styles: Styles }) {
  return (
    <View style={styles.heroPart}>
      <Text style={styles.heroNum}>{value}</Text>
      <Text style={styles.heroWord}>{word}</Text>
    </View>
  );
}

type FieldProps = { label: string; value: string; badge?: string; last?: boolean; styles: Styles };

function Field({ label, value, badge, last, styles }: FieldProps) {
  return (
    <View
      style={[styles.field, last && styles.fieldLast]}
      accessible
      accessibilityLabel={[`${label}: ${value}`, badge].filter(Boolean).join(", ")}
    >
      <Text style={styles.lbl}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function MovementRow({
  movement,
  unit,
  last,
  styles,
}: {
  movement: StockMovement;
  unit?: SupplementUnit;
  last: boolean;
  styles: Styles;
}) {
  const name = movementName(movement);
  const time = movementTime(movement.occurredAt);
  const change = changeText(movement, unit);
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
    appbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: space[2],
      paddingHorizontal: space[4],
      paddingBottom: space[3],
    },
    h1: { flex: 1, color: colors.text, fontSize: fontSize.lg, fontWeight: "700", letterSpacing: -0.4, marginRight: space[2] },
    editBtn: {
      paddingHorizontal: space[3],
      paddingVertical: space[1],
      borderRadius: radius.pill,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    editBtnText: {
      color: colors.accentText,
      fontSize: fontSize.sm,
      fontWeight: "600",
    },
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
    valueRow: { flexDirection: "row", alignItems: "center", gap: space[1], flexShrink: 1 },
    value: { color: colors.text, fontSize: fontSize.sm, flexShrink: 1, textAlign: "right" },
    badge: { paddingVertical: 1, paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: colors.estimateSoft },
    badgeText: { color: colors.estimate, fontSize: fontSize.xs, fontWeight: "600" },
    badgeOver: { backgroundColor: colors.overSoft },
    badgeTextOver: { color: colors.over },
    // .btn-row.three: 1.4fr 1fr 1fr.
    btnRow: { flexDirection: "row", gap: space[2] },
    btn: { flex: 1, height: tap, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.surface2 },
    btnWide: { flex: 1.4 },
    primary: { backgroundColor: colors.accent },
    disabled: { opacity: 0.4 },
    btnLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
    primaryLabel: { color: colors.accentInk, fontSize: fontSize.sm, fontWeight: "600" },
    settleBtn: { backgroundColor: colors.accentSoft },
    settleBtnLabel: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: "600" },
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
