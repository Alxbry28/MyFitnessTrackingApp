import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { DataCard } from "@/modules/backup/components/DataCard";
import { useCalorieGoal } from "@/modules/nutrition/hooks/useCalorieGoal";
import { goalSchema, type GoalFormValues, type GoalInput } from "@/modules/nutrition/services/goalSchema";

export default function SettingsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { state, retry, save } = useCalorieGoal();

  let goalCard;
  if (state.status === "loading") {
    goalCard = <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading your goal" />;
  } else if (state.status === "error") {
    goalCard = (
      <View style={styles.center}>
        <Text style={styles.message}>{"Couldn't load your goal."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  } else {
    // Keyed on the saved goal so the form resets when a reload brings a new value.
    goalCard = <GoalForm key={String(state.goal)} goal={state.goal} onSave={save} styles={styles} theme={theme} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.section} accessibilityRole="header">
        Daily goal
      </Text>
      <View style={styles.card}>{goalCard}</View>
      <Text style={[styles.section, styles.sectionGap]} accessibilityRole="header">
        Your data
      </Text>
      <DataCard />
    </ScrollView>
  );
}

type GoalFormProps = {
  goal: number | null;
  onSave: (kcal: number) => Promise<void>;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
};

function GoalForm({ goal, onSave, styles, theme }: GoalFormProps) {
  const [notice, setNotice] = useState<{ kind: "saved" | "error"; text: string } | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<GoalFormValues, unknown, GoalInput>({
    defaultValues: { kcal: goal === null ? "" : String(goal) },
    resolver: zodResolver(goalSchema),
    shouldFocusError: true,
  });

  const submit = handleSubmit(async ({ kcal }) => {
    setNotice(null);
    try {
      await onSave(kcal);
      setNotice({ kind: "saved", text: "Saved" });
    } catch {
      setNotice({ kind: "error", text: "Couldn't save your goal. Try again." });
    }
  });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="kcal"
        render={({ field, fieldState }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Calories (kcal per day)</Text>
            <TextInput
              ref={field.ref}
              value={field.value}
              onChangeText={(text) => {
                setNotice(null);
                field.onChange(text);
              }}
              onBlur={field.onBlur}
              keyboardType="number-pad"
              placeholder="e.g. 2200"
              placeholderTextColor={theme.colors.faint}
              accessibilityLabel="Daily calorie goal in kcal"
              style={[styles.input, fieldState.error && styles.inputError]}
            />
            {fieldState.error?.message && <Text style={styles.error}>{fieldState.error.message}</Text>}
            <Text style={styles.helper}>
              Get a suggestion from your profile.{" "}
              <Text
                onPress={() => router.push({ pathname: "/setup", params: { from: "settings" } })}
                accessibilityRole="link"
                style={styles.helperLink}
              >
                Recalculate
              </Text>
            </Text>
          </View>
        )}
      />
      {notice && (
        <Text style={notice.kind === "saved" ? styles.saved : styles.error} accessibilityLiveRegion="polite">
          {notice.text}
        </Text>
      )}
      <Pressable
        onPress={() => void submit()}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting }}
        style={({ pressed }) => [styles.save, (pressed || isSubmitting) && styles.savePressed]}
      >
        <Text style={styles.saveLabel}>{isSubmitting ? "Saving..." : "Save goal"}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: space[4], gap: space[2] },
    section: {
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    sectionGap: { marginTop: space[4] },
    card: { padding: space[4], borderRadius: radius.md, backgroundColor: colors.surface },
    center: { alignItems: "center", gap: space[3] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    form: { gap: space[3] },
    field: { gap: space[1] },
    label: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "600" },
    input: {
      height: tap,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.surface2,
      backgroundColor: colors.surface2,
      paddingHorizontal: space[3],
      color: colors.text,
      fontSize: fontSize.lg,
      fontVariant: ["tabular-nums"],
    },
    inputError: { borderColor: colors.over },
    helper: { color: colors.muted, fontSize: fontSize.xs, marginTop: space[1] },
    helperLink: { color: colors.accentText, fontWeight: "600" },
    error: { color: colors.over, fontSize: fontSize.sm },
    saved: { color: colors.ok, fontSize: fontSize.sm, fontWeight: "600" },
    save: {
      minHeight: tap,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: colors.accent,
    },
    savePressed: { opacity: 0.85 },
    saveLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
    secondaryButton: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    secondaryLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  });
}
