import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { useActiveWorkout } from "@/modules/workouts/hooks/useActiveWorkout";
import {
  formatDuration,
  type SetPerformance,
} from "@/modules/workouts/services/workoutCalc";
import type { SessionExercise, WorkoutSet } from "@/modules/workouts/types/workouts";

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
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
    finishWorkout,
    updateName,
    updateNotes,
  } = useActiveWorkout(id);

  // Local elapsed seconds timer
  const [elapsed, setElapsed] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState("");
  const [notesText, setNotesText] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // Auto-add exercise if returning from exercise picker with addExerciseId
  useEffect(() => {
    if (addExerciseId && session) {
      const alreadyHas = session.exercises?.some((e) => e.exercise.id === addExerciseId);
      if (!alreadyHas) {
        void addSet(addExerciseId);
      }
    }
  }, [addExerciseId, session, addSet]);

  const startedAt = session?.startedAt;
  const endedAt = session?.endedAt;

  useEffect(() => {
    if (!startedAt || endedAt) return;
    const start = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, endedAt]);

  if (loading || !session) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  const isCompletedSession = Boolean(session.endedAt);

  const handleFinish = async () => {
    if (isCompletedSession) {
      router.back();
      return;
    }

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
              await finishWorkout(finalNotes || undefined);
              router.dismissTo("/workouts" as any);
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

  const handleTitleSubmit = () => {
    setEditingTitle(false);
    if (titleText.trim() && titleText.trim() !== session.name) {
      void updateName(titleText.trim());
    }
  };

  const exercises = session.exercises ?? [];

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
          <Text style={styles.backText}>‹ Workouts</Text>
        </Pressable>

        <View style={styles.timerBox}>
          <Text style={styles.timerText}>{formatSeconds(elapsed)}</Text>
        </View>

        {!isCompletedSession && (
          <Pressable
            onPress={handleFinish}
            accessibilityRole="button"
            disabled={finishing}
            style={styles.finishBtn}
          >
            <Text style={styles.finishBtnText}>Finish</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.space[6] + insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Session Name header */}
        <View style={styles.titleSection}>
          {editingTitle ? (
            <TextInput
              value={titleText}
              onChangeText={setTitleText}
              onBlur={handleTitleSubmit}
              onSubmitEditing={handleTitleSubmit}
              autoFocus
              style={styles.titleInput}
            />
          ) : (
            <Pressable
              onPress={() => !isCompletedSession && setEditingTitle(true)}
              style={styles.titlePress}
            >
              <Text style={styles.titleText}>{session.name}</Text>
              {!isCompletedSession && <Text style={styles.editHint}>✎</Text>}
            </Pressable>
          )}
          {isCompletedSession && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>Completed</Text>
            </View>
          )}
        </View>

        {/* Exercises */}
        {exercises.map((group) => (
          <ExerciseCard
            key={group.exercise.id}
            group={group}
            readOnly={isCompletedSession}
            onAddSet={() => void addSet(group.exercise.id)}
            onUpdateSet={(setId, updates) => void updateSet(setId, updates)}
            onDeleteSet={(setId) => void deleteSet(setId)}
            styles={styles}
            theme={theme}
          />
        ))}

        {/* Add Exercise Action */}
        {!isCompletedSession && (
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
            <Text style={styles.addExerciseText}>+ Add exercise</Text>
          </Pressable>
        )}

        {/* Workout Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>Notes</Text>
          <TextInput
            value={notesText ?? session.notes ?? ""}
            onChangeText={setNotesText}
            onBlur={() => {
              if (!isCompletedSession && notesText !== null) {
                void updateNotes(notesText.trim() || null);
              }
            }}
            placeholder="How did this workout feel? (optional)"
            placeholderTextColor={theme.colors.faint}
            editable={!isCompletedSession}
            multiline
            style={styles.notesInput}
          />
        </View>

        {!isCompletedSession && exercises.length > 0 && (
          <Pressable
            onPress={handleFinish}
            accessibilityRole="button"
            style={styles.bigFinishBtn}
          >
            <Text style={styles.bigFinishText}>Finish workout</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function ExerciseCard({
  group,
  readOnly,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  styles,
  theme,
}: {
  group: SessionExercise;
  readOnly: boolean;
  onAddSet: () => void;
  onUpdateSet: (setId: string, updates: Partial<SetPerformance & { isCompleted?: boolean }>) => void;
  onDeleteSet: (setId: string) => void;
  styles: Styles;
  theme: Theme;
}) {
  const { exercise, previousText, sets } = group;

  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseTitleWrap}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          {previousText && <Text style={styles.prevText}>{previousText}</Text>}
        </View>
      </View>

      {/* Sets table header */}
      <View style={styles.setsHeader}>
        <Text style={[styles.setTh, styles.colSet]}>SET</Text>
        <Text style={[styles.setTh, styles.colWeight]}>
          {exercise.isBodyweight ? "+KG" : "KG"}
        </Text>
        <Text style={[styles.setTh, styles.colReps]}>REPS</Text>
        <Text style={[styles.setTh, styles.colCheck]}>✓</Text>
      </View>

      {/* Sets rows */}
      {sets.map((set) => (
        <SetRow
          key={set.id}
          set={set}
          readOnly={readOnly}
          onUpdate={(updates) => onUpdateSet(set.id, updates)}
          onDelete={() => onDeleteSet(set.id)}
          styles={styles}
          theme={theme}
        />
      ))}

      {/* Add Set Button */}
      {!readOnly && (
        <Pressable onPress={onAddSet} accessibilityRole="button" style={styles.addSetBtn}>
          <Text style={styles.addSetText}>+ Add set</Text>
        </Pressable>
      )}
    </View>
  );
}

