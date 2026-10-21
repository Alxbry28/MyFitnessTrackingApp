import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import type { SaveOutcome } from "../hooks/useEntry";
import { gramsToText } from "../services/entrySchema";
import {
  amountChips,
  changeList,
  dateFieldText,
  dayText,
  formatTime,
  originalDraft,
  type EntryDraft,
} from "../services/entryEdit";
import { dayFromKey, dayKey, MEAL_LABELS } from "../services/mealTime";
import { forGrams, formatKcal, formatMacro } from "../services/nutritionCalc";
import { MEAL_TYPES, type FoodLogEntry } from "../types/foodLog";
import { DeleteEntrySheet } from "./DeleteEntrySheet";
import { DiscardDialog } from "./DiscardDialog";

type Props = {
  entry: FoodLogEntry;
  servingGrams: number | null;
  dayKcal: number;
  today: string;
  onSave: (draft: EntryDraft & { grams: number }) => Promise<SaveOutcome>;
  onDelete: () => Promise<boolean>;
  onLeave: () => void;
};

// Android decimal keyboards can type a comma depending on locale.
function parseGrams(text: string): number | null {
  const n = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
}

// prototypes/entry-edit.html frames 1-4.
export function EntryEditForm({ entry, servingGrams, dayKcal, today, onSave, onDelete, onLeave }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const original = originalDraft(entry);
  const [mealType, setMealType] = useState(entry.mealType);
  const [day, setDay] = useState(entry.day);
  const [minutes, setMinutes] = useState(original.minutes);
  const [gramsText, setGramsText] = useState(gramsToText(entry.grams));
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"delete" | "discard" | null>(null);

  const grams = parseGrams(gramsText);
  const draft: EntryDraft = { mealType, day, minutes, grams };
  const changes = changeList(entry, draft, today);
  const preview = grams === null ? null : forGrams(entry, grams);
  const delta = preview === null ? 0 : Math.round(preview.kcal) - Math.round(entry.kcal);

  const leave = () => (changes.length > 0 ? setSheet("discard") : onLeave());

  // Android back asks before dropping unsaved changes, and closes an open sheet first.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (sheet) setSheet(null);
      else leave();
      return true;
    });
    return () => sub.remove();
  });

  const pickDate = () =>
    DateTimePickerAndroid.open({
      value: dayFromKey(day),
      mode: "date",
      maximumDate: dayFromKey(today),
      onValueChange: (_event, date) => {
        setDay(dayKey(date));
      },
    });

  const pickTime = () =>
    DateTimePickerAndroid.open({
      value: new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60),
      mode: "time",
      onValueChange: (_event, date) => {
        setMinutes(date.getHours() * 60 + date.getMinutes());
      },
    });

  const save = async () => {
    if (grams === null || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const result = await onSave({ mealType, day, minutes, grams });
      if (result.ok) onLeave();
      else setFormError(result.message);
    } catch {
      setFormError("Couldn't save the entry. Your changes are kept, so try again.");
    } finally {
      setSaving(false);
    }
  };

  const disabled = grams === null || saving;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={leave} accessibilityRole="button" accessibilityLabel="Back" style={styles.iconBtn}>
          <SymbolView name={{ android: "arrow_back", web: "arrow_back" }} tintColor={theme.colors.muted} size={22} />
        </Pressable>
        <Text style={styles.h1} accessibilityRole="header">
          Edit entry
        </Text>
        <Pressable onPress={() => setSheet("delete")} accessibilityRole="button" accessibilityLabel="Delete entry" style={styles.iconBtn}>
          <SymbolView name={{ android: "delete", web: "delete" }} tintColor={theme.colors.over} size={22} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.productName}>{entry.productName}</Text>
          <Text style={styles.productMeta}>{formatKcal(entry.kcalPer100g)} kcal per 100 g · values copied when logged</Text>
        </View>

        <View>
          <Text style={styles.label}>Meal</Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {MEAL_TYPES.map((m) => {
              const on = m === mealType;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMealType(m)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{MEAL_LABELS[m]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <View style={styles.labelRow}>
            <Text style={styles.label}>When</Text>
            <View style={styles.newPill}>
              <Text style={styles.newText}>new</Text>
            </View>
          </View>
          <View style={styles.when}>
            <Pressable
              onPress={pickDate}
              accessibilityRole="button"
              accessibilityLabel={`Date, ${dayText(day, today)}. Change`}
              style={[styles.field, styles.dateField, day !== entry.day && styles.fieldChanged]}
            >
              <SymbolView name={{ android: "calendar_today", web: "calendar_today" }} tintColor={theme.colors.muted} size={18} />
              <Text style={styles.fieldValue}>{dateFieldText(day, today)}</Text>
            </Pressable>
            <Pressable
              onPress={pickTime}
              accessibilityRole="button"
              accessibilityLabel={`Time, ${formatTime(minutes)}. Change`}
              style={[styles.field, styles.timeField, minutes !== original.minutes && styles.fieldChanged]}
            >
              <SymbolView name={{ android: "schedule", web: "schedule" }} tintColor={theme.colors.muted} size={18} />
              <Text style={styles.fieldValue}>{formatTime(minutes)}</Text>
            </Pressable>
          </View>
          {day !== entry.day && (
            <Text style={[styles.hint, styles.hintMoved]}>
              Moves from {entry.day === today ? "today" : dayText(entry.day, today)} to{" "}
              {day === today ? "today" : dayText(day, today)}
            </Text>
          )}
        </View>

        <View>
          <Text style={styles.label}>Amount</Text>
          <View style={[styles.ring, focused && styles.ringFocus, grams === null && styles.ringError]}>
            <View style={[styles.field, focused && styles.fieldFocus, grams === null && styles.fieldError]}>
              <TextInput
                value={gramsText}
                onChangeText={setGramsText}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="decimal-pad"
                placeholder="e.g. 200"
                placeholderTextColor={theme.colors.faint}
                accessibilityLabel="Amount in grams"
                style={styles.input}
              />
              <Text style={styles.unit}>g</Text>
            </View>
          </View>
          {grams === null ? (
            <Text style={[styles.hint, styles.hintErr]} accessibilityLiveRegion="polite">
              Enter an amount above 0 g. To remove it, use Delete.
            </Text>
          ) : (
            <View style={styles.amountRow}>
              {amountChips(entry.grams, servingGrams).map((chip) => (
                <Pressable
                  key={chip.label}
                  onPress={() => setGramsText(gramsToText(chip.grams(grams)))}
                  accessibilityRole="button"
                  accessibilityLabel={chip.label.startsWith("−") ? "Minus 10 grams" : chip.label.startsWith("+") ? "Plus 10 grams" : `Set ${chip.label}`}
                  style={[styles.chip, styles.amountChip]}
                >
                  <Text style={styles.chipLabel}>{chip.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.previewTop}>
            <Text style={[styles.previewKcal, preview === null && styles.faint]}>
              {preview === null ? "—" : formatKcal(preview.kcal)}
              <Text style={styles.previewUnit}> kcal</Text>
            </Text>
            {delta !== 0 && (
              <View style={styles.delta}>
                <Text style={styles.deltaText}>
                  {delta > 0 ? "+" : "−"}
                  {formatKcal(Math.abs(delta))} kcal
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.was}>
            Was {formatKcal(entry.kcal)} kcal at {gramsToText(entry.grams)} g
          </Text>
          <View style={styles.macros}>
            <Macro label="Protein" grams={preview?.proteinG} color={theme.colors.protein} empty={preview === null} styles={styles} theme={theme} />
            <Macro label="Carbs" grams={preview?.carbsG} color={theme.colors.carbs} empty={preview === null} styles={styles} theme={theme} />
            <Macro label="Fat" grams={preview?.fatG} color={theme.colors.fat} empty={preview === null} styles={styles} theme={theme} />
          </View>
        </View>
        {formError && (
          <Text style={[styles.hint, styles.hintErr]} accessibilityLiveRegion="polite">
            {formError}
          </Text>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: theme.space[4] + insets.bottom }]}>
        <Pressable
          onPress={() => void save()}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: saving }}
          style={[styles.primary, disabled && styles.primaryDisabled]}
        >
          <Text style={[styles.primaryLabel, disabled && styles.primaryLabelDisabled]}>
            {saving ? "Saving..." : "Save changes"}
          </Text>
        </Pressable>
      </View>
      {sheet === "delete" && (
        <DeleteEntrySheet
          entry={entry}
          dayLabel={dayText(entry.day, today)}
          totalAfter={dayKcal - entry.kcal}
          onDelete={onDelete}
          onDeleted={onLeave}
          onCancel={() => setSheet(null)}
        />
      )}
      {sheet === "discard" && <DiscardDialog changes={changes} onDiscard={onLeave} onKeep={() => setSheet(null)} />}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Macro({
  label,
  grams,
  color,
  empty,
  styles,
  theme,
}: {
  label: string;
  grams: number | null | undefined;
  color: string;
  empty: boolean;
  styles: Styles;
  theme: Theme;
}) {
  return (
    <View style={styles.macro}>
      <Text style={[styles.macroG, empty && styles.faint]}>{empty ? "—" : `${formatMacro(grams ?? null)} g`}</Text>
      <Text style={styles.macroName}>{label}</Text>
      <View style={[styles.macroLine, { backgroundColor: empty ? theme.colors.track : color }]} />
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    header: { height: 56, flexDirection: "row", alignItems: "center", gap: space[1], paddingHorizontal: space[2] },
    iconBtn: { width: tap, height: tap, borderRadius: tap / 2, alignItems: "center", justifyContent: "center" },
    h1: { flex: 1, color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
    content: { paddingHorizontal: space[4], paddingBottom: space[4], gap: space[4] },
    productName: { color: colors.text, fontSize: fontSize.lg, fontWeight: "600" },
    productMeta: { color: colors.muted, fontSize: fontSize.sm, marginTop: space[1] },
    labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    label: {
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: space[2],
    },
    newPill: { paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: colors.estimateSoft },
    newText: { color: colors.estimate, fontSize: fontSize.xs, fontWeight: "600" },
    chips: { flexDirection: "row", gap: space[2] },
    chip: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    chipLabel: { color: colors.muted, fontSize: fontSize.sm },
    chipLabelOn: { color: colors.accentText, fontWeight: "600" },
    when: { flexDirection: "row", gap: space[2] },
    field: {
      minHeight: tap,
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    dateField: { flex: 1 },
    timeField: { width: 120 },
    fieldChanged: { borderColor: colors.accent },
    fieldFocus: { borderColor: colors.accent },
    fieldError: { borderColor: colors.over },
    fieldValue: { flex: 1, color: colors.text, fontSize: fontSize.md },
    ring: { padding: 3, margin: -3, borderRadius: radius.sm + 3 },
    ringFocus: { backgroundColor: colors.accentSoft },
    ringError: { backgroundColor: colors.overSoft },
    input: { flex: 1, color: colors.text, fontSize: fontSize.md, padding: 0 },
    unit: { color: colors.muted, fontSize: fontSize.md },
    hint: { color: colors.muted, fontSize: fontSize.sm, marginTop: space[2] },
    hintMoved: { color: colors.accentText },
    hintErr: { color: colors.over },
    amountRow: { flexDirection: "row", gap: space[2], marginTop: space[2] },
    amountChip: { minHeight: 36 },
    card: {
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    previewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    previewKcal: { color: colors.text, fontSize: fontSize.xl, fontWeight: "700", fontVariant: ["tabular-nums"] },
    previewUnit: { color: colors.muted, fontSize: fontSize.sm, fontWeight: "400" },
    faint: { color: colors.faint },
    delta: { paddingVertical: space[1], paddingHorizontal: space[3], borderRadius: radius.pill, backgroundColor: colors.accentSoft },
    deltaText: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: "600" },
    was: { color: colors.muted, fontSize: fontSize.sm, marginTop: space[1] },
    macros: { flexDirection: "row", gap: space[3], marginTop: space[3] },
    macro: { flex: 1 },
    macroG: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    macroName: { color: colors.muted, fontSize: fontSize.sm },
    macroLine: { height: 3, borderRadius: 2, marginTop: space[1] },
    footer: {
      paddingTop: space[3],
      paddingHorizontal: space[4],
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    primary: { minHeight: tap, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.accent },
    primaryDisabled: { backgroundColor: colors.surface2 },
    primaryLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
    primaryLabelDisabled: { color: colors.faint },
  });
}
