import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
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
import { exerciseRepo } from "@/modules/workouts/repositories/exerciseRepo";
import { workoutRepo } from "@/modules/workouts/repositories/workoutRepo";
import {
  calculateSessionStats,
  checkSetPR,
  estimate1RM,
  formatDuration,
  formatKg,
  type ExerciseHistoryMax,
} from "@/modules/workouts/services/workoutCalc";
import type { WorkoutSession } from "@/modules/workouts/types/workouts";

function formatSummaryDateRange(startedIso: string, endedIso?: string | null): string {
  try {
    const start = new Date(startedIso);
    const dayStr = start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const startTimeStr = start.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    if (!endedIso) return `${dayStr} · ${startTimeStr}`;

    const end = new Date(endedIso);
    const endTimeStr = end.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${dayStr} · ${startTimeStr} – ${endTimeStr}`;
  } catch {
    return startedIso;
  }
}

export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [historyMaxMap, setHistoryMaxMap] = useState<Record<string, ExerciseHistoryMax>>({});
  const [loading, setLoading] = useState(true);
  const [repeating, setRepeating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await workoutRepo.getSession(db, id);
      setSession(data);

      if (data?.exercises) {
        const histMap: Record<string, ExerciseHistoryMax> = {};
        await Promise.all(
          data.exercises.map(async (exGroup) => {
            const h = await exerciseRepo.getHistoryMax(db, exGroup.exercise.id, data.startedAt);
            histMap[exGroup.exercise.id] = h;
          }),
        );
        setHistoryMaxMap(histMap);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const handleDelete = () => {
    if (!session) return;
    Alert.alert(
      "Delete Workout",
      `Are you sure you want to delete "${session.name}"? This will remove this workout from history.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await workoutRepo.deleteSession(db, session.id);
              router.dismissTo("/workouts" as any);
            } catch {
              Alert.alert("Error", "Could not delete workout.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleRepeat = async () => {
    if (!session) return;
    try {
      setRepeating(true);
      const newId = await workoutRepo.repeatSession(db, session.id);
      router.replace({
        pathname: "/workouts/[id]" as any,
        params: { id: newId },
      });
    } catch {
      Alert.alert("Error", "Could not repeat workout.");
    } finally {
      setRepeating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top, padding: theme.space[4] }]}>
        <Text style={{ color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: "600", marginBottom: theme.space[3] }}>
          Workout not found
        </Text>
        <Pressable
          onPress={() => router.dismissTo("/workouts" as any)}
          style={{
            backgroundColor: theme.colors.accent,
            paddingHorizontal: theme.space[4],
            paddingVertical: theme.space[2],
            borderRadius: theme.radius.sm,
          }}
        >
          <Text style={{ color: theme.colors.accentInk, fontWeight: "700", fontSize: theme.fontSize.sm }}>
            Back to Workouts
          </Text>
        </Pressable>
      </View>
    );
  }

  const stats = calculateSessionStats(session);
  const prCount = session.prCount ?? 0;
  const exercises = session.exercises ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Top App Bar (Frame 4) */}
      <View style={styles.topNavRow}>
        <Pressable
          onPress={() => router.dismissTo("/workouts" as any)}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹ Workouts</Text>
        </Pressable>

        <Pressable
          onPress={handleDelete}
          disabled={deleting}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>

      {/* Summary Header */}
      <View style={styles.appbar}>
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>✓ Workout Completed</Text>
        </View>
        <Text style={styles.sessionTitle}>{session.name}</Text>
        <Text style={styles.sessionSub}>
          {formatSummaryDateRange(session.startedAt, session.endedAt)}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.space[6] + insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 4 Hero Stats Boxes */}
        <View style={styles.heroGrid}>
          {/* Duration */}
          <View style={styles.heroBox}>
            <Text style={styles.heroVal}>{formatDuration(stats.durationMinutes)}</Text>
            <Text style={styles.heroLbl}>Duration</Text>
          </View>

          {/* Volume */}
          <View style={styles.heroBox}>
            <Text style={styles.heroVal}>{formatKg(stats.totalVolumeKg)}</Text>
            <Text style={styles.heroLbl}>Volume</Text>
          </View>

          {/* Sets */}
          <View style={styles.heroBox}>
            <Text style={styles.heroVal}>{stats.totalSets}</Text>
            <Text style={styles.heroLbl}>Sets</Text>
          </View>

          {/* PRs */}
          <View style={[styles.heroBox, styles.heroBoxPr]}>
            <Text style={[styles.heroVal, styles.heroValPr]}>
              {prCount > 0 ? `${prCount} 🏆` : "0"}
            </Text>
            <Text style={[styles.heroLbl, styles.heroLblPr]}>PRs</Text>
          </View>
        </View>

        {/* Session Note (if any) */}
        {session.notes ? (
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>Session note: </Text>
            <Text style={styles.noteText}>{session.notes}</Text>
          </View>
        ) : null}

        {/* Exercise Breakdown Card */}
        <View style={styles.card}>
          {exercises.map((group, index) => {
            const histMax = historyMaxMap[group.exercise.id] ?? { maxWeight: 0, maxVolume: 0 };
            const completedSets = group.sets.filter((s) => s.isCompleted);

            // Compute Est 1RM
            let maxEst1RM = 0;
            for (const s of completedSets) {
              if (!s.isWarmup && s.weightKg && s.weightKg > 0) {
                const est = estimate1RM(s.weightKg, s.reps);
                if (est > maxEst1RM) maxEst1RM = est;
              }
            }

            return (
              <View
                key={group.exercise.id}
                style={[styles.sumEx, index > 0 && styles.sumExBorder]}
              >
                {/* Exercise Title Row */}
                <View style={styles.sumExHeader}>
                  <Text style={styles.sumExName} numberOfLines={1}>
                    {index + 1}. {group.exercise.name}
                  </Text>
                  {maxEst1RM > 0 ? (
                    <View style={styles.badgeEst}>
                      <Text style={styles.badgeEstText}>Est. 1RM {maxEst1RM} kg</Text>
                    </View>
                  ) : group.exercise.isBodyweight ? (
                    <Text style={styles.badgeSub}>
                      {completedSets.reduce((sum, s) => sum + (s.reps ?? 0), 0)} total reps
                    </Text>
                  ) : null}
                </View>

                {/* Set by Set Breakdown */}
                <View style={styles.setRowsWrap}>
                  {completedSets.map((s) => {
                    const pr = checkSetPR(s, histMax);

                    let setLabel = `Set ${s.setNumber}`;
                    if (s.isWarmup) setLabel = "Warmup";

                    let perfText = "";
                    if (group.exercise.isBodyweight) {
                      perfText = s.weightKg && s.weightKg > 0 ? `+${s.weightKg} kg × ${s.reps}` : `BW × ${s.reps}`;
                    } else {
                      perfText = `${s.weightKg ?? 0} kg × ${s.reps ?? 0}`;
                    }

                    return (
                      <View key={s.id} style={styles.sumSetRow}>
                        <Text style={styles.sumSetLabel}>{setLabel}</Text>
                        <View style={styles.sumSetRight}>
                          <Text style={styles.sumSetPerf}>{perfText}</Text>
                          {pr.isWeightPR && (
                            <View style={styles.badgePr}>
                              <Text style={styles.badgePrText}>🏆 Weight PR</Text>
                            </View>
                          )}
                          {pr.isVolumePR && (
                            <View style={styles.badgePr}>
                              <Text style={styles.badgePrText}>🏆 Volume PR</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {/* Repeat Workout Button */}
        <Pressable
          onPress={handleRepeat}
          disabled={repeating}
          accessibilityRole="button"
          style={styles.repeatBtn}
        >
          <Text style={styles.repeatBtnText}>
            {repeating ? "Starting..." : "Repeat this workout"}
          </Text>
        </Pressable>
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
    center: {
      alignItems: "center",
      justifyContent: "center",
    },
    topNavRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.space[4],
      paddingTop: theme.space[1],
    },
    backBtn: {
      paddingVertical: 2,
    },
    backText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.accentText,
      fontWeight: "500",
    },
    deleteText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.over,
      fontWeight: "600",
    },
    appbar: {
      paddingHorizontal: theme.space[4],
      paddingTop: theme.space[2],
      paddingBottom: theme.space[3],
    },
    completedBadge: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.okSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radius.pill,
      marginBottom: 6,
    },
    completedBadgeText: {
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      color: theme.colors.ok,
    },
    sessionTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: "700",
      color: theme.colors.text,
      letterSpacing: -0.3,
    },
    sessionSub: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
      marginTop: 2,
    },
    content: {
      paddingHorizontal: theme.space[4],
      gap: theme.space[3],
    },

    // 4-column Hero Grid
    heroGrid: {
      flexDirection: "row",
      gap: theme.space[2],
    },
    heroBox: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      paddingVertical: theme.space[2] + 2,
      paddingHorizontal: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    heroBoxPr: {
      backgroundColor: theme.colors.prSoft,
      borderColor: theme.colors.pr,
    },
    heroVal: {
      fontSize: theme.fontSize.md,
      fontWeight: "700",
      color: theme.colors.text,
    },
    heroValPr: {
      color: theme.colors.pr,
    },
    heroLbl: {
      fontSize: 10,
      color: theme.colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 2,
    },
    heroLblPr: {
      color: theme.colors.pr,
    },

    // Session Note Card
    noteCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[2] + 2,
      flexDirection: "row",
      flexWrap: "wrap",
    },
    noteLabel: {
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      color: theme.colors.text,
    },
    noteText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
      flex: 1,
      lineHeight: 18,
    },

    // Card & Exercise Breakdown
    card: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.space[3],
    },
    sumEx: {
      paddingVertical: theme.space[2],
      gap: 6,
    },
    sumExBorder: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginTop: theme.space[2],
    },
    sumExHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sumExName: {
      fontSize: theme.fontSize.sm,
      fontWeight: "700",
      color: theme.colors.accentText,
      flex: 1,
      marginRight: theme.space[2],
    },
    badgeEst: {
      backgroundColor: theme.colors.estimateSoft,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: theme.radius.pill,
    },
    badgeEstText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.estimate,
    },
    badgeSub: {
      fontSize: 11,
      color: theme.colors.muted,
    },

    // Sets list
    setRowsWrap: {
      gap: 4,
    },
    sumSetRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sumSetLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
    },
    sumSetRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    sumSetPerf: {
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      color: theme.colors.text,
    },
    badgePr: {
      backgroundColor: theme.colors.prSoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.radius.pill,
    },
    badgePrText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.pr,
    },

    // Repeat Button
    repeatBtn: {
      height: 48,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    repeatBtnText: {
      color: theme.colors.accentInk,
      fontWeight: "700",
      fontSize: theme.fontSize.sm,
    },
  });
}
