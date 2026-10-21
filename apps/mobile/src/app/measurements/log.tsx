import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { measurementRepo } from "@/modules/body/repositories/measurementRepo";
import {
  ALL_MEASUREMENT_SITES,
  formatCm,
  getSiteKey,
} from "@/modules/body/services/measurementCalc";
import type {
  MeasurementSession,
  MeasurementValueInput,
  TrackedSiteConfig,
} from "@/modules/body/types/measurements";

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function MeasurementLogScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [measuredOn, setMeasuredOn] = useState(getTodayIso());
  const [note, setNote] = useState("");
  const [trackedConfigs, setTrackedConfigs] = useState<TrackedSiteConfig[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [lastValues, setLastValues] = useState<Record<string, number>>({});
  const [existingSession, setExistingSession] = useState<MeasurementSession | null>(null);

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const [trackedKeys, latestSession, sessionToEdit] = await Promise.all([
          measurementRepo.getTrackedSites(db),
          measurementRepo.getLatestSession(db),
          id ? measurementRepo.getSession(db, id) : Promise.resolve(null),
        ]);

        if (!active) return;

        // Determine tracked configs in order
        const configs = ALL_MEASUREMENT_SITES.filter((s) => trackedKeys.includes(s.key));
        setTrackedConfigs(configs.length > 0 ? configs : ALL_MEASUREMENT_SITES.slice(0, 6));

        // Map last session values for placeholders
        if (latestSession && latestSession.id !== id) {
          const map: Record<string, number> = {};
          for (const m of latestSession.measurements) {
            map[getSiteKey(m.site, m.side)] = m.valueCm;
          }
          setLastValues(map);
        }

        // If editing existing
        if (sessionToEdit) {
          setExistingSession(sessionToEdit);
          setMeasuredOn(sessionToEdit.measuredOn);
          setNote(sessionToEdit.note ?? "");

          const editMap: Record<string, string> = {};
          for (const m of sessionToEdit.measurements) {
            editMap[getSiteKey(m.site, m.side)] = String(m.valueCm);
          }
          setValues(editMap);
        }
      } catch {
        // Fallback
      } finally {
        if (active) setLoading(false);
      }
    }

    void init();
    return () => {
      active = false;
    };
  }, [db, id]);

  const handleValueChange = (key: string, text: string) => {
    // Only allow numbers and decimal point
    const cleaned = text.replace(/[^0-9.]/g, "");
    setValues((prev) => ({ ...prev, [key]: cleaned }));
  };

  const handleSave = async () => {
    const measurementsToSave: MeasurementValueInput[] = [];

    for (const config of trackedConfigs) {
      const valStr = values[config.key]?.trim();
      if (!valStr) continue;
      const valNum = parseFloat(valStr);
      if (isNaN(valNum) || valNum <= 0) continue;

      measurementsToSave.push({
        site: config.site,
        side: config.side,
        valueCm: valNum,
        state: config.defaultState,
      });
    }

    if (measurementsToSave.length === 0) {
      Alert.alert(
        "No measurements entered",
        "Please enter at least one measurement (e.g. waist, chest, or arms) before saving.",
      );
      return;
    }

    setSaving(true);
    try {
      await measurementRepo.saveSession(
        db,
        {
          measuredOn: measuredOn.trim() || getTodayIso(),
          note: note.trim() || null,
          measurements: measurementsToSave,
        },
        existingSession ? existingSession.id : undefined,
      );

      router.back();
    } catch {
      Alert.alert("Error", "Could not save measurement session.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existingSession) return;
    Alert.alert(
      "Delete session?",
      `Are you sure you want to delete the session from ${existingSession.measuredOn}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await measurementRepo.deleteSession(db, existingSession.id);
              router.back();
            } catch {
              Alert.alert("Error", "Could not delete session.");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.centerBox, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { paddingTop: insets.top }]}
    >
      {/* App Bar */}
      <View style={styles.appbar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>Cancel</Text>
        </Pressable>
        <Text style={styles.appbarTitle}>
          {existingSession ? "Edit Session" : "Log Measurements"}
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.saveBtn}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Row */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
          <TextInput
            value={measuredOn}
            onChangeText={setMeasuredOn}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.faint}
            style={styles.textInput}
          />
        </View>

        {/* Sites Inputs */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTitle}>Body Sites (cm)</Text>
            <Pressable
              onPress={() => router.push("/measurements/sites" as any)}
              accessibilityRole="button"
            >
              <Text style={styles.editSitesText}>Edit sites</Text>
            </Pressable>
          </View>

          {trackedConfigs.map((config, index) => {
            const lastVal = lastValues[config.key];
            const placeholder = lastVal ? `Last: ${formatCm(lastVal)}` : "cm";

            return (
              <View
                key={config.key}
                style={[styles.siteInputRow, index > 0 && styles.rowDivided]}
              >
                <View style={styles.siteLabelCol}>
                  <Text style={styles.siteName}>{config.label}</Text>
                  <Text numberOfLines={1} style={styles.siteInstruction}>
                    {config.instruction}
                  </Text>
                </View>

                <View style={styles.siteInputWrapper}>
                  <TextInput
                    value={values[config.key] ?? ""}
                    onChangeText={(txt) => handleValueChange(config.key, txt)}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.faint}
                    keyboardType="numeric"
                    style={styles.cmInput}
                  />
                  <Text style={styles.cmUnit}>cm</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Notes Card */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. End of 4-week cut, morning before breakfast"
            placeholderTextColor={theme.colors.faint}
            multiline
            style={styles.notesInput}
          />
        </View>

        {/* Delete button if editing */}
        {existingSession && (
          <Pressable
            onPress={handleDelete}
            accessibilityRole="button"
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteBtnText}>Delete This Session</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    appbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backBtn: {
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    backText: {
      fontSize: 16,
      color: theme.colors.muted,
    },
    appbarTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.text,
    },
    saveBtn: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.accent,
      borderRadius: 14,
    },
    saveBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.accentText,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    centerBox: {
      alignItems: "center",
      justifyContent: "center",
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      gap: 10,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    cardSectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.text,
    },
    editSitesText: {
      fontSize: 13,
      color: theme.colors.accent,
      fontWeight: "600",
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    textInput: {
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface2,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    siteInputRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
    },
    rowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    siteLabelCol: {
      flex: 1,
      paddingRight: 12,
      gap: 2,
    },
    siteName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.text,
    },
    siteInstruction: {
      fontSize: 11,
      color: theme.colors.muted,
    },
    siteInputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    cmInput: {
      width: 90,
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
      backgroundColor: theme.colors.surface2,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      textAlign: "right",
    },
    cmUnit: {
      fontSize: 14,
      color: theme.colors.muted,
      fontWeight: "500",
      width: 22,
    },
    notesInput: {
      minHeight: 70,
      fontSize: 15,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface2,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      textAlignVertical: "top",
    },
    deleteBtn: {
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#d32f2f44",
      backgroundColor: "#d32f2f11",
    },
    deleteBtnText: {
      color: "#d32f2f",
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
