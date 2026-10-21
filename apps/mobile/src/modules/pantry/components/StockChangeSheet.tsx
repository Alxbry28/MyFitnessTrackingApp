import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { gramsToText } from "@/modules/nutrition/services/entrySchema";

import { ADJUST_MIN_CHANGE, checkAdjust, checkRemove, transitionText } from "../services/pantryStock";
import { REMOVE_REASONS, type RemoveReason } from "../types/pantry";

export type SheetMode = "remove" | "adjust";

const REASON_LABELS: Record<RemoveReason, string> = { shared: "Shared", discarded: "Discarded", spilled: "Spilled" };

type Props = {
  name: string;
  gramsLeft: number;
  initialMode: SheetMode;
  onRemove: (reason: RemoveReason, grams: number) => Promise<void>;
  onAdjust: (actualGrams: number) => Promise<void>;
  onClose: () => void;
};

// Built to prototypes/pantry.html frame 4: take stock out without eating it, or set it to the real amount.
export function StockChangeSheet({ name, gramsLeft, initialMode, onRemove, onAdjust, onClose }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<SheetMode>(initialMode);
  const [reason, setReason] = useState<RemoveReason>("shared");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Blocks a second tap that lands before the disabled button re-renders.
  const savingRef = useRef(false);

  const isRemove = mode === "remove";
  const check = isRemove ? checkRemove(text, gramsLeft) : checkAdjust(text);
  const after = check.ok ? (isRemove ? gramsLeft - check.grams : check.grams) : gramsLeft;
  const noChange = !isRemove && check.ok && Math.abs(check.grams - gramsLeft) < ADJUST_MIN_CHANGE;
  const disabled = !check.ok || noChange || saving;
  const amount = check.ok ? gramsToText(check.grams) : "";
  const action = isRemove ? (check.ok ? `Remove ${amount} g` : "Remove") : check.ok ? `Set to ${amount} g` : "Set amount";

  const switchMode = (next: SheetMode) => {
    setMode(next);
    setText("");
    setError(null);
  };

  const confirm = async () => {
    if (disabled || !check.ok || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      if (isRemove) await onRemove(reason, check.grams);
      else await onAdjust(check.grams);
      onClose();
    } catch {
      setError("Couldn't save. Nothing was changed.");
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel" />
        <View style={[styles.sheet, { paddingBottom: theme.space[5] + insets.bottom }]}>
          <View style={styles.grabber} />
          <View style={styles.seg} accessibilityRole="tablist">
            {(["remove", "adjust"] as const).map((m) => {
              const on = m === mode;
              const locked = m === "remove" && gramsLeft <= ADJUST_MIN_CHANGE;
              return (
                <Pressable
                  key={m}
                  onPress={() => switchMode(m)}
                  disabled={locked}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on, disabled: locked }}
                  style={[styles.segItem, on && styles.segOn]}
                >
                  <Text style={[styles.segLabel, on && styles.segLabelOn, locked && styles.faint]}>
                    {m === "remove" ? "Remove" : "Adjust to actual"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isRemove && (
            <>
              <Text style={styles.sectionLabel}>Reason</Text>
              <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Reason">
                {REMOVE_REASONS.map((r) => {
                  const on = r === reason;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setReason(r)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      hitSlop={{ top: 8, bottom: 8 }}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{REASON_LABELS[r]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View>
            <View style={styles.field}>
              <Text style={styles.lbl}>{isRemove ? "Amount" : "Actual amount"}</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  keyboardType="decimal-pad"
                  placeholder="g"
                  placeholderTextColor={theme.colors.faint}
                  autoFocus
                  accessibilityLabel={isRemove ? "Amount to remove in grams" : "Actual amount in grams"}
                  style={styles.input}
                />
                <Text style={styles.unit}>g</Text>
              </View>
            </View>
            {!check.ok && check.error && (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {check.error}
              </Text>
            )}
          </View>

          <View style={styles.result} accessible accessibilityLabel={`${name}: ${transitionText(gramsLeft, after)}`}>
            <Text style={styles.resultName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.resultValue}>{transitionText(gramsLeft, after)}</Text>
          </View>

          <Text style={styles.note}>
            {isRemove
              ? "Not counted as eaten, so no calories are added."
              : "Sets the amount to what's really there. The difference is saved as an adjustment, not as eaten."}
          </Text>
          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <View style={styles.btnRow}>
            <Pressable onPress={onClose} accessibilityRole="button" style={[styles.btn, styles.ghost]}>
              <Text style={styles.ghostLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => void confirm()}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ disabled, busy: saving }}
              style={[styles.btn, styles.primary, disabled && styles.disabled]}
            >
              <Text style={styles.primaryLabel}>{saving ? "Saving..." : action}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end" },
    scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
    sheet: {
      gap: space[3],
      paddingTop: space[2],
      paddingHorizontal: space[4],
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderTopWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, marginBottom: space[1], backgroundColor: colors.faint },
    // pantry.html .seg: a surface2 track with 3 dp padding; the selected half is surface 600.
    seg: { flexDirection: "row", padding: 3, borderRadius: radius.md, backgroundColor: colors.surface2 },
    segItem: { flex: 1, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 9 },
    segOn: { backgroundColor: colors.surface },
    segLabel: { color: colors.muted, fontSize: fontSize.sm },
    segLabelOn: { color: colors.text, fontWeight: "600" },
    faint: { color: colors.faint },
    sectionLabel: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.7 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
    chip: { height: 32, justifyContent: "center", paddingHorizontal: space[3], borderRadius: radius.pill, backgroundColor: colors.surface2 },
    chipOn: { backgroundColor: colors.accentSoft },
    chipLabel: { color: colors.muted, fontSize: fontSize.sm },
    chipLabelOn: { color: colors.accentText, fontWeight: "600" },
    field: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: space[3],
      minHeight: 48,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    lbl: { color: colors.muted, fontSize: fontSize.sm },
    inputWrap: { flexDirection: "row", alignItems: "center", gap: space[2] },
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
    unit: { color: colors.muted, fontSize: fontSize.sm },
    error: { color: colors.over, fontSize: fontSize.sm, marginTop: space[1] },
    result: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: space[3],
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    resultName: { flex: 1, color: colors.text, fontSize: fontSize.sm },
    resultValue: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", fontVariant: ["tabular-nums"] },
    note: { color: colors.muted, fontSize: fontSize.xs, lineHeight: 16 },
    btnRow: { flexDirection: "row", gap: space[2] },
    btn: { flex: 1, height: tap, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
    ghost: { borderWidth: 1, borderColor: colors.border },
    ghostLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
    primary: { backgroundColor: colors.accent },
    disabled: { opacity: 0.4 },
    primaryLabel: { color: colors.accentInk, fontSize: fontSize.sm, fontWeight: "600" },
  });
}
