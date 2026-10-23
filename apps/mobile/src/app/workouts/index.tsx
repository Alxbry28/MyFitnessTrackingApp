import { router, Stack, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
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
import { exerciseRepo } from "@/modules/workouts/repositories/exerciseRepo";
import { routineRepo } from "@/modules/workouts/repositories/routineRepo";
import { workoutRepo } from "@/modules/workouts/repositories/workoutRepo";
import {
  calculateSessionStats,
  formatDuration,
  formatKg,
} from "@/modules/workouts/services/workoutCalc";
import type { WorkoutRoutine, WorkoutSession } from "@/modules/workouts/types/workouts";

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const dayStr = d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${dayStr} · ${timeStr}`;
  } catch {
    return iso;
  }
}

function formatMonthYear(d = new Date()): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function WorkoutsHubScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [selectedSplit, setSelectedSplit] = useState<string>("All");
  const [thisWeekCount, setThisWeekCount] = useState(0);
  const [totalExercises, setTotalExercises] = useState(17);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [active, past, weekCount, allEx, allRoutines] = await Promise.all([
        workoutRepo.getActiveSession(db),
        workoutRepo.listHistory(db, 30),
        workoutRepo.getThisWeekCount(db),
        exerciseRepo.list(db),
        routineRepo.listRoutines(db),
      ]);
      setActiveSession(active);
      setHistory(past);
      setThisWeekCount(weekCount);
      setTotalExercises(allEx.length);
      setRoutines(allRoutines);
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

  const isPaused = Boolean(activeSession?.isPaused);
  const startedAt = activeSession?.startedAt;
  const lastResumedAt = activeSession?.lastResumedAt;
  const elapsedSec = activeSession?.elapsedSec ?? 0;
  const [elapsed, setElapsed] = useState(elapsedSec);
  const isNotStarted = isPaused && elapsed === 0;

  useEffect(() => {
    if (!startedAt || isPaused) {
      const timer = setTimeout(() => {
        setElapsed(elapsedSec);
      }, 0);
      return () => clearTimeout(timer);
    }

    const baseMs = lastResumedAt
      ? new Date(lastResumedAt).getTime()
      : new Date(startedAt).getTime();

    const tick = () => {
      const additional = Math.max(0, Math.floor((Date.now() - baseMs) / 1000));
      setElapsed(elapsedSec + additional);
    };

    const initialTimer = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [startedAt, lastResumedAt, elapsedSec, isPaused]);

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

  const handleStartRoutine = async (routine: WorkoutRoutine) => {
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
      const newId = await routineRepo.startWorkoutFromRoutine(db, routine.id);
      router.push({
        pathname: "/workouts/[id]" as any,
        params: { id: newId },
      });
    } catch {
      Alert.alert("Error", `Could not start ${routine.name}.`);
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

  // Find next uncompleted set hint for active banner
  const getActiveNextSetHint = () => {
    if (!activeSession?.exercises || activeSession.exercises.length === 0) {
      return "Empty workout · Add your first exercise";
    }
    for (const exGroup of activeSession.exercises) {
      const nextUncompleted = exGroup.sets.find((s) => !s.isCompleted);
      if (nextUncompleted) {
        return `${exGroup.exercise.name} · Set ${nextUncompleted.setNumber} of ${exGroup.sets.length} next`;
      }
    }
    const lastEx = activeSession.exercises[activeSession.exercises.length - 1]!;
    return `${lastEx.exercise.name} · All sets completed`;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Top Navigation Row */}
      <View style={styles.topNavRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹ More</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/workouts/exercises" as any)}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.exercisesLink}>Exercises ({totalExercises})</Text>
        </Pressable>
      </View>

      {/* App Bar */}
      <View style={styles.appbar}>
        <Text style={styles.appbarTitle}>Workouts</Text>
        <Text style={styles.appbarSub}>
          {thisWeekCount} {thisWeekCount === 1 ? "this week" : "this week"}
        </Text>
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
            {/* Active Session Resume Banner (Frame 1) */}
            {activeSession && (
              <View style={styles.activeBanner}>
                <View style={styles.bannerHeader}>
                  <View style={styles.pulseRow}>
                    <View
                      style={[
                        styles.pulseDot,
                        isNotStarted
                          ? styles.pulseDotNotStarted
                          : isPaused
                            ? styles.pulseDotPaused
                            : undefined,
                      ]}
                    />
                    <Text
                      style={[
                        styles.pulseText,
                        isNotStarted
                          ? styles.pulseTextNotStarted
                          : isPaused
                            ? styles.pulseTextPaused
                            : undefined,
                      ]}
                    >
                      {isNotStarted
                        ? "Workout ready to start"
                        : isPaused
                          ? "Workout paused"
                          : "Workout in progress"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.timerBadge,
                      isNotStarted
                        ? styles.timerBadgeNotStarted
                        : isPaused
                          ? styles.timerBadgePaused
                          : undefined,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timerBadgeText,
                        isNotStarted
                          ? styles.timerBadgeTextNotStarted
                          : isPaused
                            ? styles.timerBadgeTextPaused
                            : undefined,
                      ]}
                    >
                      {isNotStarted ? "00:00" : formatTimer(elapsed)}
                    </Text>
                  </View>
                </View>

                <View>
                  <Text style={styles.activeTitle}>{activeSession.name}</Text>
                  <Text style={styles.activeSub}>{getActiveNextSetHint()}</Text>
                </View>

                <View style={styles.btnRow}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/workouts/[id]" as any,
                        params: { id: activeSession.id },
                      })
                    }
                    accessibilityRole="button"
                    style={[styles.btn, styles.btnPrimary, styles.btnSm]}
                  >
                    <Text style={styles.btnPrimaryText}>
                      {isNotStarted ? "Open & Start workout" : isPaused ? "Resume workout" : "Open workout"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleDiscardActive}
                    accessibilityRole="button"
                    style={[styles.btn, styles.btnDanger, styles.btnSm]}
                  >
                    <Text style={styles.btnDangerText}>Discard</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Quick Actions */}
            <View style={styles.btnRow}>
              <Pressable
                onPress={handleStartWorkout}
                disabled={starting}
                accessibilityRole="button"
                style={[styles.btn, styles.btnGhost, styles.btnGhostAccent, styles.btnSm]}
              >
                <Text style={styles.btnGhostAccentText}>
                  {starting ? "Starting..." : "+ Empty workout"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/workouts/routine-editor" as any)}
                accessibilityRole="button"
                style={[styles.btn, styles.btnGhost, styles.btnSm]}
              >
                <Text style={styles.btnGhostText}>+ New Routine</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/workouts/exercises" as any)}
                accessibilityRole="button"
                style={[styles.btn, styles.btnGhost, styles.btnSm]}
              >
                <Text style={styles.btnGhostText}>Exercises</Text>
              </Pressable>
            </View>

            {/* Workout Plans / Routines Section */}
            <View style={styles.sectionHeaderWrap}>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>Workout Plans & Routines</Text>
                <Text style={styles.sectionLabelDate}>{routines.length} total</Text>
              </View>

              {/* Split Filter Chips */}
              <View style={styles.splitFilterRow}>
                {["All", "Upper / Lower", "PPL", "Custom"].map((split) => {
                  const isSelected = selectedSplit === split;
                  return (
                    <Pressable
                      key={split}
                      onPress={() => setSelectedSplit(split)}
                      style={[
                        styles.splitFilterChip,
                        isSelected && styles.splitFilterChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.splitFilterChipText,
                          isSelected && styles.splitFilterChipTextActive,
                        ]}
                      >
                        {split}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Routine Cards List */}
              {routines
                .filter((r) => {
                  if (selectedSplit === "All") return true;
                  if (selectedSplit === "Upper / Lower") return r.folder === "Upper / Lower";
                  if (selectedSplit === "PPL") return r.folder === "PPL";
                  return r.folder !== "Upper / Lower" && r.folder !== "PPL";
                })
                .map((routine) => (
                  <View key={routine.id} style={styles.routineCard}>
                    <View style={styles.routineHeader}>
                      <View style={styles.routineTitleCol}>
                        <View style={styles.routineFolderRow}>
                          <Text style={styles.routineFolderBadge}>
                            {routine.folder || "Routine"}
                          </Text>
                        </View>
                        <Text style={styles.routineTitle}>{routine.name}</Text>
                      </View>
                      <View style={styles.routineExCountBadge}>
                        <Text style={styles.routineExCountText}>
                          {routine.exercises.length}{" "}
                          {routine.exercises.length === 1 ? "exercise" : "exercises"}
                        </Text>
                      </View>
                    </View>

                    {/* Ordered Exercise Summary Preview */}
                    <View style={styles.routinePreviewBox}>
                      {routine.exercises.length === 0 ? (
                        <Text style={styles.routinePreviewEmpty}>
                          No exercises assigned yet · Tap Edit to add
                        </Text>
                      ) : (
                        routine.exercises.map((re, idx) => (
                          <View key={re.id} style={styles.routineExPreviewRow}>
                            <Text style={styles.routineOrderNum}>#{idx + 1}</Text>
                            <Text style={styles.routineExName} numberOfLines={1}>
                              {re.exercise.name}
                            </Text>
                            <Text style={styles.routineExMuscle}>
                              {re.targetSets ?? 3} sets × {re.targetReps ?? 10} reps{re.targetWeightKg && re.targetWeightKg > 0 ? ` · ${re.targetWeightKg}kg` : ""}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.routineActionRow}>
                      <Pressable
                        onPress={() => void handleStartRoutine(routine)}
                        disabled={starting}
                        style={[styles.btn, styles.btnPrimary, styles.btnSm, { flex: 1 }]}
                      >
                        <Text style={styles.btnPrimaryText}>▶ Start Workout</Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/workouts/routine-editor" as any,
                            params: { id: routine.id },
                          })
                        }
                        style={[styles.btn, styles.btnGhost, styles.btnSm]}
                      >
                        <Text style={styles.btnGhostText}>✏ Edit / Reorder</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
            </View>

            {/* Recent Sessions Label */}
            <View style={styles.sectionLabelRow}>
              <Text style={styles.sectionLabel}>Recent Sessions</Text>
              <Text style={styles.sectionLabelDate}>{formatMonthYear()}</Text>
            </View>

            {/* History List */}
            {history.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No workouts yet</Text>
                <Text style={styles.emptySubtitle}>
                  Logged workouts will appear here with exercises, sets, volume, and PR highlights.
                </Text>
              </View>
            ) : (
              history.map((session) => {
                const stats = calculateSessionStats(session);
                const prCount = session.prCount ?? 0;

                return (
                  <Pressable
                    key={session.id}
                    onPress={() =>
                      router.push({
                        pathname: "/workouts/summary/[id]" as any,
                        params: { id: session.id },
                      })
                    }
                    accessibilityRole="button"
                    style={styles.sessionCard}
                  >
                    {/* Head */}
                    <View style={styles.sessionHead}>
                      <View style={styles.sessionHeadCol}>
                        <Text style={styles.sessionTitle}>{session.name}</Text>
                        <Text style={styles.sessionDate}>
                          {formatDateTime(session.startedAt)}
                        </Text>
                      </View>
                      {prCount > 0 ? (
                        <View style={styles.badgePr}>
                          <Text style={styles.badgePrText}>
                            🏆 {prCount} {prCount === 1 ? "PR" : "PRs"}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.badgeOk}>
                          <Text style={styles.badgeOkText}>Completed</Text>
                        </View>
                      )}
                    </View>

                    {/* Metrics Row */}
                    <View style={styles.metricsRow}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Duration</Text>
                        <Text style={styles.metricVal}>
                          {formatDuration(stats.durationMinutes)}
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Volume</Text>
                        <Text style={styles.metricVal}>
                          {formatKg(stats.totalVolumeKg)}
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Sets</Text>
                        <Text style={styles.metricVal}>{stats.totalSets} sets</Text>
                      </View>
                    </View>

                    {/* Exercise Previews */}
                    {session.exercises && session.exercises.length > 0 && (
                      <View style={styles.exPreviewList}>
                        {session.exercises.slice(0, 5).map((exGroup) => (
                          <View key={exGroup.exercise.id} style={styles.exPreviewRow}>
                            <Text style={styles.exPreviewName} numberOfLines={1}>
                              {exGroup.sets.length} × {exGroup.exercise.name}
                            </Text>
                            {exGroup.bestSetText ? (
                              <Text style={styles.exPreviewBest}>
                                Best: {exGroup.bestSetText}
                                {exGroup.hasPR ? " 🏆" : ""}
                              </Text>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
    </>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    topNavRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.space[4],
      paddingTop: theme.space[1],
    },
    backBtn: {
      paddingVertical: theme.space[1],
    },
    backText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.accentText,
      fontWeight: "500",
    },
    exercisesLink: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.accentText,
      fontWeight: "600",
    },
    appbar: {
      paddingHorizontal: theme.space[4],
      paddingTop: theme.space[2],
      paddingBottom: theme.space[3],
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    appbarTitle: {
      fontSize: theme.fontSize.xl,
      fontWeight: "700",
      color: theme.colors.text,
      letterSpacing: -0.5,
    },
    appbarSub: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.muted,
    },
    content: {
      paddingHorizontal: theme.space[4],
      gap: theme.space[3],
    },
    centerBox: {
      paddingVertical: theme.space[6],
      alignItems: "center",
      justifyContent: "center",
    },

    // Active Banner
    activeBanner: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.timer,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.space[4],
      gap: theme.space[3],
    },
    bannerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    pulseRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[2],
    },
    pulseDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.timer,
    },
    pulseDotPaused: {
      backgroundColor: theme.colors.estimate,
    },
    pulseDotNotStarted: {
      backgroundColor: theme.colors.muted,
    },
    pulseText: {
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      color: theme.colors.timer,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    pulseTextPaused: {
      color: theme.colors.estimate,
    },
    pulseTextNotStarted: {
      color: theme.colors.muted,
    },
    timerBadge: {
      backgroundColor: theme.colors.timerSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radius.pill,
    },
    timerBadgePaused: {
      backgroundColor: theme.colors.estimateSoft,
    },
    timerBadgeNotStarted: {
      backgroundColor: theme.colors.surface2,
    },
    timerBadgeText: {
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      color: theme.colors.timer,
    },
    timerBadgeTextPaused: {
      color: theme.colors.estimate,
    },
    timerBadgeTextNotStarted: {
      color: theme.colors.muted,
    },
    activeTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: "700",
      color: theme.colors.text,
    },
    activeSub: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.muted,
      marginTop: 2,
    },

    // Buttons
    btnRow: {
      flexDirection: "row",
      gap: theme.space[2],
    },
    btn: {
      height: 44,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      backgroundColor: theme.colors.surface2,
    },
    btnSm: {
      height: 38,
      borderRadius: theme.radius.sm,
    },
    btnPrimary: {
      backgroundColor: theme.colors.accent,
    },
    btnPrimaryText: {
      color: theme.colors.accentInk,
      fontWeight: "600",
      fontSize: theme.fontSize.sm,
    },
    btnDanger: {
      backgroundColor: theme.colors.overSoft,
    },
    btnDangerText: {
      color: theme.colors.over,
      fontWeight: "600",
      fontSize: theme.fontSize.sm,
    },
    btnGhost: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    btnGhostText: {
      color: theme.colors.text,
      fontWeight: "600",
      fontSize: theme.fontSize.sm,
    },
    btnGhostAccent: {
      borderColor: theme.colors.accent,
    },
    btnGhostAccentText: {
      color: theme.colors.accentText,
      fontWeight: "600",
      fontSize: theme.fontSize.sm,
    },

    // Section Label
    sectionLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: theme.space[1],
    },
    sectionLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      fontWeight: "600",
    },
    sectionLabelDate: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.faint,
      fontWeight: "500",
    },

    // Routines Section
    sectionHeaderWrap: {
      gap: theme.space[2],
      marginTop: theme.space[2],
      marginBottom: theme.space[2],
    },
    splitFilterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 4,
    },
    splitFilterChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    splitFilterChipActive: {
      backgroundColor: theme.colors.accentSoft,
      borderColor: theme.colors.accent,
    },
    splitFilterChipText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.muted,
    },
    splitFilterChipTextActive: {
      color: theme.colors.accentText,
    },
    routineCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.space[3],
      gap: 10,
    },
    routineHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    routineTitleCol: {
      flex: 1,
      minWidth: 0,
    },
    routineFolderRow: {
      marginBottom: 3,
    },
    routineFolderBadge: {
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: theme.colors.accentText,
    },
    routineTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: "700",
      color: theme.colors.text,
    },
    routineExCountBadge: {
      backgroundColor: theme.colors.surface2,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radius.pill,
    },
    routineExCountText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.muted,
    },
    routinePreviewBox: {
      backgroundColor: theme.colors.surface2,
      borderRadius: theme.radius.sm,
      padding: theme.space[2],
      gap: 4,
    },
    routinePreviewEmpty: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
      fontStyle: "italic",
    },
    routineExPreviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    routineOrderNum: {
      width: 20,
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.muted,
    },
    routineExName: {
      flex: 1,
      fontSize: theme.fontSize.xs,
      fontWeight: "600",
      color: theme.colors.text,
    },
    routineExMuscle: {
      fontSize: 10,
      color: theme.colors.faint,
      textTransform: "capitalize",
    },
    routineActionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[2],
      marginTop: 2,
    },

    // Session Card
    sessionCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[3],
      gap: theme.space[2],
    },
    sessionHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: theme.space[2],
    },
    sessionHeadCol: {
      flex: 1,
    },
    sessionTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: "600",
      color: theme.colors.text,
    },
    sessionDate: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
      marginTop: 2,
    },
    badgePr: {
      backgroundColor: theme.colors.prSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radius.pill,
    },
    badgePrText: {
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      color: theme.colors.pr,
    },
    badgeOk: {
      backgroundColor: theme.colors.okSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radius.pill,
    },
    badgeOkText: {
      fontSize: theme.fontSize.xs,
      fontWeight: "600",
      color: theme.colors.ok,
    },

    // Metrics Row
    metricsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: theme.space[2],
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    metricItem: {
      flex: 1,
    },
    metricLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
    },
    metricVal: {
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: 1,
    },

    // Exercise Preview
    exPreviewList: {
      paddingTop: theme.space[1],
      gap: 3,
    },
    exPreviewRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    exPreviewName: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.text,
      flex: 1,
      marginRight: theme.space[2],
    },
    exPreviewBest: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
    },

    // Empty Card
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.space[5],
      alignItems: "center",
      gap: theme.space[2],
    },
    emptyTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: "600",
      color: theme.colors.text,
    },
    emptySubtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.muted,
      textAlign: "center",
      lineHeight: 18,
    },
  });
}
