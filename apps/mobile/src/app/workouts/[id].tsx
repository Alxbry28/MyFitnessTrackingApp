import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { ExerciseArtThumb } from "@/modules/workouts/components/ExerciseArtThumb";
import { ExerciseGuideModal } from "@/modules/workouts/components/ExerciseGuideModal";
import { useActiveWorkout } from "@/modules/workouts/hooks/useActiveWorkout";
import {
  formatDuration,
  type SetPerformance,
} from "@/modules/workouts/services/workoutCalc";
import type { Exercise, SessionExercise, WorkoutSet } from "@/modules/workouts/types/workouts";

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

function formatStartTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

export default function ActiveWorkoutScreen() {
  const { id, addExerciseId } = useLocalSearchParams<{ id: string; addExerciseId?: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();

  const {
    session,
    loading,
    addSet,
    updateSet,
    deleteSet,
    moveExercise,
    deleteExercise,
    pauseWorkout,
    resumeWorkout,
    restartWorkout,
    discardWorkout,
    finishWorkout,
    updateName,
    updateNotes,
  } = useActiveWorkout(id);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState("");
  const [notesText, setNotesText] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // Form Guide Modal State
  const [selectedGuideExercise, setSelectedGuideExercise] = useState<Exercise | null>(null);

  // Floating Rest Timer State
  const DEFAULT_REST_SEC = 120; // 02:00
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState(DEFAULT_REST_SEC);

  // If id is "index" or invalid route, redirect to workouts hub
  useEffect(() => {
    if (id === "index") {
      router.replace("/workouts" as any);
    }
  }, [id]);

  // If already completed, redirect to summary
  useEffect(() => {
    if (session && session.endedAt) {
      router.replace({
        pathname: "/workouts/summary/[id]" as any,
        params: { id: session.id },
      });
    }
  }, [session]);

  // Auto-add exercise if returning from exercise picker with addExerciseId
  useEffect(() => {
    if (addExerciseId && session) {
      const alreadyHas = session.exercises?.some((e) => e.exercise.id === addExerciseId);
      if (!alreadyHas) {
        void addSet(addExerciseId);
      }
    }
  }, [addExerciseId, session, addSet]);

  // Elapsed session time
  const isPaused = Boolean(session?.isPaused);
  const startedAt = session?.startedAt;
  const lastResumedAt = session?.lastResumedAt;
  const elapsedSec = session?.elapsedSec ?? 0;
  const [elapsed, setElapsed] = useState(elapsedSec);
  const isNotStarted = isPaused && elapsed === 0;

  useEffect(() => {
    if (!startedAt || session?.endedAt || isPaused) {
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
  }, [startedAt, lastResumedAt, elapsedSec, isPaused, session?.endedAt]);

  // Rest timer countdown
  const isRestActive = restRemaining !== null;
  useEffect(() => {
    if (!isRestActive) return;

    const interval = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev === null || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRestActive]);

  const handleStartRest = (sec = DEFAULT_REST_SEC) => {
    setRestDuration(sec);
    setRestRemaining(sec);
  };

  const handleAdjustRest = (deltaSec: number) => {
    setRestRemaining((prev) => {
      const current = prev ?? restDuration;
      const next = Math.max(0, current + deltaSec);
      return next === 0 ? null : next;
    });
  };

  const handleSkipRest = () => {
    setRestRemaining(null);
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
          onPress={() => router.replace("/workouts" as any)}
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

  const handleFinish = async () => {
    Alert.alert(
      "Finish workout?",
      `Complete ${session.name} (${formatDuration(Math.max(1, Math.round(elapsed / 60)))})?`,
      [
        { text: "Keep going", style: "cancel" },
        {
          text: "Finish",
          style: "default",
          onPress: async () => {
            try {
              setFinishing(true);
              const finalNotes = notesText !== null ? notesText.trim() : (session.notes ?? undefined);
              await finishWorkout(finalNotes || undefined, elapsed);
              router.replace({
                pathname: "/workouts/summary/[id]" as any,
                params: { id: session.id },
              });
            } catch {
              Alert.alert("Error", "Could not finish workout.");
            } finally {
              setFinishing(false);
            }
          },
        },
      ],
    );
  };

  const handlePause = async () => {
    try {
      await pauseWorkout(elapsed);
    } catch {
      Alert.alert("Error", "Could not pause workout.");
    }
  };

  const handleResume = async () => {
    try {
      await resumeWorkout();
    } catch {
      Alert.alert("Error", "Could not resume workout.");
    }
  };

  const handleRestart = () => {
    Alert.alert(
      "Restart workout timer?",
      "Reset workout elapsed time back to 00:00?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restart",
          style: "destructive",
          onPress: async () => {
            try {
              await restartWorkout();
            } catch {
              Alert.alert("Error", "Could not restart workout timer.");
            }
          },
        },
      ],
    );
  };

  const handleStop = () => {
    Alert.alert(
      "Stop workout",
      "What would you like to do with this workout session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard & Exit",
          style: "destructive",
          onPress: async () => {
            try {
              await discardWorkout();
              router.replace("/workouts" as any);
            } catch {
              Alert.alert("Error", "Could not discard workout.");
            }
          },
        },
        {
          text: "Finish & Save",
          style: "default",
          onPress: handleFinish,
        },
      ],
    );
  };

  const handleTitleSubmit = () => {
    setEditingTitle(false);
    if (titleText.trim() && titleText.trim() !== session.name) {
      void updateName(titleText.trim());
    }
  };

  const exercises = session.exercises ?? [];
  const exerciseCount = exercises.length;
  const startTimeStr = formatStartTime(session.startedAt);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Top App Bar & Logger Bar (Frame 2) */}
      <View style={styles.loggerTop}>
        <View style={styles.backRow}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>‹ Workouts</Text>
          </Pressable>
        </View>

        <View style={styles.loggerBar}>
          <Pressable
            onPress={() => {
              setTitleText(session.name);
              setEditingTitle(true);
            }}
            style={styles.loggerTitleCol}
          >
            <View style={styles.titleRow}>
              <Text style={styles.sessionTitle} numberOfLines={1}>
                {session.name}
              </Text>
              <Text style={styles.editIcon}>✎</Text>
            </View>
            <Text style={styles.sessionMeta}>
              {isNotStarted
                ? `Ready to start · ${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"}`
                : `Started ${startTimeStr} · ${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"}`}
            </Text>
          </Pressable>

          {/* Timer pill */}
          <Pressable
            onPress={isPaused ? handleResume : handlePause}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={isNotStarted ? "Start workout timer" : isPaused ? "Resume workout" : "Pause workout"}
            style={[
              styles.timerPill,
              isNotStarted
                ? styles.timerPillNotStarted
                : isPaused
                  ? styles.timerPillPaused
                  : undefined,
            ]}
          >
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
                styles.timerPillText,
                isNotStarted
                  ? styles.timerPillTextNotStarted
                  : isPaused
                    ? styles.timerPillTextPaused
                    : undefined,
              ]}
            >
              {isNotStarted
                ? "START · 00:00"
                : isPaused
                  ? `PAUSED · ${formatSeconds(elapsed)}`
                  : formatSeconds(elapsed)}
            </Text>
          </Pressable>

          {/* Top Action Buttons: Start/Pause/Resume + Finish */}
          <View style={styles.topActionsCluster}>
            <Pressable
              onPress={isPaused ? handleResume : handlePause}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={isNotStarted ? "Start workout" : isPaused ? "Resume workout" : "Pause workout"}
              style={[
                styles.topPauseBtn,
                isNotStarted
                  ? styles.topStartBtn
                  : isPaused
                    ? styles.topResumeBtn
                    : undefined,
              ]}
            >
              <Text
                style={[
                  styles.topPauseBtnText,
                  isNotStarted
                    ? styles.topStartBtnText
                    : isPaused
                      ? styles.topResumeBtnText
                      : undefined,
                ]}
              >
                {isNotStarted ? "▶ Start" : isPaused ? "▶ Resume" : "⏸ Pause"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleFinish}
              accessibilityRole="button"
              disabled={finishing}
              style={[styles.finishBtn, isPaused && styles.finishBtnHighlighted]}
            >
              <Text style={styles.finishBtnText}>Finish</Text>
            </Pressable>
          </View>
        </View>

        {/* Workout Controls Bar: Restart & Stop */}
        <View style={styles.controlsBar}>
          <Pressable
            onPress={handleRestart}
            style={styles.controlBtn}
            accessibilityRole="button"
          >
            <Text style={styles.controlBtnText}>↺ Restart Timer</Text>
          </Pressable>

          <Pressable
            onPress={handleStop}
            style={[styles.controlBtn, styles.controlBtnStop]}
            accessibilityRole="button"
          >
            <Text style={styles.controlBtnTextStop}>⏹ Stop / Discard</Text>
          </Pressable>
        </View>

        {/* Floating/Docked Rest Timer Strip */}
        <View style={styles.restStrip}>
          <View style={styles.restLeft}>
            <Text style={styles.restLabel}>Rest timer · </Text>
            <Text style={styles.restTime}>
              {restRemaining !== null ? formatSeconds(restRemaining) : "00:00"}
            </Text>
            <Text style={styles.restTotal}> / {formatSeconds(restDuration)}</Text>
          </View>

          <View style={styles.restActions}>
            <Pressable
              onPress={() => handleAdjustRest(-15)}
              style={styles.restActionBtn}
              hitSlop={4}
            >
              <Text style={styles.restActionText}>-15s</Text>
            </Pressable>
            <Pressable
              onPress={() => handleAdjustRest(15)}
              style={styles.restActionBtn}
              hitSlop={4}
            >
              <Text style={styles.restActionText}>+15s</Text>
            </Pressable>
            <Pressable
              onPress={restRemaining !== null ? handleSkipRest : () => handleStartRest()}
              style={styles.restSkipBtn}
              hitSlop={4}
            >
              <Text style={styles.restSkipText}>
                {restRemaining !== null ? "Skip" : "Start"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.space[6] + insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise Cards */}
        {exercises.map((group, index) => (
          <ActiveExerciseCard
            key={group.exercise.id}
            group={group}
            canMoveUp={index > 0}
            canMoveDown={index < exercises.length - 1}
            onMoveUp={() => void moveExercise(group.exercise.id, "up")}
            onMoveDown={() => void moveExercise(group.exercise.id, "down")}
            onDeleteExercise={() => void deleteExercise(group.exercise.id)}
            onOpenGuide={(ex) => setSelectedGuideExercise(ex)}
            onAddSet={(weight, reps, isWarmup) =>
              void addSet(group.exercise.id, weight, reps, isWarmup)
            }
            onUpdateSet={(setId, updates) => void updateSet(setId, updates)}
            onDeleteSet={(setId) => void deleteSet(setId)}
            onSetCompleted={() => {
              if (isNotStarted) {
                void handleResume();
              }
              handleStartRest();
            }}
            styles={styles}
            theme={theme}
          />
        ))}

        {/* Add Exercise Action */}
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/workouts/exercises" as any,
              params: { pick: "1", sessionId: session.id },
            })
          }
          accessibilityRole="button"
          style={styles.addExerciseBtn}
        >
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
        </Pressable>

        {/* Workout Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>Workout Notes</Text>
          <TextInput
            value={notesText ?? session.notes ?? ""}
            onChangeText={setNotesText}
            onBlur={() => {
              if (notesText !== null) {
                void updateNotes(notesText.trim() || null);
              }
            }}
            placeholder="How did this workout feel? (optional)"
            placeholderTextColor={theme.colors.faint}
            multiline
            style={styles.notesInput}
          />
        </View>

        {/* Bottom Finish Button */}
        <Pressable
          onPress={handleFinish}
          disabled={finishing}
          accessibilityRole="button"
          style={styles.bottomFinishBtn}
        >
          <Text style={styles.bottomFinishBtnText}>✓ Finish Workout</Text>
        </Pressable>
      </ScrollView>

      {/* Edit Title Modal */}
      <Modal
        visible={editingTitle}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingTitle(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Workout</Text>
            <TextInput
              value={titleText}
              onChangeText={setTitleText}
              autoFocus
              selectTextOnFocus
              style={styles.modalInput}
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setEditingTitle(false)}
                style={[styles.modalBtn, styles.modalBtnCancel]}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleTitleSubmit}
                style={[styles.modalBtn, styles.modalBtnSave]}
              >
                <Text style={styles.modalBtnSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exercise Form Guide Modal */}
      <ExerciseGuideModal
        visible={selectedGuideExercise !== null}
        exercise={selectedGuideExercise}
        onClose={() => setSelectedGuideExercise(null)}
      />
    </View>
    </>
  );
}