function SetRow({
  set,
  readOnly,
  onUpdate,
  onDelete,
  styles,
}: {
  set: WorkoutSet;
  readOnly: boolean;
  onUpdate: (updates: { weightKg?: number; reps?: number; isCompleted?: boolean }) => void;
  onDelete: () => void;
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

  const toggleCompleted = () => {
    if (readOnly) return;
    onUpdate({ isCompleted: !set.isCompleted });
  };

  return (
    <View style={[styles.setRow, set.isCompleted && styles.setRowCompleted]}>
      <Text style={[styles.setTd, styles.colSet]}>{set.setNumber}</Text>

      <View style={styles.colWeight}>
        <TextInput
          value={weight}
          onChangeText={setWeight}
          onBlur={handleWeightBlur}
          keyboardType="decimal-pad"
          editable={!readOnly}
          style={[styles.setInput, set.isCompleted && styles.setInputCompleted]}
          placeholder="0"
          placeholderTextColor={styles.placeholder.color}
        />
      </View>

      <View style={styles.colReps}>
        <TextInput
          value={reps}
          onChangeText={setReps}
          onBlur={handleRepsBlur}
          keyboardType="number-pad"
          editable={!readOnly}
          style={[styles.setInput, set.isCompleted && styles.setInputCompleted]}
          placeholder="0"
          placeholderTextColor={styles.placeholder.color}
        />
      </View>

      <View style={styles.colCheck}>
        <Pressable
          onPress={toggleCompleted}
          disabled={readOnly}
          style={[styles.checkBtn, set.isCompleted && styles.checkBtnOn]}
        >
          <Text style={[styles.checkIcon, set.isCompleted && styles.checkIconOn]}>✓</Text>
        </Pressable>
      </View>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { justifyContent: "center", alignItems: "center" },
    appbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: space[4],
      paddingVertical: space[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { minHeight: tap, justifyContent: "center" },
    backText: { color: colors.accentText, fontSize: fontSize.md },
    timerBox: {
      backgroundColor: colors.surface2,
      paddingHorizontal: space[3],
      paddingVertical: space[1],
      borderRadius: radius.pill,
    },
    timerText: {
      fontSize: fontSize.sm,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    finishBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: space[3],
      paddingVertical: space[1],
      borderRadius: radius.md,
      minHeight: 36,
      justifyContent: "center",
    },
    finishBtnText: { color: colors.accentInk, fontSize: fontSize.sm, fontWeight: "700" },
    content: { padding: space[4], gap: space[3] },
    titleSection: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: space[1],
    },
    titlePress: { flexDirection: "row", alignItems: "baseline", gap: space[2] },
    titleText: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text, letterSpacing: -0.5 },
    editHint: { fontSize: fontSize.sm, color: colors.muted },
    titleInput: {
      fontSize: fontSize.xl,
      fontWeight: "700",
      color: colors.text,
      borderBottomWidth: 1,
      borderBottomColor: colors.accent,
      paddingVertical: 2,
      minWidth: 150,
    },
    completedBadge: {
      backgroundColor: colors.surface2,
      paddingHorizontal: space[2],
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    completedBadgeText: { fontSize: fontSize.xs, color: colors.ok, fontWeight: "600" },
    exerciseCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[3],
      gap: space[2],
    },
    exerciseHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    exerciseTitleWrap: { flex: 1 },
    exerciseName: { fontSize: fontSize.md, fontWeight: "700", color: colors.text },
    prevText: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
    setsHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: space[1],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    setTh: { fontSize: fontSize.xs, color: colors.muted, fontWeight: "600", textAlign: "center" },
    colSet: { width: 36, textAlign: "center" },
    colWeight: { flex: 1, paddingHorizontal: space[1], alignItems: "center" },
    colReps: { flex: 1, paddingHorizontal: space[1], alignItems: "center" },
    colCheck: { width: 44, alignItems: "center" },
    setRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: space[1],
      borderRadius: radius.sm,
    },
    setRowCompleted: { backgroundColor: colors.surface2 },
    setTd: { fontSize: fontSize.sm, color: colors.muted, fontWeight: "600" },
    setInput: {
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      width: "100%",
      height: 36,
      textAlign: "center",
      fontSize: fontSize.md,
      fontWeight: "600",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    setInputCompleted: {
      backgroundColor: "transparent",
      borderColor: "transparent",
    },
    placeholder: { color: colors.faint },
    checkBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    checkBtnOn: {
      backgroundColor: colors.ok,
      borderColor: colors.ok,
    },
    checkIcon: { fontSize: fontSize.sm, color: colors.muted, fontWeight: "700" },
    checkIconOn: { color: "#FFFFFF" },
    addSetBtn: {
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      paddingVertical: space[2],
      alignItems: "center",
      marginTop: space[1],
    },
    addSetText: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text },
    addExerciseBtn: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderStyle: "dashed",
      borderRadius: radius.md,
      paddingVertical: space[3],
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
    },
    addExerciseText: { fontSize: fontSize.md, fontWeight: "700", color: colors.accentText },
    notesCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[3],
    },
    notesLabel: { fontSize: fontSize.xs, color: colors.muted, fontWeight: "600", textTransform: "uppercase" },
    notesInput: { fontSize: fontSize.sm, color: colors.text, marginTop: space[1], minHeight: 48 },
    bigFinishBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      minHeight: tap,
      justifyContent: "center",
      alignItems: "center",
      marginTop: space[2],
    },
    bigFinishText: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
  });
}
