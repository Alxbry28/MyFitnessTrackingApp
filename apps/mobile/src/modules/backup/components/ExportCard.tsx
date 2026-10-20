import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { formatBytes } from "../services/backupFile";
import { exportBackup } from "../services/exportBackup";

type Notice = { kind: "ok" | "error"; text: string } | null;

export function ExportCard() {
  const styles = makeStyles(useTheme());
  const db = useSQLiteContext();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const run = async () => {
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
    <View style={styles.card}>
      <Text style={styles.body}>Backups contain your food and health data. Keep the file private.</Text>
      <Pressable
        onPress={() => void run()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        style={({ pressed }) => [styles.button, (pressed || busy) && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>{busy ? "Exporting..." : "Export backup (JSON)"}</Text>
      </Pressable>
      {notice && (
        <Text style={notice.kind === "ok" ? styles.ok : styles.error} accessibilityLiveRegion="polite">
          {notice.text}
        </Text>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    card: { padding: space[4], gap: space[3], borderRadius: radius.md, backgroundColor: colors.surface },
    body: { color: colors.muted, fontSize: fontSize.sm },
    button: {
      minHeight: tap,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    pressed: { opacity: 0.85 },
    buttonLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    ok: { color: colors.ok, fontSize: fontSize.sm },
    error: { color: colors.over, fontSize: fontSize.sm },
  });
}
