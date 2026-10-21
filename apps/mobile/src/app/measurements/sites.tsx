import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { measurementRepo } from "@/modules/body/repositories/measurementRepo";
import {
  ALL_MEASUREMENT_SITES,
  DEFAULT_TRACKED_SITE_KEYS,
} from "@/modules/body/services/measurementCalc";

export default function MeasurementSitesScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(DEFAULT_TRACKED_SITE_KEYS);

  useEffect(() => {
    let active = true;
    void measurementRepo.getTrackedSites(db).then((keys) => {
      if (active) {
        setSelectedKeys(keys);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [db]);

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleSave = async () => {
    if (selectedKeys.length === 0) {
      Alert.alert("No sites selected", "Please select at least one site to track.");
      return;
    }

    setSaving(true);
    try {
      await measurementRepo.saveTrackedSites(db, selectedKeys);
      router.back();
    } catch {
      Alert.alert("Error", "Could not save tracked sites.");
    } finally {
      setSaving(false);
    }
  };

  const groups = ["Upper", "Arms", "Core", "Legs"] as const;

  if (loading) {
    return (
      <View style={[styles.screen, styles.centerBox, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* App Bar */}
      <View style={styles.appbar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.appbarTitle}>Sites & Guide</Text>
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Consistency Guide Card */}
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>HOW TO MEASURE CONSISTENTLY</Text>
          <View style={styles.guidePoints}>
            <Text style={styles.guidePoint}>
              • <Text style={styles.bold}>Timing:</Text> Measure in the morning before eating,
              after using the bathroom.
            </Text>
            <Text style={styles.guidePoint}>
              • <Text style={styles.bold}>Tape tension:</Text> Snug against the skin, completely
              level, not compressing tissue.
            </Text>
            <Text style={styles.guidePoint}>
              • <Text style={styles.bold}>Frequency:</Text> Every 2–4 weeks is ideal. Weekly
              numbers reflect fluid changes rather than muscle growth.
            </Text>
            <Text style={styles.guidePoint}>
              • <Text style={styles.bold}>Flexed vs Relaxed:</Text> For arms, pick flexed or
              relaxed and stick with the same state every session.
            </Text>
          </View>
        </View>

        {/* Site Toggles by Group */}
        {groups.map((group) => {
          const sitesInGroup = ALL_MEASUREMENT_SITES.filter((s) => s.group === group);

          return (
            <View key={group} style={styles.groupCard}>
              <Text style={styles.groupTitle}>{group}</Text>

              {sitesInGroup.map((site, index) => {
                const isSelected = selectedKeys.includes(site.key);

                return (
                  <View
                    key={site.key}
                    style={[styles.siteRow, index > 0 && styles.rowDivided]}
                  >
                    <View style={styles.siteInfoCol}>
                      <Text style={styles.siteName}>{site.label}</Text>
                      <Text style={styles.siteInstruction}>{site.instruction}</Text>
                    </View>

                    <Switch
                      value={isSelected}
                      onValueChange={() => toggleKey(site.key)}
                      trackColor={{ false: theme.colors.surface2, true: theme.colors.accent }}
                      thumbColor="#fff"
                    />
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
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
      color: theme.colors.accent,
      fontWeight: "500",
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
    guideCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      gap: 10,
    },
    guideTitle: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.colors.accent,
      letterSpacing: 0.8,
    },
    guidePoints: {
      gap: 6,
    },
    guidePoint: {
      fontSize: 13,
      color: theme.colors.text,
      lineHeight: 18,
    },
    bold: {
      fontWeight: "700",
    },
    groupCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      gap: 8,
    },
    groupTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 4,
    },
    siteRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
    },
    rowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    siteInfoCol: {
      flex: 1,
      paddingRight: 16,
      gap: 2,
    },
    siteName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.text,
    },
    siteInstruction: {
      fontSize: 12,
      color: theme.colors.muted,
      lineHeight: 16,
    },
  });
}
