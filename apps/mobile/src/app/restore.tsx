import { router, Stack } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import type { Backup } from "@/modules/backup/services/backupFile";
import {
  APP_SCHEMA_VERSION,
  currentCounts,
  latestSafetyCopy,
  pickBackupFile,
  readSafetyCopy,
  restoreBackup,
  SafetyCopyError,
  type PickedBackup,
} from "@/modules/backup/services/restoreBackup";
import { formatBackupTime, type BackupCounts } from "@/modules/backup/services/restoreFile";

type Step =
  | { step: "start"; error: string | null }
  | { step: "reading" }
  | { step: "preview"; backup: Backup; counts: BackupCounts; now: BackupCounts }
  | { step: "restoring" }
  | { step: "done"; counts: BackupCounts }
  | { step: "failed"; error: string };

const PICK_ERRORS: Record<"not_backup" | "newer" | "unreadable", string> = {
  not_backup: "This file isn't a backup from this app.",
  newer: "This backup is from a newer version of the app. Update the app first.",
  unreadable: "Couldn't read the file.",
};

const ROWS: { key: keyof BackupCounts; label: string }[] = [
  { key: "products", label: "Products" },
  { key: "entries", label: "Log entries" },
  { key: "weighIns", label: "Weigh-ins" },
  { key: "settings", label: "Settings" },
];

function safeLatestCopy() {
  try {
    return latestSafetyCopy();
  } catch {
    return null;
  }
}

export default function RestoreScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const db = useSQLiteContext();
  const [step, setStep] = useState<Step>({ step: "start", error: null });
  const [safetyCopy, setSafetyCopy] = useState(safeLatestCopy);
  const busy = step.step === "reading" || step.step === "restoring";

  // A restore can't be abandoned halfway; the transaction finishes either way.
  useEffect(() => {
    if (step.step !== "restoring") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [step.step]);

  const load = async (read: () => Promise<PickedBackup>) => {
    setStep({ step: "reading" });
    try {
      const picked = await read();
      if (picked.ok) {
        setStep({ step: "preview", backup: picked.backup, counts: picked.counts, now: await currentCounts(db) });
      } else if (picked.error === "cancelled") {
        setStep({ step: "start", error: null });
      } else {
        setStep({ step: "start", error: PICK_ERRORS[picked.error] });
      }
    } catch {
      setStep({ step: "start", error: PICK_ERRORS.unreadable });
    }
  };

  const replace = async (backup: Backup) => {
    setStep({ step: "restoring" });
    try {
      const counts = await restoreBackup(db, backup);
      setSafetyCopy(safeLatestCopy());
      setStep({ step: "done", counts });
    } catch (error) {
      setStep({
        step: "failed",
        error:
          error instanceof SafetyCopyError
            ? "Couldn't save a copy of your current data, so nothing was restored."
            : "Couldn't restore this backup. Nothing was changed.",
      });
    }
  };

  let body: ReactNode;
  if (step.step === "reading" || step.step === "restoring") {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={styles.message} accessibilityLiveRegion="polite">
          {step.step === "reading" ? "Reading the backup..." : "Restoring..."}
        </Text>
      </View>
    );
  } else if (step.step === "preview") {
    const older = step.backup.schemaVersion < APP_SCHEMA_VERSION;
    body = (
      <>
        <Text style={styles.section} accessibilityRole="header">
          Backup from {formatBackupTime(step.backup.exportedAt)}
        </Text>
        <View style={styles.card}>
          <View style={[styles.item, styles.tableHead]}>
            <Text style={[styles.cellLabel, styles.headText]}> </Text>
            <Text style={[styles.cell, styles.headText]}>In backup</Text>
            <Text style={[styles.cell, styles.headText]}>On this phone now</Text>
          </View>
          {ROWS.map((row) => (
            <View key={row.key} style={[styles.item, styles.divided]}>
              <Text style={styles.cellLabel}>{row.label}</Text>
              <Text style={styles.cell}>{step.counts[row.key]}</Text>
              <Text style={[styles.cell, styles.muted]}>{step.now[row.key]}</Text>
            </View>
          ))}
        </View>
        {older && <Text style={styles.note}>Made by an older version. It will be updated.</Text>}
        <Text style={styles.warning}>
          Replace my data swaps everything on this phone for the backup. A copy of your current data is kept so you can
          undo.
        </Text>
        <Pressable
          onPress={() => void replace(step.backup)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.btn, styles.danger, pressed && styles.pressed]}
        >
          <Text style={styles.dangerLabel}>Replace my data</Text>
        </Pressable>
        <Pressable
          onPress={() => setStep({ step: "start", error: null })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.btn, styles.ghost, pressed && styles.pressed]}
        >
          <Text style={styles.ghostLabel}>Cancel</Text>
        </Pressable>
      </>
    );
  } else if (step.step === "done") {
    const c = step.counts;
    body = (
      <>
        <Text style={styles.ok} accessibilityLiveRegion="polite">
          Restored {c.products} products, {c.entries} log entries, {c.weighIns} weigh-ins.
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.btn, styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryLabel}>Done</Text>
        </Pressable>
      </>
    );
  } else {
    const { error } = step;
    body = (
      <>
        <Text style={styles.note}>
          Restoring replaces everything on this phone with the backup. A copy of your current data is kept first, so
          you can undo.
        </Text>
        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <Pressable
          onPress={() => void load(pickBackupFile)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.btn, styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryLabel}>Choose backup file</Text>
        </Pressable>
        {safetyCopy && (
          <View style={styles.card}>
            <Pressable
              onPress={() => void load(() => readSafetyCopy(safetyCopy.file))}
              accessibilityRole="button"
              accessibilityLabel={`Undo last restore. Data from before the restore on ${formatBackupTime(safetyCopy.takenAt)}`}
              style={({ pressed }) => [styles.item, pressed && styles.pressedRow]}
            >
              <View style={styles.info}>
                <Text style={styles.name}>Undo last restore</Text>
                <Text style={styles.meta}>Data from before the restore on {formatBackupTime(safetyCopy.takenAt)}</Text>
              </View>
            </Pressable>
          </View>
        )}
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerBackVisible: !busy, gestureEnabled: !busy }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {body}
      </ScrollView>
    </>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: space[4], gap: space[3] },
    center: { alignItems: "center", gap: space[3], paddingVertical: space[6] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    section: {
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginHorizontal: space[1],
    },
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      minHeight: 56,
      paddingVertical: space[2],
      paddingHorizontal: space[4],
    },
    tableHead: { minHeight: 40 },
    headText: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "600" },
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
    cellLabel: { flex: 2, color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
    cell: { flex: 2, color: colors.text, fontSize: fontSize.md, textAlign: "right", fontVariant: ["tabular-nums"] },
    muted: { color: colors.muted },
    info: { flex: 1 },
    name: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
    meta: { color: colors.muted, fontSize: fontSize.sm },
    pressedRow: { backgroundColor: colors.surface2 },
    note: { color: colors.muted, fontSize: fontSize.sm },
    warning: { color: colors.text, fontSize: fontSize.sm },
    error: { color: colors.over, fontSize: fontSize.sm },
    ok: { color: colors.ok, fontSize: fontSize.md, fontWeight: "600" },
    btn: { minHeight: tap, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
    pressed: { opacity: 0.85 },
    primary: { backgroundColor: colors.accent },
    primaryLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
    ghost: { backgroundColor: colors.surface2 },
    ghostLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
    danger: { backgroundColor: colors.overSoft },
    dangerLabel: { color: colors.over, fontSize: fontSize.md, fontWeight: "700" },
  });
}
