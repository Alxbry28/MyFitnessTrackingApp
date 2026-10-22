import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import * as settingsRepo from "../repositories/settingsRepo";
import {
  fetchAvailableAiModels,
  testAiConnection,
  type AvailableAiModel,
} from "../services/aiMealParser";

const PROVIDER_OPTIONS: { id: settingsRepo.AiProvider; label: string }[] = [
  { id: "gemini", label: "Google Gemini" },
  { id: "groq", label: "Groq (Free & Fast)" },
  { id: "meta", label: "Meta AI (Llama)" },
  { id: "openai", label: "OpenAI" },
  { id: "custom", label: "Custom / OpenRouter" },
];

export function AiSettingsCard() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<settingsRepo.AiProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<string>(settingsRepo.DEFAULT_AI_MODELS.gemini);
  const [baseUrl, setBaseUrl] = useState(settingsRepo.DEFAULT_CUSTOM_BASE_URL);
  const [savedModel, setSavedModel] = useState<string>("");
  const [savedProvider, setSavedProvider] = useState<settingsRepo.AiProvider>("gemini");
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "saved" | "error"; text: string } | null>(null);

  // Dynamic models state
  const [availableModels, setAvailableModels] = useState<AvailableAiModel[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    let active = true;
    settingsRepo
      .getAiConfig(db)
      .then((cfg) => {
        if (active) {
          setProvider(cfg.provider);
          setSavedProvider(cfg.provider);
          setModel(cfg.model);
          setSavedModel(cfg.model);
          setBaseUrl(cfg.baseUrl);
          if (cfg.apiKey) setApiKey(cfg.apiKey);
          const presets = settingsRepo.AI_MODEL_PRESETS[cfg.provider] || [];
          setIsCustomModel(!presets.includes(cfg.model));
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

  const handleProviderChange = async (newProvider: settingsRepo.AiProvider) => {
    // If user entered a key for current provider, save it to that provider's slot before switching
    if (apiKey.trim()) {
      await settingsRepo.setAiApiKey(db, apiKey.trim(), provider);
    }
    setProvider(newProvider);
    setNotice(null);
    setAvailableModels([]); // clear fetched models for previous provider

    // Load saved API key and model for the newly selected provider
    const [savedKeyForNewProvider, savedModelForNewProvider] = await Promise.all([
      settingsRepo.getAiApiKey(db, newProvider),
      settingsRepo.getAiModel(db, newProvider),
    ]);
    setApiKey(savedKeyForNewProvider ?? "");
    setModel(savedModelForNewProvider);
    const presets = settingsRepo.AI_MODEL_PRESETS[newProvider] || [];
    setIsCustomModel(!presets.includes(savedModelForNewProvider));
  };

  const handleSelectModel = async (selectedModel: string) => {
    const trimmed = selectedModel.trim();
    setNotice(null);
    setIsCustomModel(false);
    setModel(trimmed);
    setIsDropdownOpen(false);

    // Automatically persist the selected model immediately
    try {
      await settingsRepo.setAiModel(db, trimmed, provider);
      setSavedModel(trimmed);
      setSavedProvider(provider);
      setNotice({ kind: "saved", text: `Active model saved: ${trimmed}` });
    } catch {
      setNotice({ kind: "error", text: "Could not auto-save selected model" });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const resolvedModel = model.trim() || settingsRepo.DEFAULT_AI_MODELS[provider];
      const resolvedBaseUrl = baseUrl.trim() || settingsRepo.DEFAULT_CUSTOM_BASE_URL;
      await Promise.all([
        settingsRepo.setAiApiKey(db, apiKey.trim() || null, provider),
        settingsRepo.setAiProvider(db, provider),
        settingsRepo.setAiModel(db, resolvedModel, provider),
        settingsRepo.setAiBaseUrl(db, resolvedBaseUrl),
      ]);
      setSavedModel(resolvedModel);
      setSavedProvider(provider);
      setNotice({
        kind: "saved",
        text: `Saved! Active provider: ${providerDisplayName(provider)} (${resolvedModel})`,
      });
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
    setNotice(null);
    try {
      // 1. Fetch available models directly from provider
      const fetched = await fetchAvailableAiModels({
        provider,
        apiKey: apiKey.trim(),
        baseUrl: provider === "custom" ? baseUrl.trim() : undefined,
      });
      setAvailableModels(fetched);

      // 2. Check if current model exists in fetched models; if not, choose best recommended
      let targetModel = model.trim();
      const exists = fetched.some((m) => m.id === targetModel);
      if (!exists && fetched.length > 0) {
        const recommended = fetched.find((m) => m.isRecommended) || fetched[0];
        targetModel = recommended.id;
        setModel(targetModel);
        setIsCustomModel(false);
        // Save the valid model
        await settingsRepo.setAiModel(db, targetModel, provider);
        setSavedModel(targetModel);
      }

      // 3. Test ping with target model
      const tested = await testAiConnection({
        provider,
        apiKey: apiKey.trim(),
        model: targetModel,
        baseUrl: provider === "custom" ? baseUrl.trim() : undefined,
      });

      // 4. Open model dropdown so user can review and select
      setIsDropdownOpen(true);

      const providerLabel = providerDisplayName(provider);
      Alert.alert(
        "Connection Successful!",
        `Connected to ${providerLabel} using model "${tested}".\n\nFetched ${fetched.length} available models from your account! You can now choose your preferred model from the dropdown.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert("Connection Failed", msg);
    } finally {
      setTesting(false);
    }
  };

  // Compute model list to display in dropdown (live fetched or standard presets)
  const displayModelsList = useMemo(() => {
    const list: AvailableAiModel[] =
      availableModels.length > 0
        ? availableModels
        : (settingsRepo.AI_MODEL_PRESETS[provider] || []).map((id) => ({
            id,
            name: id,
            isRecommended: id === settingsRepo.DEFAULT_AI_MODELS[provider],
          }));

    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase();
    return list.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }, [availableModels, provider, searchFilter]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  const isLiveFetched = availableModels.length > 0;
  const isModelSaved = model === savedModel && provider === savedProvider;

  function providerDisplayName(p: settingsRepo.AiProvider) {
    switch (p) {
      case "gemini":
        return "Google Gemini";
      case "groq":
        return "Groq";
      case "meta":
        return "Meta AI (Llama)";
      case "openai":
        return "OpenAI";
      case "custom":
        return "Custom / OpenRouter";
      default:
        return p;
    }
  }

  return (
    <View style={styles.card}>
      {/* Active Saved Model Summary Box */}
      {savedModel ? (
        <View style={styles.activeConfigBox}>
          <View style={styles.activeConfigHeader}>
            <View style={styles.activeDot} />
            <Text style={styles.activeConfigTitle}>Current Saved AI Model</Text>
          </View>
          <View style={styles.activeConfigContent}>
            <Text style={styles.activeConfigModel} numberOfLines={1}>
              {savedModel}
            </Text>
            <Text style={styles.activeConfigMeta}>
              Provider: {providerDisplayName(savedProvider)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Provider Selector Chips */}
      <Text style={styles.label}>AI Provider</Text>
      <View style={styles.providerRow}>
        {PROVIDER_OPTIONS.map((opt) => {
          const active = provider === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => void handleProviderChange(opt.id)}
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
            Works with OpenRouter (https://openrouter.ai/api/v1), DeepSeek, or any custom endpoint.
          </Text>
        </>
      )}

      {/* API Key Input */}
      <Text style={styles.label}>
        {provider === "gemini"
          ? "Gemini API Key"
          : provider === "groq"
            ? "Groq API Key"
            : provider === "meta"
              ? "Meta API Key"
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
            : provider === "groq"
              ? "Paste your Groq API key (gsk_...)"
              : provider === "meta"
                ? "Paste your Meta Model API key..."
                : "Paste your API key (sk-...)"
        }
        placeholderTextColor={theme.colors.faint}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={styles.keyInput}
      />

      <Text style={styles.helpText}>
        {provider === "gemini"
          ? "Get a free Gemini API key from Google AI Studio (aistudio.google.com). Free tier includes 15 RPM with no credit card required."
          : provider === "groq"
            ? "Get a free Groq API key from console.groq.com. Extremely fast open-source Llama 3 models on LPUs with no credit card required."
            : provider === "meta"
              ? "Get an API key from the Meta Model API dashboard at api.meta.ai or Meta Llama provider."
              : provider === "openai"
                ? "Requires an OpenAI platform account with an API secret key from platform.openai.com."
                : "Your key is stored only on this phone and excluded from JSON backup exports."}
      </Text>

      {/* Selected Model Dropdown Trigger */}
      <View style={styles.modelHeaderRow}>
        <Text style={styles.label}>AI Model</Text>
        {isLiveFetched && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>● {availableModels.length} Models Loaded</Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={() => {
          setSearchFilter("");
          setIsDropdownOpen(true);
        }}
        accessibilityRole="button"
        style={styles.dropdownTrigger}
      >
        <View style={styles.dropdownTriggerContent}>
          <Text style={styles.dropdownTriggerLabel} numberOfLines={1}>
            {model || "Select a model..."}
          </Text>
          {isModelSaved ? (
            <View style={styles.savedPill}>
              <Text style={styles.savedPillText}>✓ Saved</Text>
            </View>
          ) : (
            <View style={styles.unsavedPill}>
              <Text style={styles.unsavedPillText}>Selected</Text>
            </View>
          )}
        </View>
        <Text style={styles.dropdownChevron}>▼</Text>
      </Pressable>

      <Text style={styles.modelHint}>
        {isLiveFetched
          ? "Tap above to choose from all models available on your account."
          : "Tap 'Test Connection' to test and automatically load available models."}
      </Text>

      {isCustomModel && (
        <TextInput
          value={model}
          onChangeText={(text) => {
            setNotice(null);
            setModel(text);
          }}
          placeholder="e.g. gemini-2.5-flash or custom model name"
          placeholderTextColor={theme.colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.keyInput}
        />
      )}

      {notice && (
        <Text style={notice.kind === "saved" ? styles.savedNotice : styles.errorNotice}>
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
            {testing ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Text style={styles.testBtnText}>Test Connection</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Model Selection Dropdown Modal */}
      <Modal
        visible={isDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsDropdownOpen(false)}
          />
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select AI Model</Text>
                <Text style={styles.modalSubtitle}>
                  {providerDisplayName(provider)}
                  {isLiveFetched ? ` (${displayModelsList.length} available)` : " (Presets)"}
                </Text>
              </View>
              <Pressable
                onPress={() => setIsDropdownOpen(false)}
                style={styles.modalCloseBtn}
                hitSlop={8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            {/* Filter Search Input */}
            <TextInput
              value={searchFilter}
              onChangeText={setSearchFilter}
              placeholder="Filter models (e.g. flash, mini, llama)..."
              placeholderTextColor={theme.colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.modalSearchInput}
            />

            {/* Model List */}
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {displayModelsList.map((item, index) => {
                const isSelected = !isCustomModel && model === item.id;
                const isThisSaved = savedModel === item.id && provider === savedProvider;
                return (
                  <Pressable
                    key={`${item.id}-${index}`}
                    onPress={() => void handleSelectModel(item.id)}
                    style={[styles.modelItemRow, isSelected && styles.modelItemRowActive]}
                  >
                    <View style={styles.modelItemTextCol}>
                      <View style={styles.modelItemTitleRow}>
                        <Text
                          style={[
                            styles.modelItemId,
                            isSelected && styles.modelItemIdActive,
                          ]}
                        >
                          {item.id}
                        </Text>
                        {isThisSaved && (
                          <View style={styles.savedPill}>
                            <Text style={styles.savedPillText}>✓ Saved Active</Text>
                          </View>
                        )}
                        {item.isRecommended && !isThisSaved && (
                          <View style={styles.recBadge}>
                            <Text style={styles.recBadgeText}>Recommended</Text>
                          </View>
                        )}
                      </View>
                      {item.description ? (
                        <Text style={styles.modelItemDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}

              {displayModelsList.length === 0 && (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No models match "{searchFilter}"</Text>
                </View>
              )}

              {/* Custom Model Option */}
              <Pressable
                onPress={() => {
                  setIsCustomModel(true);
                  setIsDropdownOpen(false);
                }}
                style={[styles.modelItemRow, isCustomModel && styles.modelItemRowActive]}
              >
                <View style={styles.modelItemTextCol}>
                  <Text style={[styles.modelItemId, isCustomModel && styles.modelItemIdActive]}>
                    Custom Model Identifier...
                  </Text>
                  <Text style={styles.modelItemDesc}>
                    Type any custom or experimental model name
                  </Text>
                </View>
                <View style={[styles.radioCircle, isCustomModel && styles.radioCircleActive]}>
                  {isCustomModel && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    // Active Config Banner
    activeConfigBox: {
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: "#22c55e40",
      padding: space[3],
      gap: 4,
    },
    activeConfigHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
    },
    activeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#22c55e",
    },
    activeConfigTitle: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    activeConfigContent: {
      gap: 2,
    },
    activeConfigModel: {
      fontSize: fontSize.sm,
      fontWeight: "700",
      color: colors.text,
      fontFamily: "monospace",
    },
    activeConfigMeta: {
      fontSize: fontSize.xs,
      color: colors.muted,
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
      minWidth: "46%",
      paddingVertical: space[2],
      paddingHorizontal: space[2],
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
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
    modelHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    liveBadge: {
      backgroundColor: "#1b3a24",
      paddingHorizontal: space[2],
      paddingVertical: 2,
      borderRadius: radius.sm,
    },
    liveBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#4ade80",
    },
    dropdownTrigger: {
      minHeight: tap,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    dropdownTriggerContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
      flex: 1,
      marginRight: space[2],
    },
    dropdownTriggerLabel: {
      fontSize: fontSize.sm,
      fontWeight: "600",
      color: colors.text,
      fontFamily: "monospace",
    },
    dropdownChevron: {
      fontSize: 12,
      color: colors.muted,
    },
    modelHint: {
      fontSize: fontSize.xs,
      color: colors.muted,
      fontStyle: "italic",
    },
    recBadge: {
      backgroundColor: colors.accent,
      paddingHorizontal: space[2],
      paddingVertical: 2,
      borderRadius: 10,
    },
    recBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.accentText,
    },
    savedPill: {
      backgroundColor: "#14532d",
      paddingHorizontal: space[2],
      paddingVertical: 2,
      borderRadius: 10,
    },
    savedPillText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#4ade80",
    },
    unsavedPill: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: space[2],
      paddingVertical: 2,
      borderRadius: 10,
    },
    unsavedPillText: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.muted,
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
      minWidth: 110,
      alignItems: "center",
      justifyContent: "center",
    },
    testBtnText: {
      color: colors.text,
      fontSize: fontSize.sm,
      fontWeight: "600",
    },
    // Modal Dropdown Styles
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: space[4],
    },
    modalBackdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
    modalCard: {
      width: "100%",
      maxWidth: 420,
      maxHeight: "80%",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[4],
      gap: space[3],
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    modalTitle: {
      fontSize: fontSize.md,
      fontWeight: "700",
      color: colors.text,
    },
    modalSubtitle: {
      fontSize: fontSize.xs,
      color: colors.muted,
      marginTop: 2,
    },
    modalCloseBtn: {
      padding: space[1],
    },
    modalCloseText: {
      fontSize: fontSize.md,
      fontWeight: "700",
      color: colors.muted,
    },
    modalSearchInput: {
      height: 40,
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      color: colors.text,
      fontSize: fontSize.sm,
    },
    modalScrollView: {
      maxHeight: 340,
    },
    modalScrollContent: {
      gap: space[2],
    },
    modelItemRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: space[3],
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modelItemRowActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surface,
    },
    modelItemTextCol: {
      flex: 1,
      gap: 2,
      marginRight: space[2],
    },
    modelItemTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
      flexWrap: "wrap",
    },
    modelItemId: {
      fontSize: fontSize.sm,
      fontWeight: "600",
      color: colors.text,
      fontFamily: "monospace",
    },
    modelItemIdActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    modelItemDesc: {
      fontSize: fontSize.xs,
      color: colors.muted,
      lineHeight: 15,
    },
    radioCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    radioCircleActive: {
      borderColor: colors.accent,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
    },
    emptyBox: {
      padding: space[4],
      alignItems: "center",
    },
    emptyText: {
      fontSize: fontSize.xs,
      color: colors.muted,
    },
  });
}
