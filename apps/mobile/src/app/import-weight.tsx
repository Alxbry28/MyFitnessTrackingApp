import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { useWeightImport } from "@/modules/body/hooks/useWeightImport";
import { formatKg } from "@/modules/body/services/weightCalc";
import { dayKey, formatDayLabel } from "@/modules/nutrition/services/mealTime";

const REVIEW_SHOWN = 5;

function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ImportWeightScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { phase, preview, error, notice, lastRun, choose, cancel, confirm, undo } = useWeightImport();
  const busy = phase === "busy";
  const today = dayKey(new Date());

  const confirmUndo = () => {
    if (!lastRun) return;
    Alert.alert("Undo this import?", `This removes the ${lastRun.added} weigh-ins it added.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Undo import", style: "destructive", onPress: () => void undo() },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.body}>
        Bring in your weight history from your scale app&apos;s CSV export (Zepp Life, Mi Fitness or similar). The
        file needs a time or date column and a weight column.
      </Text>

      {!preview && (
        <Pressable
          onPress={() => void choose()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          style={({ pressed }) => [styles.primary, (pressed || busy) && styles.pressed]}
        >
          <Text style={styles.primaryLabel}>{busy ? "Working..." : "Choose CSV file"}</Text>
        </Pressable>
      )}

      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      {notice && (
        <Text style={styles.saved} accessibilityLiveRegion="polite">
          {notice}
        </Text>
      )}

      {preview && (
        <View style={styles.card}>
          <Text style={styles.fileName}>{preview.fileName}</Text>
          <Text style={styles.meta}>
            {preview.plan.from && preview.plan.to
              ? `${formatDayLabel(preview.plan.from, today)} to ${formatDayLabel(preview.plan.to, today)} · `
              : ""}
            {preview.plan.found} readings
          </Text>
          <View style={styles.counts}>
            <Text style={styles.count}>{preview.plan.toAdd.length} new</Text>
            <Text style={styles.countMuted}>{preview.plan.duplicates} already in app</Text>
            {preview.plan.review.length > 0 && (
              <Text style={styles.countMuted}>{preview.plan.review.length} to review</Text>
            )}
            {preview.unreadable > 0 && (
              <Text style={styles.countMuted}>{preview.unreadable} rows couldn&apos;t be read</Text>
            )}
          </View>
          {preview.plan.review.length > 0 && (
            <View style={styles.review}>
              <Text style={styles.label}>Not imported: more than 5 kg off your usual weight</Text>
              {preview.plan.review.slice(0, REVIEW_SHOWN).map((r) => (
                <Text key={r.measuredAt} style={styles.meta}>
                  {formatDayLabel(r.day, today)} · {timeOf(r.measuredAt)} · {formatKg(r.weightKg)} kg
                </Text>
              ))}
              {preview.plan.review.length > REVIEW_SHOWN && (
                <Text style={styles.meta}>and {preview.plan.review.length - REVIEW_SHOWN} more</Text>
              )}
            </View>
          )}
          <Text style={styles.note}>
            Nothing is saved until you import. Weights you typed yourself are never replaced. You can undo this
            import later.
          </Text>
          <View style={styles.actions}>
            <Pressable onPress={cancel} disabled={busy} accessibilityRole="button" style={styles.secondary}>
              <Text style={styles.secondaryLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => void confirm()}
              disabled={busy || preview.plan.toAdd.length === 0}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || preview.plan.toAdd.length === 0 }}
              style={({ pressed }) => [
                styles.primary,
                styles.flex,
                (pressed || busy || preview.plan.toAdd.length === 0) && styles.pressed,
              ]}
            >
              <Text style={styles.primaryLabel}>{busy ? "Importing..." : `Import ${preview.plan.toAdd.length}`}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {lastRun && (
        <View style={[styles.card, styles.lastRun]}>
          <Text style={[styles.meta, styles.flex]}>
            Last import {formatDayLabel(dayKey(new Date(lastRun.startedAt)), today)}: {lastRun.added} weigh-ins
          </Text>
          <Pressable onPress={confirmUndo} disabled={busy} accessibilityRole="button" style={styles.undo}>
            <Text style={styles.undoLabel}>Undo import</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: space[4], gap: space[4] },
    body: { color: colors.muted, fontSize: fontSize.md },
    card: { padding: space[4], borderRadius: radius.md, backgroundColor: colors.surface, gap: space[2] },
    fileName: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    meta: { color: colors.muted, fontSize: fontSize.sm },
    counts: { gap: space[1], marginVertical: space[1] },
    count: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
    countMuted: { color: colors.muted, fontSize: fontSize.md },
    review: { gap: space[1], paddingTop: space[2], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    label: { color: colors.estimate, fontSize: fontSize.sm, fontWeight: "600" },
    note: { color: colors.faint, fontSize: fontSize.sm },
    actions: { flexDirection: "row", gap: space[2], marginTop: space[2] },
    flex: { flex: 1 },
    primary: {
      minHeight: tap,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.accent,
    },
    pressed: { opacity: 0.6 },
    primaryLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
    secondary: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    secondaryLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    error: { color: colors.over, fontSize: fontSize.sm },
    saved: { color: colors.ok, fontSize: fontSize.sm, fontWeight: "600" },
    lastRun: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    undo: { minHeight: tap, justifyContent: "center", paddingLeft: space[3] },
    undoLabel: { color: colors.over, fontSize: fontSize.md, fontWeight: "600" },
  });
}
