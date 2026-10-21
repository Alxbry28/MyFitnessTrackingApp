import { zodResolver } from "@hookform/resolvers/zod";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { dayFromKey, dayKey, formatDayLabel } from "@/modules/nutrition/services/mealTime";

import type { ChangeResult } from "../repositories/weightRepo";
import { formatKg } from "../services/weightCalc";
import { kgToText, weightSchema, type WeightFormValues, type WeightInput } from "../services/weightSchema";
import type { WeighIn } from "../types/body";

type Props = {
  initialKg: number | null;
  initialDay: string;
  yesterdayKg: number | null;
  averageKg: number | null;
  manualOnDay: (day: string) => Promise<WeighIn | null>;
  onSave: (day: string, weightKg: number) => Promise<ChangeResult>;
  onDelete?: () => Promise<void>;
  onDone: () => void;
};

const STEP = 0.1;

function parseKg(text: string): number | null {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(value) && value > 0 ? value : null;
}

// Shared by new and edit: weight with a 0.1 kg stepper, the day, and hints.
export function WeightForm({
  initialKg,
  initialDay,
  yesterdayKg,
  averageKg,
  manualOnDay,
  onSave,
  onDelete,
  onDone,
}: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const today = dayKey(new Date());
  const [day, setDay] = useState(initialDay);
  const [replaces, setReplaces] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<WeightFormValues, unknown, WeightInput>({
    defaultValues: { weightKg: initialKg === null ? "" : kgToText(initialKg) },
    resolver: zodResolver(weightSchema),
    shouldFocusError: true,
  });
  const kg = parseKg(useWatch({ control, name: "weightKg" }));

  useEffect(() => {
    let active = true;
    manualOnDay(day)
      .then((other) => {
        if (active) setReplaces(other?.weightKg ?? null);
      })
      .catch(() => {
        if (active) setReplaces(null);
      });
    return () => {
      active = false;
    };
  }, [day, manualOnDay]);

  const step = (delta: number) => {
    const base = kg ?? initialKg ?? 70;
    const next = Math.min(300, Math.max(20, Math.round((base + delta) * 10) / 10));
    setValue("weightKg", kgToText(next), { shouldValidate: true });
  };

  const openPicker = () =>
    DateTimePickerAndroid.open({
      value: dayFromKey(day),
      mode: "date",
      maximumDate: dayFromKey(today),
      onValueChange: (_event, date) => {
        setDay(dayKey(date));
      },
    });

  const submit = handleSubmit(async ({ weightKg }) => {
    setFormError(null);
    try {
      const result = await onSave(day, weightKg);
      if (result.ok) onDone();
      else setFormError("This weigh-in was deleted, so it couldn't be saved.");
    } catch {
      setFormError("Couldn't save your weight. Try again.");
    }
  });

  const confirmDelete = () => {
    if (!onDelete) return;
    Alert.alert("Delete this weigh-in?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onDelete()
            .then(onDone)
            .catch(() => setFormError("Couldn't delete. Try again."));
        },
      },
    ]);
  };

  const hints = [
    yesterdayKg !== null ? `Yesterday ${formatKg(yesterdayKg)}` : null,
    averageKg !== null ? `7-day average ${formatKg(averageKg)}` : null,
  ].filter(Boolean);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`Day: ${formatDayLabel(day, today)}. Pick a date`}
        style={styles.dayRow}
      >
        <Text style={styles.label}>Day</Text>
        <Text style={styles.dayValue}>{formatDayLabel(day, today)} ›</Text>
      </Pressable>

      <Controller
        control={control}
        name="weightKg"
        render={({ field, fieldState }) => (
          <View style={styles.field}>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => step(-STEP)}
                accessibilityRole="button"
                accessibilityLabel="Decrease by 0.1 kg"
                style={styles.stepButton}
              >
                <Text style={styles.stepGlyph}>−</Text>
              </Pressable>
              <View style={styles.valueBox}>
                <TextInput
                  ref={field.ref}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor={theme.colors.faint}
                  accessibilityLabel="Weight in kg"
                  style={[styles.input, fieldState.error && styles.inputError]}
                />
                <Text style={styles.unit}>kg</Text>
              </View>
              <Pressable
                onPress={() => step(STEP)}
                accessibilityRole="button"
                accessibilityLabel="Increase by 0.1 kg"
                style={styles.stepButton}
              >
                <Text style={styles.stepGlyph}>+</Text>
              </Pressable>
            </View>
            {fieldState.error?.message && <Text style={styles.error}>{fieldState.error.message}</Text>}
          </View>
        )}
      />

      {hints.length > 0 && <Text style={styles.hint}>{hints.join(" · ")}</Text>}
      {replaces !== null && (
        <Text style={styles.hint}>Replaces the {formatKg(replaces)} kg you logged for this day.</Text>
      )}
      <Text style={styles.tip}>
        Weigh in the morning, after the bathroom, before eating. Weight changes 0.5 to 1.5 kg a day from water
        and food, so watch the 7-day average.
      </Text>

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
        style={({ pressed }) => [styles.save, (pressed || isSubmitting) && styles.pressed]}
      >
        <Text style={styles.saveLabel}>
          {isSubmitting ? "Saving..." : kg !== null ? `Save ${formatKg(kg)} kg` : "Save"}
        </Text>
      </Pressable>
      {onDelete && (
        <Pressable onPress={confirmDelete} accessibilityRole="button" style={styles.delete}>
          <Text style={styles.deleteLabel}>Delete weigh-in</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: space[4], gap: space[4] },
    dayRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: tap,
      paddingHorizontal: space[4],
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    label: { color: colors.muted, fontSize: fontSize.sm, fontWeight: "600" },
    dayValue: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    field: { gap: space[1] },
    stepper: { flexDirection: "row", alignItems: "center", gap: space[3] },
    stepButton: {
      width: tap,
      height: tap,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.pill,
      backgroundColor: colors.surface2,
    },
    stepGlyph: { color: colors.text, fontSize: fontSize.xl },
    valueBox: { flex: 1, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: space[1] },
    input: {
      minWidth: 120,
      textAlign: "center",
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.surface2,
      backgroundColor: colors.surface2,
      paddingHorizontal: space[3],
      color: colors.text,
      fontSize: fontSize.num,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    inputError: { borderColor: colors.over },
    unit: { color: colors.muted, fontSize: fontSize.md },
    hint: { color: colors.muted, fontSize: fontSize.sm, textAlign: "center" },
    tip: { color: colors.faint, fontSize: fontSize.sm },
    error: { color: colors.over, fontSize: fontSize.sm, textAlign: "center" },
    save: {
      minHeight: tap,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: colors.accent,
    },
    pressed: { opacity: 0.85 },
    saveLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
    delete: { alignSelf: "center", minHeight: tap, justifyContent: "center", paddingHorizontal: space[4] },
    deleteLabel: { color: colors.over, fontSize: fontSize.md, fontWeight: "600" },
  });
}
