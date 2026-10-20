import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { useBodyProfile } from "@/modules/body/hooks/useBodyProfile";
import { profileSchema, type ProfileFormValues, type ProfileInput } from "@/modules/body/services/profileSchema";
import { BMI_SCALE_LABELS } from "@/modules/body/services/weightCalc";
import { BMI_SCALES, type BodyProfile } from "@/modules/body/types/body";

export default function BodyProfileScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { state, retry, save } = useBodyProfile();

  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading body profile" />
      </View>
    );
  }
  if (state.status === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{"Couldn't load your body profile."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  return <ProfileForm profile={state.profile} onSave={save} styles={styles} theme={theme} />;
}

type FormProps = {
  profile: BodyProfile;
  onSave: (input: ProfileInput) => Promise<void>;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
};

function ProfileForm({ profile, onSave, styles, theme }: FormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileFormValues, unknown, ProfileInput>({
    defaultValues: {
      heightCm: profile.heightCm === null ? "" : String(profile.heightCm),
      bmiScale: profile.bmiScale,
    },
    resolver: zodResolver(profileSchema),
    shouldFocusError: true,
  });

  const submit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      await onSave(input);
      router.back();
    } catch {
      setFormError("Couldn't save your profile. Try again.");
    }
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Controller
        control={control}
        name="heightCm"
        render={({ field, fieldState }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              ref={field.ref}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              keyboardType="decimal-pad"
              placeholder="e.g. 170"
              placeholderTextColor={theme.colors.faint}
              accessibilityLabel="Height in cm"
              style={[styles.input, fieldState.error && styles.inputError]}
            />
            {fieldState.error?.message && <Text style={styles.error}>{fieldState.error.message}</Text>}
          </View>
        )}
      />
      <Controller
        control={control}
        name="bmiScale"
        render={({ field }) => (
          <View style={styles.field}>
            <Text style={styles.label}>BMI scale</Text>
            <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel="BMI scale">
              {BMI_SCALES.map((scale) => {
                const selected = field.value === scale;
                return (
                  <Pressable
                    key={scale}
                    onPress={() => field.onChange(scale)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {BMI_SCALE_LABELS[scale]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>
              Asia-Pacific uses lower cutoffs (normal under 23) and is common in the Philippines. WHO uses normal
              under 25.
            </Text>
          </View>
        )}
      />
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
        <Text style={styles.saveLabel}>{isSubmitting ? "Saving..." : "Save"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: space[4], gap: space[4] },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4], backgroundColor: colors.bg },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
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
    error: { color: colors.over, fontSize: fontSize.sm },
    options: { flexDirection: "row", gap: space[2] },
    option: {
      flex: 1,
      minHeight: tap,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    optionSelected: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent },
    optionLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    optionLabelSelected: { color: colors.accentText },
    hint: { color: colors.faint, fontSize: fontSize.sm },
    save: {
      minHeight: tap,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: colors.accent,
    },
    pressed: { opacity: 0.85 },
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
