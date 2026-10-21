import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { gramsToText } from "../services/entrySchema";
import { MEAL_LABELS } from "../services/mealTime";
import { formatKcal } from "../services/nutritionCalc";
import type { FoodLogEntry } from "../types/foodLog";

type Props = {
  entry: FoodLogEntry;
  dayLabel: string;
  totalAfter: number;
  onDelete: () => Promise<boolean>;
  onDeleted: () => void;
  onCancel: () => void;
};

// prototypes/entry-edit.html frame 3.
export function DeleteEntrySheet({ entry, dayLabel, totalAfter, onDelete, onDeleted, onCancel }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (await onDelete()) onDeleted();
      else setError("This entry was already deleted.");
    } catch {
      setError("Couldn't delete the entry. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel" />
        <View style={[styles.sheet, { paddingBottom: theme.space[5] + insets.bottom }]}>
          <View style={styles.grab} />
          <Text style={styles.h2} accessibilityRole="header">
            Delete this entry?
          </Text>
          <View style={styles.summary}>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryName}>{entry.productName}</Text>
              <Text style={styles.summaryMeta}>
                {MEAL_LABELS[entry.mealType]} · {dayLabel} · {gramsToText(entry.grams)} g
              </Text>
            </View>
            <Text style={styles.summaryKcal}>{formatKcal(entry.kcal)} kcal</Text>
          </View>
          <Text style={styles.p}>
            Your day total drops to {formatKcal(Math.max(0, totalAfter))} kcal. The product stays in your library.
          </Text>
          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
          <Pressable
            onPress={() => void confirm()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, busy }}
            style={[styles.btn, styles.danger]}
          >
            <Text style={styles.dangerLabel}>{busy ? "Deleting..." : "Delete entry"}</Text>
          </Pressable>
          <Pressable onPress={onCancel} accessibilityRole="button" style={[styles.btn, styles.ghost]}>
            <Text style={styles.ghostLabel}>Cancel</Text>
          </Pressable>
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
      paddingTop: space[3],
      paddingHorizontal: space[4],
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    grab: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, marginBottom: space[2], backgroundColor: colors.border },
    h2: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
    summary: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: space[3],
      padding: space[3],
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
    },
    summaryInfo: { flex: 1 },
    summaryName: { color: colors.text, fontSize: fontSize.md },
    summaryMeta: { color: colors.muted, fontSize: fontSize.sm },
    summaryKcal: { color: colors.text, fontSize: fontSize.md, fontWeight: "700", fontVariant: ["tabular-nums"] },
    p: { color: colors.muted, fontSize: fontSize.md, lineHeight: 22 },
    error: { color: colors.over, fontSize: fontSize.sm },
    btn: { minHeight: tap, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
    danger: { backgroundColor: colors.over },
    dangerLabel: { color: colors.bg, fontSize: fontSize.md, fontWeight: "700" },
    ghost: { backgroundColor: colors.surface2 },
    ghostLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  });
}
