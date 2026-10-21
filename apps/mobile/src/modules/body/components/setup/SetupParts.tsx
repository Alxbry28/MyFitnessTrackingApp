import { SymbolView } from "expo-symbols";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

// Building blocks for prototypes/onboarding.html; sizes and tokens follow its CSS.

export function StepHeader({ step, onBack }: { step: 1 | 2 | 3; onBack: () => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.steps}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={4} style={styles.back}>
        <SymbolView name={{ android: "arrow_back", web: "arrow_back" }} tintColor={theme.colors.muted} size={22} />
      </Pressable>
      <View style={styles.bars} accessibilityLabel={`Step ${step} of 3`}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[styles.bar, n <= step && styles.barOn]} />
        ))}
      </View>
      <Text style={styles.stepN}>{step} of 3</Text>
    </View>
  );
}

export function Title({ title, sub }: { title: string; sub?: string }) {
  const styles = makeStyles(useTheme());
  return (
    <View>
      <Text style={styles.h1} accessibilityRole="header">
        {title}
      </Text>
      {sub && <Text style={styles.titleSub}>{sub}</Text>}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  small = false,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  small?: boolean;
  label: string;
}) {
  const styles = makeStyles(useTheme());
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={[styles.segment, small && styles.segmentSmall, on && styles.segmentOn]}
          >
            <Text style={[styles.segmentLabel, small && styles.segmentLabelSmall, on && styles.segmentLabelOn]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  const styles = makeStyles(useTheme());
  return <Text style={styles.label}>{children}</Text>;
}

export function Helper({ children, error = false }: { children: ReactNode; error?: boolean }) {
  const styles = makeStyles(useTheme());
  return (
    <Text style={[styles.helper, error && styles.helperError]} accessibilityLiveRegion={error ? "polite" : "none"}>
      {children}
    </Text>
  );
}

export function NumberInput({
  value,
  onChange,
  unit,
  label,
  error,
  keyboardType = "decimal-pad",
}: {
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  label: string;
  error?: boolean;
  keyboardType?: KeyboardTypeOptions;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.ring, focused && styles.ringOn]}>
      <View style={[styles.input, focused && styles.inputFocus, error && styles.inputError]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType}
          accessibilityLabel={label}
          style={styles.inputText}
          placeholderTextColor={theme.colors.faint}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

// A tappable input-looking box, for the birth date picker.
export function PickerInput({
  text,
  unit,
  label,
  onPress,
  error,
}: {
  text: string;
  unit?: string;
  label: string;
  onPress: () => void;
  error?: boolean;
}) {
  const styles = makeStyles(useTheme());
  return (
    <View style={styles.ring}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${text}`}
        style={[styles.input, error && styles.inputError]}
      >
        <Text style={styles.inputText}>{text}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </Pressable>
    </View>
  );
}

export function OptionRow({
  name,
  meta,
  side,
  sideSub,
  selected,
  onPress,
}: {
  name: string;
  meta: string;
  side?: string;
  sideSub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = makeStyles(useTheme());
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[name, meta, side, sideSub].filter(Boolean).join(", ")}
      style={[styles.opt, selected && styles.optOn]}
    >
      <View style={[styles.radio, selected && styles.radioOn]} />
      <View style={styles.optInfo}>
        <Text style={styles.optName}>{name}</Text>
        <Text style={styles.optMeta}>{meta}</Text>
      </View>
      {side && (
        <View>
          <Text style={styles.optSide}>{side}</Text>
          {sideSub && <Text style={styles.optSideSub}>{sideSub}</Text>}
        </View>
      )}
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const styles = makeStyles(useTheme());
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.primary, (pressed || disabled) && styles.primaryDim]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = makeStyles(useTheme());
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.link}>
      <Text style={styles.linkLabel}>{label}</Text>
    </Pressable>
  );
}

export function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    steps: { flexDirection: "row", alignItems: "center", gap: space[3], paddingTop: space[2], paddingHorizontal: space[4] },
    back: { width: 40, height: 40, marginLeft: -space[2], alignItems: "center", justifyContent: "center" },
    bars: { flex: 1, flexDirection: "row", gap: space[1] },
    bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.track },
    barOn: { backgroundColor: colors.accent },
    stepN: { color: colors.muted, fontSize: fontSize.xs },
    h1: { color: colors.text, fontSize: fontSize.xl, fontWeight: "700", letterSpacing: -0.5, lineHeight: 32 },
    titleSub: { color: colors.muted, fontSize: fontSize.sm, lineHeight: 19, marginTop: space[2] },
    segmented: {
      flexDirection: "row",
      padding: 3,
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
    },
    segment: { flex: 1, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 6 },
    segmentSmall: { height: 30 },
    segmentOn: { backgroundColor: colors.surface, elevation: 1 },
    segmentLabel: { color: colors.muted, fontSize: fontSize.sm },
    segmentLabelSmall: { fontSize: fontSize.xs },
    segmentLabelOn: { color: colors.text, fontWeight: "600" },
    label: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "600", marginBottom: space[1] },
    helper: { color: colors.muted, fontSize: fontSize.xs, marginTop: space[1] },
    helperError: { color: colors.over },
    ring: { padding: 3, margin: -3, borderRadius: radius.sm + 3 },
    ringOn: { backgroundColor: colors.accentSoft },
    input: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: space[2],
      paddingHorizontal: space[4],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: colors.surface2,
    },
    inputFocus: { borderColor: colors.accent },
    inputError: { borderColor: colors.over },
    inputText: { flex: 1, color: colors.text, fontSize: fontSize.lg, fontWeight: "600", padding: 0 },
    unit: { color: colors.muted, fontSize: fontSize.sm },
    opt: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      minHeight: 64,
      padding: space[3],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    optOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.faint },
    radioOn: { borderWidth: 6, borderColor: colors.accent },
    optInfo: { flex: 1 },
    optName: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    optMeta: { color: colors.muted, fontSize: fontSize.sm },
    optSide: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600", textAlign: "right", fontVariant: ["tabular-nums"] },
    optSideSub: { color: colors.muted, fontSize: fontSize.xs, textAlign: "right" },
    primary: {
      height: tap,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: colors.accent,
    },
    primaryDim: { opacity: 0.85 },
    primaryLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
    link: { height: 40, alignItems: "center", justifyContent: "center" },
    linkLabel: { color: colors.muted, fontSize: fontSize.sm, fontWeight: "600" },
  });
}
