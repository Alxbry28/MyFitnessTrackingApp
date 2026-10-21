import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { useMeasurements } from "@/modules/body/hooks/useMeasurements";
import { formatCm, formatDelta } from "@/modules/body/services/measurementCalc";

function formatSessionDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function MeasurementsHubScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();

  const {
    sessions,
    latestSession,
    deltas,
    waistToHeight,
    loading,
  } = useMeasurements();

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
          <Text style={styles.backText}>‹ Progress</Text>
        </Pressable>
        <Text style={styles.appbarTitle}>Measurements</Text>
        <Pressable
          onPress={() => router.push("/measurements/sites" as any)}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.headerActionBtn}
        >
          <Text style={styles.headerActionText}>Sites & Guide</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={theme.colors.accent} size="large" />
          </View>
        ) : (
          <>
            {/* Waist-to-Height Ratio Card */}
            {waistToHeight && (
              <View style={styles.ratioCard}>
                <View style={styles.ratioTopRow}>
                  <Text style={styles.ratioTitle}>Waist-to-height ratio</Text>
                  <View
                    style={[
                      styles.ratioBadge,
                      waistToHeight.category === "healthy"
                        ? styles.badgeHealthy
                        : styles.badgeWarning,
                    ]}
                  >
                    <Text
                      style={[
                        styles.ratioBadgeText,
                        waistToHeight.category === "healthy"
                          ? styles.badgeTextHealthy
                          : styles.badgeTextWarning,
                      ]}
                    >
                      {waistToHeight.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ratioValue}>{waistToHeight.ratio.toFixed(2)}</Text>
                <Text style={styles.ratioDescription}>
                  Target is under 0.50. Unlike BMI, waist-to-height ratio accounts for muscle mass
                  because gaining muscle does not increase your waistline.
                </Text>
              </View>
            )}

            {/* Quick Action: Log Session */}
            <Pressable
              onPress={() => router.push("/measurements/log" as any)}
              accessibilityRole="button"
              style={styles.logActionBtn}
            >
              <Text style={styles.logActionText}>+ Log Measurement Session</Text>
            </Pressable>

            {/* Latest Measurements Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Latest measurements</Text>
                {latestSession && (
                  <Text style={styles.sectionSubtitle}>
                    {formatSessionDate(latestSession.measuredOn)}
                  </Text>
                )}
              </View>

              {deltas.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No measurements recorded</Text>
                  <Text style={styles.emptySubtitle}>
                    Tape measurements help you see muscle growth and fat loss that scales can miss.
                    Measure every 2–4 weeks.
                  </Text>
                </View>
              ) : (
                <View style={styles.deltasGrid}>
                  {deltas.map((item, idx) => (
                    <View
                      key={item.siteKey}
                      style={[styles.deltaRow, idx > 0 && styles.rowDivided]}
                    >
                      <View style={styles.siteInfoCol}>
                        <Text style={styles.siteLabel}>{item.label}</Text>
                        <Text style={styles.siteGroup}>{item.group}</Text>
                      </View>

                      <View style={styles.siteValuesCol}>
                        <Text style={styles.siteValueCm}>{formatCm(item.currentCm)}</Text>
                        <View style={styles.deltasCol}>
                          {item.deltaLastCm !== null && item.deltaLastCm !== undefined && (
                            <Text
                              style={[
                                styles.deltaText,
                                item.deltaLastCm > 0
                                  ? styles.deltaPlus
                                  : item.deltaLastCm < 0
                                    ? styles.deltaMinus
                                    : styles.deltaNeutral,
                              ]}
                            >
                              {formatDelta(item.deltaLastCm)} vs last
                            </Text>
                          )}
                          {item.deltaStartCm !== null && item.deltaStartCm !== undefined && (
                            <Text style={styles.deltaStartText}>
                              {formatDelta(item.deltaStartCm)} since start
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* History Section */}
            {sessions.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.sectionHeaderTitle}>History</Text>

                {sessions.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() =>
                      router.push({
                        pathname: "/measurements/log" as any,
                        params: { id: s.id },
                      })
                    }
                    accessibilityRole="button"
                    style={styles.historyCard}
                  >
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyDate}>
                        {formatSessionDate(s.measuredOn)}
                      </Text>
                      <Text style={styles.historyArrow}>›</Text>
                    </View>

                    {s.note ? (
                      <Text numberOfLines={1} style={styles.historyNote}>
                        “{s.note}”
                      </Text>
                    ) : null}

                    <Text numberOfLines={2} style={styles.historySummary}>
                      {s.measurements
                        .map((m) => {
                          const sideSuffix =
                            m.side === "left" ? " (L)" : m.side === "right" ? " (R)" : "";
                          return `${m.site}${sideSuffix}: ${formatCm(m.valueCm)}`;
                        })
                        .join(" · ")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
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
    headerActionBtn: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    headerActionText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.accent,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    centerBox: {
      paddingTop: 60,
      alignItems: "center",
    },
    ratioCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      gap: 8,
    },
    ratioTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    ratioTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    ratioBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeHealthy: {
      backgroundColor: "#2e7d3222",
    },
    badgeWarning: {
      backgroundColor: "#ed6c0222",
    },
    ratioBadgeText: {
      fontSize: 11,
      fontWeight: "700",
    },
    badgeTextHealthy: {
      color: "#2e7d32",
    },
    badgeTextWarning: {
      color: "#ed6c02",
    },
    ratioValue: {
      fontSize: 32,
      fontWeight: "800",
      color: theme.colors.text,
      letterSpacing: -0.5,
    },
    ratioDescription: {
      fontSize: 12,
      color: theme.colors.muted,
      lineHeight: 17,
    },
    logActionBtn: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      paddingVertical: 14,
      alignItems: "center",
    },
    logActionText: {
      color: theme.colors.accent,
      fontSize: 15,
      fontWeight: "700",
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      gap: 12,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: theme.colors.muted,
    },
    emptyCard: {
      paddingVertical: 16,
      alignItems: "center",
      gap: 6,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.text,
    },
    emptySubtitle: {
      fontSize: 13,
      color: theme.colors.muted,
      textAlign: "center",
      lineHeight: 18,
    },
    deltasGrid: {
      gap: 0,
    },
    deltaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
    },
    rowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    siteInfoCol: {
      gap: 2,
    },
    siteLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.text,
    },
    siteGroup: {
      fontSize: 11,
      color: theme.colors.muted,
    },
    siteValuesCol: {
      alignItems: "flex-end",
      gap: 2,
    },
    siteValueCm: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
    },
    deltasCol: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    deltaText: {
      fontSize: 11,
      fontWeight: "600",
    },
    deltaPlus: {
      color: theme.colors.accent,
    },
    deltaMinus: {
      color: "#0288d1",
    },
    deltaNeutral: {
      color: theme.colors.muted,
    },
    deltaStartText: {
      fontSize: 10,
      color: theme.colors.muted,
    },
    historySection: {
      gap: 10,
      marginTop: 8,
    },
    sectionHeaderTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    historyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      gap: 6,
    },
    historyTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    historyDate: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.text,
    },
    historyArrow: {
      fontSize: 18,
      color: theme.colors.faint,
    },
    historyNote: {
      fontSize: 12,
      fontStyle: "italic",
      color: theme.colors.muted,
    },
    historySummary: {
      fontSize: 12,
      color: theme.colors.muted,
      lineHeight: 16,
    },
  });
}
