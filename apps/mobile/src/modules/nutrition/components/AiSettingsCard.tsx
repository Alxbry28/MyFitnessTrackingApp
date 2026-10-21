import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import * as settingsRepo from "../repositories/settingsRepo";

export function AiSettingsCard() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<settingsRepo.AiProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "saved" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([settingsRepo.getAiApiKey(db), settingsRepo.getAiProvider(db)])
      .then(([key, prov]) => {
        if (active) {
          if (key) setApiKey(key);
          setProvider(prov);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [db]);

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await Promise.all([
        settingsRepo.setAiApiKey(db, apiKey.trim() || null),
        settingsRepo.setAiProvider(db, provider),
      ]);
      setNotice({ kind: "saved", text: "AI settings saved" });
    } catch {
      setNotice({ kind: "error", text: "Could not save AI settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      Alert.alert("Missing API Key", "Please paste an API key first.");
      return;
    }

    setTesting(true);
    try {
      if (provider === "gemini") {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Say OK" }] }],
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`API returned ${res.status}: ${errBody}`);
        }
        Alert.alert("Success", "Google Gemini connected successfully!");
      } else {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Say OK" }],
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`API returned ${res.status}: ${errBody}`);
        }
        Alert.alert("Success", "OpenAI connected successfully!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert("Connection Failed", msg);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Provider Selector Chips */}
      <Text style={styles.label}>AI Provider</Text>
      <View style={styles.providerRow}>
        <Pressable
          onPress={() => setProvider("gemini")}
          accessibilityRole="button"
          style={[styles.providerChip, provider === "gemini" && styles.providerChipActive]}
        >
          <Text
            style={[
              styles.providerText,
              provider === "gemini" && styles.providerTextActive,
            ]}
          >
            Google Gemini (Free)
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setProvider("openai")}
          accessibilityRole="button"
          style={[styles.providerChip, provider === "openai" && styles.providerChipActive]}
        >
          <Text
            style={[
              styles.providerText,
              provider === "openai" && styles.providerTextActive,
            ]}
          >
            OpenAI (ChatGPT)
          </Text>
        </Pressable>
      </View>

      {/* API Key Input */}
      <Text style={styles.label}>
        {provider === "gemini" ? "Gemini API Key" : "OpenAI API Key"}
      </Text>
      <TextInput
        value={apiKey}
        onChangeText={(text) => {
          setNotice(null);
          setApiKey(text);
        }}
        placeholder={
          provider === "gemini"
            ? "Paste your Gemini API key (AIza...)"
            : "Paste your OpenAI key (sk-...)"
        }
        placeholderTextColor={theme.colors.faint}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={styles.keyInput}
      />

      <Text style={styles.helpText}>
        {provider === "gemini"
          ? "Get a free Gemini API key from Google AI Studio (aistudio.google.com). Free tier includes 15 requests/minute with no credit card required."
          : "Requires an OpenAI platform account with an API secret key from platform.openai.com."}
      </Text>

      {notice && (
        <Text style={notice.kind === "saved" ? styles.savedNotice : styles.errorNotice}>
          {notice.text}
        </Text>
      )}

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          style={styles.saveBtn}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Key"}</Text>
        </Pressable>
        {apiKey.trim().length > 0 && (
          <Pressable
            onPress={handleTestConnection}
            disabled={testing}
            accessibilityRole="button"
            style={styles.testBtn}
          >
            <Text style={styles.testBtnText}>
              {testing ? "Testing..." : "Test Connection"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[4],
      gap: space[3],
    },
    centerBox: {
      padding: space[4],
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    providerRow: {
      flexDirection: "row",
      gap: space[2],
    },
    providerChip: {
      flex: 1,
      paddingVertical: space[2],
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    providerChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surface,
    },
    providerText: {
      fontSize: fontSize.xs,
      fontWeight: "600",
      color: colors.muted,
    },
    providerTextActive: {
      color: colors.accent,
    },
    keyInput: {
      minHeight: tap,
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      color: colors.text,
      fontSize: fontSize.sm,
      fontFamily: "monospace",
    },
    helpText: {
      fontSize: fontSize.xs,
      color: colors.muted,
      lineHeight: 16,
    },
    savedNotice: {
      fontSize: fontSize.xs,
      color: "#2e7d32",
      fontWeight: "600",
    },
    errorNotice: {
      fontSize: fontSize.xs,
      color: "#d32f2f",
      fontWeight: "600",
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      marginTop: space[1],
    },
    saveBtn: {
      backgroundColor: colors.accent,
      paddingVertical: space[2],
      paddingHorizontal: space[4],
      borderRadius: radius.sm,
      alignItems: "center",
    },
    saveBtnText: {
      color: colors.accentText,
      fontSize: fontSize.sm,
      fontWeight: "700",
    },
    testBtn: {
      paddingVertical: space[2],
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    testBtnText: {
      color: colors.text,
      fontSize: fontSize.sm,
      fontWeight: "600",
    },
  });
}
