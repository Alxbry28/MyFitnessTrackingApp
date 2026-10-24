import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { BmiCard } from "@/modules/body/components/BmiCard";
import { WeighInRow } from "@/modules/body/components/WeighInRow";
import { WeightCard } from "@/modules/body/components/WeightCard";
import { useMeasurements } from "@/modules/body/hooks/useMeasurements";
import { useProgress } from "@/modules/body/hooks/useProgress";
import { formatCm, formatDelta } from "@/modules/body/services/measurementCalc";
import { CalendarView } from "@/modules/calendar/components/CalendarView";
import { useCalorieStats } from "@/modules/nutrition/hooks/useCalorieStats";

export default function ProgressScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { state, retry } = useProgress();
  const measurements = useMeasurements();
  const calorieStats = useCalorieStats();

  const params = useLocalSearchParams<{ tab?: string }>();
  const [tabOverride, setTabOverride] = useState<"overview" | "calendar" | null>(null);
  const [prevTabParam, setPrevTabParam] = useState(params.tab);

  if (params.tab !== prevTabParam) {
    setPrevTabParam(params.tab);
    setTabOverride(null);
  }

  const activeTab = tabOverride ?? (params.tab === "calendar" ? "calendar" : "overview");
  const setActiveTab = (t: "overview" | "calendar") => setTabOverride(t);


  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading progress" />
      </View>
    );
  }
  if (state.status === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{"Couldn't load your progress."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const logWeight = () => router.push("/weight");
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Segmented Control: [ Overview | Calendar ] */}
      <View style={styles.segmentedControlWrap}>
        <Pressable
          onPress={() => setActiveTab("overview")}
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === "overview" }}
          style={[styles.segmentBtn, activeTab === "overview" && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentBtnText, activeTab === "overview" && styles.segmentBtnTextActive]}>
            Overview
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("calendar")}
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === "calendar" }}
          style={[styles.segmentBtn, activeTab === "calendar" && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentBtnText, activeTab === "calendar" && styles.segmentBtnTextActive]}>
            Calendar
          </Text>
        </Pressable>
      </View>

      {activeTab === "calendar" ? (
        <CalendarView />
      ) : (
        <>
          <WeightCard
            trend={state.trend}
            chart={state.chart}
            latest={state.latest}
            today={state.today}
            onLog={logWeight}
          />

      <BmiCard
        profile={state.profile}
        latest={state.latest}
        onEditProfile={() => router.push("/body-profile")}
      />

      {/* Calorie Stats & TDEE Card */}
      {calorieStats.data && (
        <Pressable
          onPress={() => router.push("/calorie-stats" as any)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.measureCard, pressed && styles.pressed]}
        >
          <View style={styles.measureHeader}>
            <View style={styles.measureTitleRow}>
              <Text style={styles.measureTitle}>Calorie Stats & TDEE</Text>
              <View
                style={[
                  styles.wthBadge,
                  calorieStats.data.tdee.isLearned ? styles.wthHealthy : styles.wthWarning,
                ]}
              >
                <Text
                  style={[
                    styles.wthBadgeText,
                    calorieStats.data.tdee.isLearned ? styles.wthTextHealthy : styles.wthTextWarning,
                  ]}
                >
                  {calorieStats.data.tdee.isLearned ? "LEARNED TDEE" : "ESTIMATED TDEE"}
                </Text>
              </View>
            </View>
            <Text style={styles.measureArrow}>›</Text>
          </View>

          <View style={styles.measureGrid}>
            <View style={styles.measurePill}>
              <Text style={styles.pillLabel}>Maintenance</Text>
              <Text style={styles.pillValue}>{calorieStats.data.tdee.tdeeKcal.toLocaleString()} kcal</Text>
              <Text style={styles.pillDelta}>{calorieStats.data.tdee.source}</Text>
            </View>
            <View style={styles.measurePill}>
              <Text style={styles.pillLabel}>7-Day Intake</Text>
              <Text style={styles.pillValue}>
                {calorieStats.data.averages7Days.avgKcal > 0
                  ? `${calorieStats.data.averages7Days.avgKcal.toLocaleString()} kcal`
                  : "—"}
              </Text>
              <Text style={styles.pillDelta}>
                Goal: {calorieStats.data.currentTargetKcal.toLocaleString()} kcal
              </Text>
            </View>
          </View>
        </Pressable>
      )}

      {/* Body Measurements Card */}
      <Pressable
        onPress={() => router.push("/measurements" as any)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.measureCard, pressed && styles.pressed]}
      >
        <View style={styles.measureHeader}>
          <View style={styles.measureTitleRow}>
            <Text style={styles.measureTitle}>Body Measurements</Text>
            {measurements.waistToHeight && (
              <View
                style={[
                  styles.wthBadge,
                  measurements.waistToHeight.category === "healthy"
                    ? styles.wthHealthy
                    : styles.wthWarning,
                ]}
              >
                <Text
                  style={[
                    styles.wthBadgeText,
                    measurements.waistToHeight.category === "healthy"
                      ? styles.wthTextHealthy
                      : styles.wthTextWarning,
                  ]}
                >
                  WHtR {measurements.waistToHeight.ratio.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.measureRightRow}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                router.push("/measurements/guide" as any);
              }}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.guideLinkPill}
            >
              <Text style={styles.guideLinkText}>Guide</Text>
            </Pressable>
            <Text style={styles.measureArrow}>›</Text>
          </View>
        </View>

        {measurements.deltas.length > 0 ? (
          <View style={styles.measureGrid}>
            {measurements.deltas.slice(0, 4).map((d) => (
              <View key={d.siteKey} style={styles.measurePill}>
                <Text style={styles.pillLabel}>{d.label}</Text>
                <Text style={styles.pillValue}>{formatCm(d.currentCm)}</Text>
                {d.deltaLastCm !== null && d.deltaLastCm !== undefined && (
                  <Text
                    style={[
                      styles.pillDelta,
                      d.deltaLastCm > 0
                        ? styles.deltaPlus
                        : d.deltaLastCm < 0
                          ? styles.deltaMinus
                          : styles.deltaNeutral,
                    ]}
                  >
                    {formatDelta(d.deltaLastCm)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.measureEmpty}>
            Track waist, chest, arms and thighs over time. Tap to log measurements.
          </Text>
        )}
      </Pressable>

      {state.recent.length > 0 && (
        <>
          <Text style={styles.section} accessibilityRole="header">
            Last 14 days
          </Text>
          <View style={styles.card}>
            {state.recent.map((reading, index) => (
              <WeighInRow
                key={reading.id}
                reading={reading}
                today={state.today}
                divided={index > 0}
                onPress={() => router.push({ pathname: "/weight", params: { id: reading.id } })}
              />
            ))}
          </View>
        </>
      )}
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: space[4], gap: space[4] },
    segmentedControlWrap: {
      flexDirection: "row",
      backgroundColor: colors.surface2,
      borderRadius: radius.md,
      padding: 3,
    },
    segmentBtn: {
      flex: 1,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
    },
    segmentBtnActive: {
      backgroundColor: colors.surface,
    },
    segmentBtnText: {
      fontSize: fontSize.sm,
      color: colors.muted,
      fontWeight: "400",
    },
    segmentBtnTextActive: {
      color: colors.text,
      fontWeight: "600",
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4], backgroundColor: colors.bg },

    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    section: {
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: -space[2],
    },
    card: { borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surface },
    secondaryButton: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    secondaryLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    pressed: { opacity: 0.8 },
    measureCard: {
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[4],
      gap: space[3],
    },
    measureHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    measureTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    measureTitle: {
      fontSize: fontSize.md,
      fontWeight: "700",
      color: colors.text,
    },
    wthBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    wthHealthy: {
      backgroundColor: "#2e7d3222",
    },
    wthWarning: {
      backgroundColor: "#ed6c0222",
    },
    wthBadgeText: {
      fontSize: 11,
      fontWeight: "700",
    },
    wthTextHealthy: {
      color: "#2e7d32",
    },
    wthTextWarning: {
      color: "#ed6c02",
    },
    measureRightRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    guideLinkPill: {
      paddingVertical: 2,
      paddingHorizontal: 8,
      backgroundColor: colors.accentSoft,
      borderRadius: 10,
    },
    guideLinkText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.accentText,
    },
    measureArrow: {
      fontSize: fontSize.lg,
      color: colors.faint,
    },
    measureGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    measurePill: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: colors.surface2,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 2,
    },
    pillLabel: {
      fontSize: 11,
      color: colors.muted,
      fontWeight: "500",
    },
    pillValue: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    pillDelta: {
      fontSize: 10,
      fontWeight: "600",
    },
    deltaPlus: {
      color: colors.accent,
    },
    deltaMinus: {
      color: "#0288d1",
    },
    deltaNeutral: {
      color: colors.muted,
    },
    measureEmpty: {
      fontSize: fontSize.sm,
      color: colors.muted,
      lineHeight: 18,
    },
  });
}
