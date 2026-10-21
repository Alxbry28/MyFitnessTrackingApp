import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { useCalorieStats } from "@/modules/nutrition/hooks/useCalorieStats";

export default function CalorieStatsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();

  const { data, loading, acceptSuggestion } = useCalorieStats();
  const [updating, setUpdating] = useState(false);
  const [timeframe, setTimeframe] = useState<"7d" | "30d">("7d");

  if (loading || !data) {
    return (
      <View style={[styles.screen, styles.centerBox, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  const {
    tdee,
    suggestedTarget,
    currentTargetKcal,
    averages7Days,
    averages30Days,
    adherence30Days,
    dailyIntake30Days,
  } = data;

  const currentAverages = timeframe === "7d" ? averages7Days : averages30Days;

  const handleAcceptSuggestion = () => {
    Alert.alert(
      "Update Calorie Goal?",
      `Change your daily calorie goal from ${currentTargetKcal.toLocaleString()} kcal to ${suggestedTarget.suggestedKcal.toLocaleString()} kcal?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          style: "default",
          onPress: async () => {
            setUpdating(true);
            try {
              await acceptSuggestion(suggestedTarget.suggestedKcal);
              Alert.alert("Success", "Daily calorie goal updated.");
            } catch {
              Alert.alert("Error", "Could not update calorie goal.");
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  // 30-day chart max value for scale
  const maxDayKcal = Math.max(
    ...dailyIntake30Days.map((d) => d.kcal),
    currentTargetKcal,
    2500,
  );

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
        <Text style={styles.appbarTitle}>Calorie Stats & TDEE</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* TDEE Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSubtitle}>ESTIMATED MAINTENANCE (TDEE)</Text>
            <View
              style={[
                styles.badge,
                tdee.isLearned ? styles.badgeLearned : styles.badgeEstimate,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  tdee.isLearned ? styles.badgeTextLearned : styles.badgeTextEstimate,
                ]}
              >
                {tdee.isLearned ? "FROM YOUR DATA" : "FORMULA ESTIMATE"}
              </Text>
            </View>
          </View>

          <Text style={styles.tdeeValue}>
            {tdee.tdeeKcal.toLocaleString()} <Text style={styles.tdeeUnit}>kcal/day</Text>
          </Text>

          <Text style={styles.tdeeExplanation}>{tdee.explanation}</Text>
        </View>

        {/* Suggested Target Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSubtitle}>SUGGESTED TARGET</Text>
            <Text style={styles.currentGoalHint}>Current: {currentTargetKcal} kcal</Text>
          </View>

          <View style={styles.suggestedNumbersRow}>
            <View style={styles.targetNumberBox}>
              <Text style={styles.suggestedNumber}>
                {suggestedTarget.suggestedKcal.toLocaleString()}
              </Text>
              <Text style={styles.suggestedLabel}>kcal / day</Text>
            </View>
            <View style={styles.targetDivider} />
            <View style={styles.targetNumberBox}>
              <Text style={styles.suggestedNumber}>{suggestedTarget.suggestedProteinGrams}g</Text>
              <Text style={styles.suggestedLabel}>protein target</Text>
            </View>
          </View>

          <Text style={styles.targetExplanation}>{suggestedTarget.explanation}</Text>

          {currentTargetKcal !== suggestedTarget.suggestedKcal && (
            <Pressable
              onPress={handleAcceptSuggestion}
              disabled={updating}
              accessibilityRole="button"
              style={styles.acceptBtn}
            >
              <Text style={styles.acceptBtnText}>
                {updating ? "Updating..." : "Accept Suggested Goal"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Averages & Adherence Card */}
        <View style={styles.card}>
          <View style={styles.timeframeRow}>
            <Text style={styles.cardSectionTitle}>Intake Averages</Text>
            <View style={styles.segmentedControl}>
              <Pressable
                onPress={() => setTimeframe("7d")}
                style={[styles.segmentBtn, timeframe === "7d" && styles.segmentActive]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    timeframe === "7d" && styles.segmentTextActive,
                  ]}
                >
                  7 Days
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTimeframe("30d")}
                style={[styles.segmentBtn, timeframe === "30d" && styles.segmentActive]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    timeframe === "30d" && styles.segmentTextActive,
                  ]}
                >
                  30 Days
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Macro Pills Grid */}
          <View style={styles.macroGrid}>
            <View style={styles.macroPill}>
              <Text style={styles.macroLabel}>Calories</Text>
              <Text style={styles.macroValue}>
                {currentAverages.avgKcal > 0 ? `${currentAverages.avgKcal} kcal` : "—"}
              </Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>
                {currentAverages.avgProtein > 0 ? `${currentAverages.avgProtein}g` : "—"}
              </Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>
                {currentAverages.avgCarbs > 0 ? `${currentAverages.avgCarbs}g` : "—"}
              </Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>
                {currentAverages.avgFat > 0 ? `${currentAverages.avgFat}g` : "—"}
              </Text>
            </View>
          </View>

          {/* Adherence info */}
          <View style={styles.adherenceBox}>
            <View style={styles.adherenceHeader}>
              <Text style={styles.adherenceTitle}>Days on Target (Last 30 Days)</Text>
              <Text style={styles.adherencePct}>{adherence30Days.percentage}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, adherence30Days.percentage)}%` },
                ]}
              />
            </View>
            <Text style={styles.adherenceSubtitle}>
              {adherence30Days.onTarget} of {adherence30Days.totalLogged} logged days on target.
            </Text>
          </View>
        </View>

        {/* 30-Day Daily Chart */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>30-Day Daily Intake</Text>
          <Text style={styles.chartSubtitle}>
            Dashed line represents your {currentTargetKcal} kcal goal.
          </Text>

          {dailyIntake30Days.length === 0 ? (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>No food entries logged in the last 30 days.</Text>
            </View>
          ) : (
            <View style={styles.chartContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chartBarsRow}>
                  {dailyIntake30Days.slice().reverse().map((day) => {
                    const heightPct = Math.min(100, Math.round((day.kcal / maxDayKcal) * 100));
                    const isOver = day.kcal > currentTargetKcal + 50;
                    const isZero = day.kcal === 0;

                    return (
                      <View key={day.day} style={styles.chartBarCol}>
                        <View style={styles.barTrack}>
                          {!isZero && (
                            <View
                              style={[
                                styles.barFill,
                                {
                                  height: `${heightPct}%`,
                                  backgroundColor: isOver ? "#e53935" : theme.colors.accent,
                                },
                              ]}
                            />
                          )}
                        </View>
                        <Text style={styles.barDayLabel}>{day.day.slice(8)}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
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
    backBtnPlaceholder: {
      width: 40,
    },
    appbarTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.text,
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
      gap: 12,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cardSubtitle: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.colors.muted,
      letterSpacing: 0.6,
    },
    currentGoalHint: {
      fontSize: 12,
      color: theme.colors.muted,
      fontWeight: "500",
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeLearned: {
      backgroundColor: "#2e7d3222",
    },
    badgeEstimate: {
      backgroundColor: "#0288d122",
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    badgeTextLearned: {
      color: "#2e7d32",
    },
    badgeTextEstimate: {
      color: "#0288d1",
    },
    tdeeValue: {
      fontSize: 34,
      fontWeight: "800",
      color: theme.colors.text,
      letterSpacing: -0.5,
    },
    tdeeUnit: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.muted,
    },
    tdeeExplanation: {
      fontSize: 13,
      color: theme.colors.muted,
      lineHeight: 18,
    },
    suggestedNumbersRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface2,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 8,
    },
    targetNumberBox: {
      flex: 1,
      alignItems: "center",
      gap: 2,
    },
    suggestedNumber: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.colors.text,
    },
    suggestedLabel: {
      fontSize: 12,
      color: theme.colors.muted,
      fontWeight: "500",
    },
    targetDivider: {
      width: 1,
      height: 32,
      backgroundColor: theme.colors.border,
    },
    targetExplanation: {
      fontSize: 13,
      color: theme.colors.muted,
      lineHeight: 18,
    },
    acceptBtn: {
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 4,
    },
    acceptBtnText: {
      color: theme.colors.accentText,
      fontSize: 14,
      fontWeight: "700",
    },
    timeframeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cardSectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
    },
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface2,
      borderRadius: 10,
      padding: 3,
    },
    segmentBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    segmentActive: {
      backgroundColor: theme.colors.surface,
    },
    segmentText: {
      fontSize: 12,
      color: theme.colors.muted,
      fontWeight: "600",
    },
    segmentTextActive: {
      color: theme.colors.text,
    },
    macroGrid: {
      flexDirection: "row",
      gap: 8,
    },
    macroPill: {
      flex: 1,
      backgroundColor: theme.colors.surface2,
      borderRadius: 10,
      padding: 10,
      alignItems: "center",
      gap: 4,
    },
    macroLabel: {
      fontSize: 11,
      color: theme.colors.muted,
      fontWeight: "500",
    },
    macroValue: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.text,
    },
    adherenceBox: {
      backgroundColor: theme.colors.surface2,
      borderRadius: 12,
      padding: 12,
      gap: 8,
      marginTop: 4,
    },
    adherenceHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    adherenceTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text,
    },
    adherencePct: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.colors.accent,
    },
    progressBarTrack: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      overflow: "hidden",
    },
    progressBarFill: {
      height: 8,
      backgroundColor: theme.colors.accent,
      borderRadius: 4,
    },
    adherenceSubtitle: {
      fontSize: 12,
      color: theme.colors.muted,
    },
    chartSubtitle: {
      fontSize: 12,
      color: theme.colors.muted,
      marginTop: -4,
    },
    emptyChart: {
      paddingVertical: 24,
      alignItems: "center",
    },
    emptyChartText: {
      fontSize: 13,
      color: theme.colors.muted,
    },
    chartContainer: {
      marginTop: 8,
    },
    chartBarsRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      height: 120,
      gap: 8,
      paddingTop: 10,
    },
    chartBarCol: {
      alignItems: "center",
      gap: 4,
      width: 18,
    },
    barTrack: {
      width: 14,
      height: 90,
      backgroundColor: theme.colors.surface2,
      borderRadius: 4,
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    barFill: {
      width: 14,
      borderRadius: 4,
    },
    barDayLabel: {
      fontSize: 9,
      color: theme.colors.muted,
    },
  });
}