function ActiveExerciseCard({
  group,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDeleteExercise,
  onOpenGuide,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onSetCompleted,
  styles,
  theme,
}: {
  group: SessionExercise;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDeleteExercise?: () => void;
  onOpenGuide?: (exercise: Exercise) => void;
  onAddSet: (weight?: number, reps?: number, isWarmup?: boolean) => void;
  onUpdateSet: (setId: string, updates: Partial<SetPerformance & { isCompleted?: boolean; isWarmup?: boolean }>) => void;
  onDeleteSet: (setId: string) => void;
  onSetCompleted: () => void;
  styles: Styles;
  theme: Theme;
}) {
  const { exercise, previousText, sets, hasPR } = group;

  // Calculate prefill values for "+ Add Set" button
  const completedSets = sets.filter((s) => s.isCompleted);
  const lastSet = completedSets[completedSets.length - 1] ?? sets[sets.length - 1];
  const prefillWeight = lastSet?.weightKg ?? (exercise.isBodyweight ? 0 : 20);
  const prefillReps = lastSet?.reps ?? 10;
  const prefillLabel = exercise.isBodyweight
    ? prefillWeight > 0
      ? `+${prefillWeight} kg × ${prefillReps}`
      : `BW × ${prefillReps}`
    : `${prefillWeight} kg × ${prefillReps}`;

  return (
    <View style={styles.exCard}>
      {/* Header */}
      <View style={styles.exHeader}>
        <Pressable
          onPress={() => onOpenGuide?.(exercise)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`View guide for ${exercise.name}`}
        >
          <ExerciseArtThumb
            muscleGroup={exercise.muscleGroup}
            equipment={exercise.equipment}
            guideId={exercise.guideId}
            name={exercise.name}
            size="sm"
            isCustom={!exercise.guideId && !exercise.id.startsWith("ex_")}
          />
        </Pressable>

        <Pressable
          onPress={() => onOpenGuide?.(exercise)}
          hitSlop={6}
          style={styles.exInfo}
          accessibilityRole="button"
          accessibilityLabel={`View guide for ${exercise.name}`}
        >
          <Text style={styles.exName}>
            {exercise.name} <Text style={{ fontSize: 11, color: theme.colors.faint }}>ℹ️</Text>
          </Text>
          <Text style={styles.exPrevHint}>
            {previousText ?? "First time logging this exercise"}
          </Text>
        </Pressable>

        {hasPR ? (
          <View style={styles.badgePr}>
            <Text style={styles.badgePrText}>🏆 PR</Text>
          </View>
        ) : exercise.isBodyweight ? (
          <View style={styles.badgeAcc}>
            <Text style={styles.badgeAccText}>BW + kg</Text>
          </View>
        ) : null}

        <View style={styles.exHeaderActions}>
          <Pressable
            disabled={!canMoveUp}
            onPress={onMoveUp}
            hitSlop={6}
            style={[styles.orderBtn, !canMoveUp && styles.orderBtnDisabled]}
            accessibilityLabel="Move exercise up"
          >
            <Text style={[styles.orderBtnText, !canMoveUp && styles.orderBtnTextDisabled]}>▲</Text>
          </Pressable>
          <Pressable
            disabled={!canMoveDown}
            onPress={onMoveDown}
            hitSlop={6}
            style={[styles.orderBtn, !canMoveDown && styles.orderBtnDisabled]}
            accessibilityLabel="Move exercise down"
          >
            <Text style={[styles.orderBtnText, !canMoveDown && styles.orderBtnTextDisabled]}>▼</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert(
                "Remove Exercise",
                `Remove ${exercise.name} and all its sets from this workout?`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Remove", style: "destructive", onPress: onDeleteExercise },
                ],
              );
            }}
            hitSlop={6}
            style={styles.removeExBtn}
            accessibilityLabel="Remove exercise"
          >
            <Text style={styles.removeExBtnText}>✕</Text>
          </Pressable>
        </View>
      </View>

      {/* Set Table */}
      <View style={styles.setTable}>
        {/* Table Header */}
        <View style={styles.setRowHead}>
          <Text style={[styles.setTh, styles.colNum]}>SET</Text>
          <Text style={[styles.setTh, styles.colPrev]}>PREVIOUS</Text>
          <Text style={[styles.setTh, styles.colInput]}>
            {exercise.isBodyweight ? "+KG" : "KG"}
          </Text>
          <Text style={[styles.setTh, styles.colInput]}>REPS</Text>
          <Text style={[styles.setTh, styles.colCheck]}>✓</Text>
        </View>

        {/* Set Rows */}
        {sets.map((set, index) => {
          // Previous set text
          const prevHint = previousText?.replace(/^Last:\s*/, "").split(", ")[index] ?? "-";

          return (
            <ActiveSetRow
              key={`${set.id}-${set.weightKg}-${set.reps}`}
              set={set}
              prevHint={prevHint}
              onUpdate={(updates) => onUpdateSet(set.id, updates)}
              onDelete={() => onDeleteSet(set.id)}
              onCompleted={onSetCompleted}
              styles={styles}
              theme={theme}
            />
          );
        })}
      </View>

      {/* Add Set Button */}
      <Pressable
        onPress={() => onAddSet(prefillWeight, prefillReps, false)}
        accessibilityRole="button"
        style={styles.addSetBtn}
      >
        <Text style={styles.addSetBtnText}>
          + Add Set (prefills {prefillLabel})
        </Text>
      </Pressable>
    </View>
  );
}

