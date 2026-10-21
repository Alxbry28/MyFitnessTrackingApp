import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
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
import { workoutRepo } from "@/modules/workouts/repositories/workoutRepo";
import {
  calculateSessionStats,
  formatDuration,
  formatKg,
} from "@/modules/workouts/services/workoutCalc";
import type { WorkoutSession } from "@/modules/workouts/types/workouts";

function formatSessionDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function WorkoutsHubScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [active, past] = await Promise.all([
        workoutRepo.getActiveSession(db),
        workoutRepo.listHistory(db, 30),
      ]);
      setActiveSession(active);
      setHistory(past);
    } catch {
      // Keep previous state
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const handleStartWorkout = async () => {
    if (activeSession) {
      Alert.alert(
        "Active workout in progress",
        `You already have "${activeSession.name}" in progress. Would you like to resume it?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Resume",
            style: "default",
            onPress: () => {
              router.push({
                pathname: "/workouts/[id]" as any,
                params: { id: activeSession.id },
              });
            },
          },
        ],
      );
      return;
    }

    setStarting(true);
    try {
      const newId = await workoutRepo.startSession(db);
      router.push({
        pathname: "/workouts/[id]" as any,
        params: { id: newId },
      });
    } catch {
      Alert.alert("Error", "Could not start workout session.");
    } finally {
      setStarting(false);
    }
  };

  const handleDiscardActive = () => {
    if (!activeSession) return;
    Alert.alert(
      "Discard workout?",
      `Are you sure you want to discard "${activeSession.name}"? This cannot be undone.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            try {
              await workoutRepo.deleteSession(db, activeSession.id);
              setActiveSession(null);
            } catch {
              Alert.alert("Error", "Could not discard workout.");
            }
          },
        },
      ],
    );
  };

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
          <Text style={styles.backText}>‹ More</Text>
        </Pressable>
        <Text style={styles.appbarTitle}>Workouts</Text>
        <Pressable
          onPress={() => router.push("/workouts/exercises" as any)}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.headerActionBtn}
        >
          <Text style={styles.headerActionText}>Library</Text>
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
            {/* Active Session Card */}
            {activeSession && (
              <View style={styles.activeCard}>
                <View style={styles.activeBadgeRow}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.activeBadgeText}>IN PROGRESS</Text>
                </View>
                <Text style={styles.activeTitle}>{activeSession.name}</Text>
                <Text style={styles.activeSubtitle}>
                  Started {formatSessionDate(activeSession.startedAt)}
                  {activeSession.exercises && activeSession.exercises.length > 0
                    ? ` · ${activeSession.exercises.length} exercise${activeSession.exercises.length === 1 ? "" : "s"}`
                    : ""}
                </Text>

                <View style={styles.activeActionsRow}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/workouts/[id]" as any,
                        params: { id: activeSession.id },
                      })
                    }
                    accessibilityRole="button"
                    style={styles.resumeBtn}
                  >
                    <Text style={styles.resumeBtnText}>Resume Workout</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDiscardActive}
                    accessibilityRole="button"
                    hitSlop={8}
                    style={styles.discardBtn}
                  >
                    <Text style={styles.discardBtnText}>Discard</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Quick Actions */}
            <View style={styles.actionsSection}>
              <Pressable
                onPress={handleStartWorkout}
                disabled={starting}
                accessibilityRole="button"
                style={styles.startBtn}
              >
                <Text style={styles.startBtnText}>
                  {starting ? "Starting..." : "+ Start Empty Workout"}
                </Text>
              </Pressable>
            </View>

            {/* History Section */}
            <View style={styles.historySection}>
              <Text style={styles.sectionHeader}>History</Text>

              {history.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No workouts yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Logged workouts will appear here with exercises, sets, volume, and notes.
                  </Text>
                </View>
              ) : (
                history.map((session) => {
                  const stats = calculateSessionStats(session);
                  const exSummary = (session.exercises ?? [])
                    .map((e) => `${e.exercise.name} (${e.sets.length})`)
                    .join(", ");

                  return (
                    <Pressable
                      key={session.id}
                      onPress={() =>
                        router.push({
                          pathname: "/workouts/[id]" as any,
                          params: { id: session.id },
                        })
                      }
                      accessibilityRole="button"
                      style={styles.historyCard}
                    >
                      <View style={styles.historyHeader}>
                        <View style={styles.historyTitleCol}>
                          <Text style={styles.historyTitle}>{session.name}</Text>
                          <Text style={styles.historyDate}>
                            {formatSessionDate(session.startedAt)}
                          </Text>
                        </View>
                        <Text style={styles.historyChevron}>›</Text>
                      </View>

                      {/* Stats Row */}
                      <View style={styles.historyStatsRow}>
                        {stats.durationMinutes > 0 && (
                          <View style={styles.statPill}>
                            <Text style={styles.statLabel}>Time</Text>
                            <Text style={styles.statValue}>
                              {formatDuration(stats.durationMinutes)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.statPill}>
                          <Text style={styles.statLabel}>Sets</Text>
                          <Text style={styles.statValue}>{stats.totalSets}</Text>
                        </View>
                        {stats.totalVolumeKg > 0 && (
                          <View style={styles.statPill}>
                            <Text style={styles.statLabel}>Volume</Text>
                            <Text style={styles.statValue}>
                              {formatKg(stats.totalVolumeKg)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Exercises List Summary */}
                      {exSummary ? (
                        <Text numberOfLines={2} style={styles.exSummaryText}>
                          {exSummary}
                        </Text>
                      ) : null}

                      {/* Notes snippet */}
                      {session.notes ? (
                        <Text numberOfLines={1} style={styles.notesSnippet}>
                          “{session.notes}”
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </View>
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
      fontSize: 13,
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
    activeCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      padding: 16,
      gap: 8,
    },
    activeBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    pulseDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.accent,
    },
    activeBadgeText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.colors.accent,
      letterSpacing: 0.8,
    },
    activeTitle: {
      fontSize: 19,
      fontWeight: "800",
      color: theme.colors.text,
    },
    activeSubtitle: {
      fontSize: 13,
      color: theme.colors.muted,
    },
    activeActionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 8,
    },
    resumeBtn: {
      flex: 1,
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    resumeBtnText: {
      color: theme.colors.accentText,
      fontSize: 15,
      fontWeight: "700",
    },
    discardBtn: {
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    discardBtnText: {
      color: theme.colors.faint,
      fontSize: 13,
      fontWeight: "500",
    },
    actionsSection: {
      gap: 10,
    },
    startBtn: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      paddingVertical: 14,
      alignItems: "center",
    },
    startBtnText: {
      color: theme.colors.accent,
      fontSize: 16,
      fontWeight: "700",
    },
    historySection: {
      gap: 12,
      marginTop: 8,
    },
    sectionHeader: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 24,
      alignItems: "center",
      gap: 6,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.text,
    },
    emptySubtitle: {
      fontSize: 13,
      color: theme.colors.muted,
      textAlign: "center",
      lineHeight: 18,
    },
    historyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      gap: 10,
    },
    historyHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    historyTitleCol: {
      flex: 1,
      gap: 2,
    },
    historyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
    },
    historyDate: {
      fontSize: 12,
      color: theme.colors.muted,
    },
    historyChevron: {
      fontSize: 20,
      color: theme.colors.faint,
      marginLeft: 8,
    },
    historyStatsRow: {
      flexDirection: "row",
      gap: 8,
    },
    statPill: {
      backgroundColor: theme.colors.surface2,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statLabel: {
      fontSize: 11,
      color: theme.colors.muted,
      fontWeight: "500",
    },
    statValue: {
      fontSize: 12,
      color: theme.colors.text,
      fontWeight: "700",
    },
    exSummaryText: {
      fontSize: 12,
      color: theme.colors.muted,
      lineHeight: 16,
    },
    notesSnippet: {
      fontSize: 12,
      fontStyle: "italic",
      color: theme.colors.faint,
    },
  });
}
