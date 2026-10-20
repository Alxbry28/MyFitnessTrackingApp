import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { formatBytes } from "../services/backupFile";
import { exportBackup } from "../services/exportBackup";

type Notice = { kind: "ok" | "error"; text: string } | null;
type Styles = ReturnType<typeof makeStyles>;

// The "Your data" list card from prototypes/settings.html.
export function DataCard() {
  const styles = makeStyles(useTheme());
  const db = useSQLiteContext();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const runExport = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const s = await exportBackup(db);
      setNotice({
        kind: "ok",
        text: `Exported ${s.products} products, ${s.entries} log entries, ${s.weighIns} weigh-ins, ${s.settings} settings (${formatBytes(s.bytes)})`,
      });
    } catch {
      setNotice({ kind: "error", text: "Couldn't export the backup." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={styles.card}>
        <Item
          name="Export backup (JSON)"
          meta={busy ? "Exporting..." : "Contains food and health data. Keep it private."}
          onPress={() => void runExport()}
          disabled={busy}
          first
          styles={styles}
        />
        <Item
          name="Import weight history (CSV)"
          meta="From your scale app"
          onPress={() => router.push("/import-weight")}
          styles={styles}
        />
        <Item
          name="Restore from backup"
          meta="Replace data on this phone"
          onPress={() => router.push("/restore")}
          styles={styles}
        />
      </View>
      {notice && (
        <Text style={notice.kind === "ok" ? styles.ok : styles.error} accessibilityLiveRegion="polite">
          {notice.text}
        </Text>
      )}
    </>
  );
}

function Item({
  name,
  meta,
  onPress,
  disabled = false,
  first = false,
  styles,
}: {
  name: string;
  meta: string;
  onPress: () => void;
  disabled?: boolean;
  first?: boolean;
  styles: Styles;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${meta}`}
      accessibilityState={{ disabled, busy: disabled }}
      style={({ pressed }) => [styles.item, !first && styles.divided, pressed && styles.pressed]}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius } = theme;
  return StyleSheet.create({
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
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
    pressed: { backgroundColor: colors.surface2 },
    info: { flex: 1 },
    name: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
    meta: { color: colors.muted, fontSize: fontSize.sm },
    ok: { color: colors.ok, fontSize: fontSize.sm, paddingHorizontal: space[1] },
    error: { color: colors.over, fontSize: fontSize.sm, paddingHorizontal: space[1] },
  });
}