function ActiveSetRow({
  set,
  prevHint,
  onUpdate,
  onDelete,
  onCompleted,
  styles,
  theme,
}: {
  set: WorkoutSet;
  prevHint: string;
  onUpdate: (updates: { weightKg?: number; reps?: number; isCompleted?: boolean; isWarmup?: boolean }) => void;
  onDelete: () => void;
  onCompleted: () => void;
  styles: Styles;
  theme: Theme;
}) {
  const [weight, setWeight] = useState(
    set.weightKg !== null && set.weightKg !== undefined ? String(set.weightKg) : "",
  );
  const [reps, setReps] = useState(
    set.reps !== null && set.reps !== undefined ? String(set.reps) : "",
  );

  const handleWeightBlur = () => {
    const val = parseFloat(weight.trim().replace(",", "."));
    if (!isNaN(val) && val !== set.weightKg) {
      onUpdate({ weightKg: val });
    }
  };

  const handleRepsBlur = () => {
    const val = parseInt(reps.trim(), 10);
    if (!isNaN(val) && val !== set.reps) {
      onUpdate({ reps: val });
    }
  };

  const handleCheck = () => {
    const nextCompleted = !set.isCompleted;
    onUpdate({ isCompleted: nextCompleted });
    if (nextCompleted) {
      onCompleted();
    }
  };

  const toggleWarmup = () => {
    onUpdate({ isWarmup: !set.isWarmup });
  };

  return (
    <View style={[styles.setRow, set.isCompleted && styles.setRowDone]}>
      {/* Set Number / Warmup Indicator */}
      <Pressable
        onPress={toggleWarmup}
        accessibilityRole="button"
        hitSlop={4}
        style={[styles.setNumBox, set.isWarmup && styles.setNumWarmup, set.isCompleted && styles.setNumDone]}
      >
        <Text
          style={[
            styles.setNumText,
            set.isWarmup && styles.setNumWarmupText,
            set.isCompleted && styles.setNumDoneText,
          ]}
        >
          {set.isWarmup ? "W" : set.setNumber}
        </Text>
      </Pressable>

      {/* Previous Hint */}
      <Text style={styles.colPrevText} numberOfLines={1}>
        {prevHint}
      </Text>

      {/* Weight input */}
      <View style={styles.colInput}>
        <TextInput
          value={weight}
          onChangeText={setWeight}
          onBlur={handleWeightBlur}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={[styles.setInput, set.isCompleted && styles.setInputDone]}
          placeholder="0"
          placeholderTextColor={theme.colors.faint}
        />
      </View>

      {/* Reps input */}
      <View style={styles.colInput}>
        <TextInput
          value={reps}
          onChangeText={setReps}
          onBlur={handleRepsBlur}
          keyboardType="number-pad"
          selectTextOnFocus
          style={[styles.setInput, set.isCompleted && styles.setInputDone]}
          placeholder="0"
          placeholderTextColor={theme.colors.faint}
        />
      </View>

      {/* Checkbox button */}
      <Pressable
        onPress={handleCheck}
        onLongPress={() => {
          Alert.alert("Delete Set", `Delete set ${set.setNumber}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: onDelete },
          ]);
        }}
        accessibilityRole="button"
        style={[styles.setCheck, set.isCompleted && styles.setCheckDone]}
      >
        <Text style={[styles.setCheckText, set.isCompleted && styles.setCheckDoneText]}>
          ✓
        </Text>
      </Pressable>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

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

    // Logger Top Bar
    loggerTop: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[2],
      gap: theme.space[2],
    },
    backRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    backBtn: {
      paddingVertical: 2,
    },
    backText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.accentText,
      fontWeight: "500",
    },
    loggerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.space[2],
    },
    loggerTitleCol: {
      flex: 1,
      minWidth: 0,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    sessionTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: "700",
      color: theme.colors.text,
    },
    editIcon: {
      fontSize: 12,
      color: theme.colors.muted,
    },
    sessionMeta: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
      marginTop: 1,
    },
    timerPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.timerSoft,
    },
    timerPillPaused: {
      backgroundColor: theme.colors.estimateSoft,
    },
    pulseDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.colors.timer,
    },
    pulseDotPaused: {
      backgroundColor: theme.colors.estimate,
    },
    timerPillText: {
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      color: theme.colors.timer,
    },
    timerPillTextPaused: {
      color: theme.colors.estimate,
    },
    topActionsCluster: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    topPauseBtn: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    topStartBtn: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    topResumeBtn: {
      backgroundColor: theme.colors.okSoft,
      borderColor: theme.colors.ok,
    },
    topPauseBtnText: {
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      color: theme.colors.text,
    },
    topStartBtnText: {
      color: theme.colors.accentInk,
      fontWeight: "700",
    },
    topResumeBtnText: {
      color: theme.colors.ok,
    },
    timerPillNotStarted: {
      backgroundColor: theme.colors.surface2,
    },
    timerPillTextNotStarted: {
      color: theme.colors.muted,
    },
    pulseDotNotStarted: {
      backgroundColor: theme.colors.muted,
    },
    finishBtnHighlighted: {
      borderWidth: 1,
      borderColor: theme.colors.ok,
    },
    controlsBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[2],
      paddingTop: 4,
    },
    controlBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    controlBtnStop: {
      borderColor: theme.colors.border,
    },
    controlBtnText: {
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      color: theme.colors.text,
    },
    controlBtnTextStop: {
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      color: theme.colors.over,
    },
    bottomFinishBtn: {
      backgroundColor: theme.colors.ok,
      borderRadius: theme.radius.md,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.space[2],
    },
    bottomFinishBtnText: {
      color: theme.colors.accentInk,
      fontWeight: "700",
      fontSize: theme.fontSize.md,
    },
    finishBtn: {
      backgroundColor: theme.colors.ok,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: theme.radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    finishBtnText: {
      color: theme.colors.accentInk,
      fontWeight: "700",
      fontSize: theme.fontSize.sm,
    },

    // Rest Strip
    restStrip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.space[3],
      paddingVertical: 6,
    },
    restLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    restLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
    },
    restTime: {
      fontSize: theme.fontSize.sm,
      fontWeight: "700",
      color: theme.colors.timer,
    },
    restTotal: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
    },
    restActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    restActionBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    restActionText: {
      fontSize: theme.fontSize.xs,
      fontWeight: "600",
      color: theme.colors.muted,
    },
    restSkipBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    restSkipText: {
      fontSize: theme.fontSize.xs,
      fontWeight: "600",
      color: theme.colors.accentText,
    },

    // Content Scroll
    content: {
      paddingHorizontal: theme.space[4],
      paddingTop: theme.space[3],
      gap: theme.space[3],
    },

    // Exercise Card
    exCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.space[3],
      gap: theme.space[2],
    },
    exHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[3],
    },
    exInfo: {
      flex: 1,
      minWidth: 0,
    },
    exName: {
      fontSize: theme.fontSize.md,
      fontWeight: "600",
      color: theme.colors.accentText,
    },
    exPrevHint: {
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
    badgeAcc: {
      backgroundColor: theme.colors.accentSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radius.pill,
    },
    badgeAccText: {
      fontSize: theme.fontSize.xs,
      fontWeight: "600",
      color: theme.colors.accentText,
    },
    exHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    orderBtn: {
      width: 26,
      height: 26,
      borderRadius: 6,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    orderBtnDisabled: {
      opacity: 0.3,
    },
    orderBtnText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.text,
    },
    orderBtnTextDisabled: {
      color: theme.colors.muted,
    },
    removeExBtn: {
      width: 26,
      height: 26,
      borderRadius: 6,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 2,
    },
    removeExBtnText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.over,
    },

    // Set Table
    setTable: {
      gap: 4,
      marginTop: 4,
    },
    setRowHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 6,
      paddingBottom: 2,
    },
    setTh: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.faint,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    colNum: {
      width: 26,
      textAlign: "center",
    },
    colPrev: {
      flex: 1,
    },
    colInput: {
      width: 58,
      alignItems: "center",
    },
    colCheck: {
      width: 32,
      textAlign: "right",
    },

    // Set Row
    setRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: theme.radius.sm,
      backgroundColor: "transparent",
    },
    setRowDone: {
      backgroundColor: theme.colors.okSoft,
    },
    setNumBox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      backgroundColor: theme.colors.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    setNumWarmup: {
      backgroundColor: theme.colors.warmupSoft,
    },
    setNumDone: {
      backgroundColor: theme.colors.ok,
    },
    setNumText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.muted,
    },
    setNumWarmupText: {
      color: theme.colors.warmup,
    },
    setNumDoneText: {
      color: theme.colors.accentInk,
    },
    colPrevText: {
      flex: 1,
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
    },
    setInput: {
      width: "100%",
      height: 30,
      borderRadius: 6,
      backgroundColor: theme.colors.bg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      textAlign: "center",
      padding: 0,
    },
    setInputDone: {
      backgroundColor: "transparent",
      borderColor: "transparent",
    },
    setCheck: {
      width: 28,
      height: 28,
      borderRadius: 7,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    setCheckDone: {
      backgroundColor: theme.colors.ok,
      borderColor: theme.colors.ok,
    },
    setCheckText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.faint,
    },
    setCheckDoneText: {
      color: theme.colors.accentInk,
    },

    // Add Set
    addSetBtn: {
      height: 34,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surface2,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    addSetBtnText: {
      fontSize: theme.fontSize.xs,
      fontWeight: "600",
      color: theme.colors.text,
    },

    // Add Exercise
    addExerciseBtn: {
      height: 44,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    addExerciseText: {
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.accentText,
    },

    // Notes
    notesCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.space[3],
      gap: theme.space[2],
    },
    notesLabel: {
      fontSize: theme.fontSize.xs,
      fontWeight: "600",
      color: theme.colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    notesInput: {
      minHeight: 48,
      fontSize: theme.fontSize.sm,
      color: theme.colors.text,
      lineHeight: 20,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
      alignItems: "center",
      justifyContent: "center",
      padding: theme.space[4],
    },
    modalCard: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.space[4],
      gap: theme.space[3],
    },
    modalTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: "700",
      color: theme.colors.text,
    },
    modalInput: {
      height: 42,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surface2,
      color: theme.colors.text,
      paddingHorizontal: theme.space[3],
      fontSize: theme.fontSize.sm,
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.space[2],
    },
    modalBtn: {
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[2],
      borderRadius: theme.radius.sm,
    },
    modalBtnCancel: {
      backgroundColor: "transparent",
    },
    modalBtnCancelText: {
      color: theme.colors.muted,
      fontWeight: "600",
      fontSize: theme.fontSize.sm,
    },
    modalBtnSave: {
      backgroundColor: theme.colors.accent,
    },
    modalBtnSaveText: {
      color: theme.colors.accentInk,
      fontWeight: "600",
      fontSize: theme.fontSize.sm,
    },
  });
}
