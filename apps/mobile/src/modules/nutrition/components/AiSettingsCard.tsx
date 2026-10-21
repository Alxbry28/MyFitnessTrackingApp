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
import { testAiConnection } from "../services/aiMealParser";

const PROVIDER_OPTIONS: { id: settingsRepo.AiProvider; label: string }[] = [
  { id: "gemini", label: "Gemini (Free)" },
  { id: "openai", label: "OpenAI" },
  { id: "custom", label: "Custom / OpenRouter" },
];

export function AiSettingsCard() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<settingsRepo.AiProvider>("gemini");
  const [model, setModel] = useState(settingsRepo.DEFAULT_AI_MODELS.gemini);
  const [baseUrl, setBaseUrl] = useState(settingsRepo.DEFAULT_CUSTOM_BASE_URL);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "saved" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    settingsRepo
      .getAiConfig(db)
      .then((cfg) => {
        if (active) {
          setProvider(cfg.provider);
          setModel(cfg.model);
          setBaseUrl(cfg.baseUrl);
          if (cfg.apiKey) setApiKey(cfg.apiKey);
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

  const handleSelectProvider = (nextProvider: settingsRepo.AiProvider) => {
    setNotice(null);
    const prevPresets = settingsRepo.AI_MODEL_PRESETS[provider];
    const isUsingPresetOrDefault =
      !model.trim() ||
      model.trim() === settingsRepo.DEFAULT_AI_MODELS[provider] ||
      prevPresets.includes(model.trim());
    setProvider(nextProvider);
    if (isUsingPresetOrDefault) {
      setModel(settingsRepo.DEFAULT_AI_MODELS[nextProvider]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const resolvedModel = model.trim() || settingsRepo.DEFAULT_AI_MODELS[provider];
      const resolvedBaseUrl = baseUrl.trim() || settingsRepo.DEFAULT_CUSTOM_BASE_URL;
      await Promise.all([
        settingsRepo.setAiProvider(db, provider),
        settingsRepo.setAiModel(db, resolvedModel),
        settingsRepo.setAiBaseUrl(db, resolvedBaseUrl),
        settingsRepo.setAiApiKey(db, apiKey.trim() || null),
      ]);
      setModel(resolvedModel);
      setBaseUrl(resolvedBaseUrl);
      setNotice({ kind: "saved", text: `Saved (${provider} · ${resolvedModel})` });
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
      const testedModel = await testAiConnection({
        provider,
        apiKey,
        model,
        baseUrl,
      });
      Alert.alert("Success", `Connected to ${testedModel} successfully!`);
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

  const presets = settingsRepo.AI_MODEL_PRESETS[provider];

  return (
    <View style={styles.card}>
      {/* Provider Selector Chips */}
      <Text style={styles.label}>AI Provider</Text>
      <View style={styles.providerRow}>
        {PROVIDER_OPTIONS.map((opt) => {
          const active = provider === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => handleSelectProvider(opt.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.providerChip, active && styles.providerChipActive]}
            >
              <Text style={[styles.providerText, active && styles.providerTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Model Input + Quick Presets */}
      <Text style={styles.label}>AI Model (customizable)</Text>
      <TextInput
        value={model}
        onChangeText={(text) => {
          setNotice(null);
          setModel(text);
        }}
        placeholder={`e.g. ${settingsRepo.DEFAULT_AI_MODELS[provider]}`}
        placeholderTextColor={theme.colors.faint}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="AI model name"
        style={styles.keyInput}
      />
      <View style={styles.presetRow}>
        {presets.map((preset) => {
          const selected = model.trim() === preset;
          return (
            <Pressable
              key={preset}
              onPress={() => {
                setNotice(null);
                setModel(preset);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Use model ${preset}`}
              style={[styles.presetChip, selected && styles.presetChipActive]}
            >
              <Text style={[styles.presetText, selected && styles.presetTextActive]}>
                {preset}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Custom Base URL (when Custom / OpenRouter is selected) */}
      {provider === "custom" && (
        <>
          <Text style={styles.label}>OpenAI-Compatible Base URL</Text>
          <TextInput
            value={baseUrl}
            onChangeText={(text) => {
              setNotice(null);
              setBaseUrl(text);
            }}
            placeholder={settingsRepo.DEFAULT_CUSTOM_BASE_URL}
            placeholderTextColor={theme.colors.faint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel="OpenAI-compatible base URL"
            style={styles.keyInput}
          />
          <Text style={styles.helpText}>
            Works with OpenRouter, Groq (https://api.groq.com/openai/v1), DeepSeek
            (https://api.deepseek.com/v1), or any OpenAI-compatible endpoint.
          </Text>
        </>
      )}

      {/* API Key Input */}
      <Text style={styles.label}>
        {provider === "gemini"
          ? "Gemini API Key"
          : provider === "openai"
            ? "OpenAI API Key"
            : "Provider API Key"}
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
            : "Paste your API key (sk-...)"
        }
        placeholderTextColor={theme.colors.faint}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        accessibilityLabel="AI API key"
        style={styles.keyInput}
      />

      <Text style={styles.helpText}>
        {provider === "gemini"
          ? "Get a free Gemini API key from Google AI Studio (aistudio.google.com). Stored only on this phone and excluded from JSON backup exports."
          : provider === "openai"
            ? "Uses your OpenAI platform key (platform.openai.com). Stored only on this phone and excluded from JSON backup exports."
            : "Your key is stored only on this phone and excluded from JSON backup exports."}
      </Text>

      {notice && (
        <Text
          style={notice.kind === "saved" ? styles.savedNotice : styles.errorNotice}
          accessibilityLiveRegion="polite"
        >
          {notice.text}
        </Text>
      )}

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => void handleSave()}
          disabled={saving}
          accessibilityRole="button"
          style={styles.saveBtn}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save AI Settings"}</Text>
        </Pressable>
        {apiKey.trim().length > 0 && (
          <Pressable
            onPress={() => void handleTestConnection()}
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
      flexWrap: "wrap",
      gap: space[2],
    },
    providerChip: {
      flexGrow: 1,
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
    presetRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: space[1],
    },
    presetChip: {
      paddingVertical: 4,
      paddingHorizontal: space[2],
      borderRadius: radius.pill,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    presetChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    presetText: {
      fontSize: fontSize.xs,
      color: colors.muted,
      fontFamily: "monospace",
    },
    presetTextActive: {
      color: colors.accentText,
      fontWeight: "700",
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
      color: colors.ok,
      fontWeight: "600",
    },
    errorNotice: {
      fontSize: fontSize.xs,
      color: colors.over,
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
      color: colors.accentInk,
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
