import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { exerciseRepo } from "@/modules/workouts/repositories/exerciseRepo";
import { routineRepo } from "@/modules/workouts/repositories/routineRepo";
import {
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  type Exercise,
  type MuscleGroup,
  type RoutineSetTarget,
} from "@/modules/workouts/types/workouts";

const PRESET_SPLITS = ["Upper / Lower", "PPL", "Full Body", "Custom"];

export type ConfiguredRoutineExercise = {
  exercise: Exercise;
  targetSets: number;
  targetReps: number;
  targetWeightKg: number;
  setsData?: RoutineSetTarget[];
};

export default function RoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [name, setName] = useState("");
  const [folder, setFolder] = useState<string>("Upper / Lower");
  const [customFolder, setCustomFolder] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<
    ConfiguredRoutineExercise[]
  >([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Guide Modal State
  const [selectedGuideExercise, setSelectedGuideExercise] =
    useState<Exercise | null>(null);

  // Exercise Picker Modal State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | "all">("all");

  // Load existing routine if editing
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function loadRoutine() {
      try {
        const r = await routineRepo.getRoutine(db, id!);
        if (!cancelled && r) {
          setName(r.name);
          if (r.folder && PRESET_SPLITS.includes(r.folder)) {
            setFolder(r.folder);
          } else if (r.folder) {
            setFolder("Custom");
            setCustomFolder(r.folder);
          } else {
            setFolder("Custom");
          }
          setSelectedExercises(
            r.exercises.map((re) => {
              const defaultSets = re.targetSets ?? 3;
              const defaultReps =
                re.targetReps ?? (re.exercise.isBodyweight ? 10 : 8);
              const defaultWeight =
                re.targetWeightKg ?? (re.exercise.isBodyweight ? 0 : 20);

              const setsData: RoutineSetTarget[] =
                re.setsData && re.setsData.length > 0
                  ? re.setsData
                  : Array.from({ length: defaultSets }, (_, i) => ({
                      setNumber: i + 1,
                      reps: defaultReps,
                      weightKg: defaultWeight,
                      isWarmup: false,
                    }));

              return {
                exercise: re.exercise,
                targetSets: setsData.length,
                targetReps: setsData[0]?.reps ?? defaultReps,
                targetWeightKg: setsData[0]?.weightKg ?? defaultWeight,
                setsData,
              };
            }),
          );
        }
      } catch {
        Alert.alert("Error", "Could not load routine details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRoutine();
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  // Load exercise library for picker
  useEffect(() => {
    let cancelled = false;
    async function loadLib() {
      try {
        const list = await exerciseRepo.list(db);
        if (!cancelled) setLibrary(list);
      } catch {
        // ignore
      }
    }
    void loadLib();
    return () => {
      cancelled = true;
    };
  }, [db]);

  // Reorder exercises up/down
  const moveExercise = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedExercises.length) return;

    setSelectedExercises((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      return copy;
    });
  };

  const removeExercise = (index: number) => {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const addExercise = (exercise: Exercise) => {
    const defaultReps = exercise.isBodyweight ? 10 : 8;
    const defaultWeight = exercise.isBodyweight ? 0 : 20;
    const defaultSets = 3;
    const setsData: RoutineSetTarget[] = Array.from(
      { length: defaultSets },
      (_, i) => ({
        setNumber: i + 1,
        reps: defaultReps,
        weightKg: defaultWeight,
        isWarmup: false,
      }),
    );

    setSelectedExercises((prev) => [
      ...prev,
      {
        exercise,
        targetSets: defaultSets,
        targetReps: defaultReps,
        targetWeightKg: defaultWeight,
        setsData,
      },
    ]);
    setPickerOpen(false);
  };

  const updateExerciseSets = (
    index: number,
    newSets: RoutineSetTarget[],
  ) => {
    setSelectedExercises((prev) => {
      const copy = [...prev];
      if (!copy[index]) return prev;
      const firstSet = newSets[0];
      copy[index] = {
        ...copy[index],
        targetSets: newSets.length,
        targetReps: firstSet?.reps ?? copy[index].targetReps,
        targetWeightKg: firstSet?.weightKg ?? copy[index].targetWeightKg,
        setsData: newSets,
      };
      return copy;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a routine name.");
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert(
        "Exercises required",
        "Please add at least one exercise to your routine.",
      );
      return;
    }

    setSaving(true);
    const resolvedFolder =
      folder === "Custom" ? customFolder.trim() || "Custom" : folder;

    try {
      const routineInput = {
        name: name.trim(),
        folder: resolvedFolder,
        exercises: selectedExercises.map((item) => ({
          exerciseId: item.exercise.id,
          targetSets: item.setsData?.length ?? item.targetSets,
          targetReps: item.setsData?.[0]?.reps ?? item.targetReps,
          targetWeightKg: item.setsData?.[0]?.weightKg ?? item.targetWeightKg,
          setsData: item.setsData,
        })),
      };

      if (isEditing && id) {
        await routineRepo.updateRoutine(db, id, routineInput);
      } else {
        await routineRepo.createRoutine(db, routineInput);
      }
      router.back();
    } catch {
      Alert.alert("Error", "Could not save workout plan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      "Delete Routine",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await routineRepo.deleteRoutine(db, id);
              router.back();
            } catch {
              Alert.alert("Error", "Could not delete routine.");
            }
          },
        },
      ],
    );
  };

  // Filter library for picker
  const filteredLibrary = library.filter((ex) => {
    const matchesSearch =
      !search.trim() ||
      ex.name.toLowerCase().includes(search.toLowerCase().trim());
    const matchesMuscle =
      muscleFilter === "all" || ex.muscleGroup === muscleFilter;
    return matchesSearch && matchesMuscle;
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Header Bar */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>Cancel</Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          {isEditing ? "Edit Routine" : "New Routine"}
        </Text>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          hitSlop={8}
          style={styles.saveBtn}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={theme.colors.accent} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Routine Name & Split */}
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Routine / Day Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Upper Body A, Push Day, Leg Day..."
              placeholderTextColor={theme.colors.faint}
              style={styles.textInput}
            />

            <Text style={[styles.inputLabel, { marginTop: theme.space[3] }]}>
              Split / Category
            </Text>
            <View style={styles.splitRow}>
              {PRESET_SPLITS.map((split) => {
                const isSelected = folder === split;
                return (
                  <Pressable
                    key={split}
                    onPress={() => setFolder(split)}
                    style={[
                      styles.splitChip,
                      isSelected && styles.splitChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.splitChipText,
                        isSelected && styles.splitChipTextSelected,
                      ]}
                    >
                      {split}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {folder === "Custom" && (
              <TextInput
                value={customFolder}
                onChangeText={setCustomFolder}
                placeholder="Custom category name (optional)"
                placeholderTextColor={theme.colors.faint}
                style={[styles.textInput, { marginTop: theme.space[2] }]}
              />
            )}
          </View>

          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderCol}>
              <Text style={styles.sectionTitle}>
                Exercises ({selectedExercises.length})
              </Text>
              <Text style={styles.sectionSub}>
                Set your target sets, reps, and weights. Use ▲ and ▼ to reorder.
              </Text>
            </View>
          </View>

          {/* Exercise Ordered List */}
          {selectedExercises.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🏋️</Text>
              <Text style={styles.emptyTitle}>No exercises added yet</Text>
              <Text style={styles.emptySub}>
                Tap the button below to add exercises and configure your sets,
                reps, and weights.
              </Text>
              <Pressable
                onPress={() => setPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Add Exercise"
                hitSlop={8}
                style={styles.addExerciseCenterBtn}
              >
                <Text style={styles.addExerciseCenterIcon}>＋</Text>
                <Text style={styles.addExerciseCenterText}>Add Exercise</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {selectedExercises.map((item, index) => {
                const canUp = index > 0;
                const canDown = index < selectedExercises.length - 1;

                return (
                  <RoutineExerciseItemCard
                    key={`${item.exercise.id}-${index}`}
                    item={item}
                    index={index}
                    canUp={canUp}
                    canDown={canDown}
                    onMoveUp={() => moveExercise(index, "up")}
                    onMoveDown={() => moveExercise(index, "down")}
                    onRemove={() => removeExercise(index)}
                    onOpenGuide={() => setSelectedGuideExercise(item.exercise)}
                    onUpdateSets={(newSets) =>
                      updateExerciseSets(index, newSets)
                    }
                    styles={styles}
                    theme={theme}
                  />
                );
              })}

              {/* Prominent Middle Add Exercise Button */}
              <Pressable
                onPress={() => setPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Add Exercise"
                hitSlop={8}
                style={styles.addExerciseCenterBtn}
              >
                <Text style={styles.addExerciseCenterIcon}>＋</Text>
                <Text style={styles.addExerciseCenterText}>Add Exercise</Text>
              </Pressable>
            </>
          )}

          {/* Delete Routine (if editing) */}
          {isEditing && (
            <Pressable onPress={handleDelete} style={styles.deleteRoutineBtn}>
              <Text style={styles.deleteRoutineBtnText}>Delete this Routine</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Exercise Picker Modal */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={[styles.modalScreen, { paddingTop: insets.top }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Add Exercise to Routine</Text>
            <Pressable
              onPress={() => setPickerOpen(false)}
              hitSlop={8}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </Pressable>
          </View>

          {/* Search bar */}
          <View style={styles.searchBox}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search exercise..."
              placeholderTextColor={theme.colors.faint}
              clearButtonMode="while-editing"
              style={styles.searchInput}
            />
          </View>

          {/* Muscle Filter Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
            <Pressable
              onPress={() => setMuscleFilter("all")}
              style={[
                styles.filterChip,
                muscleFilter === "all" && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  muscleFilter === "all" && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>

            {MUSCLE_GROUPS.map((mg) => {
              const active = muscleFilter === mg;
              return (
                <Pressable
                  key={mg}
                  onPress={() => setMuscleFilter(mg)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {MUSCLE_LABELS[mg]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Library FlatList */}
          <FlatList
            data={filteredLibrary}
            keyExtractor={(item) => item.id}
            style={styles.pickerFlatList}
            contentContainerStyle={[
              styles.pickerList,
              { paddingBottom: insets.bottom + 20 },
            ]}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => addExercise(item)}
                style={styles.pickerItem}
              >
                <ExerciseArtThumb
                  muscleGroup={item.muscleGroup}
                  equipment={item.equipment}
                  guideId={item.guideId}
                  name={item.name}
                  size="sm"
                  isCustom={!item.guideId && !item.id.startsWith("ex_")}
                />
                <View style={styles.pickerItemInfo}>
                  <Text style={styles.pickerItemName}>{item.name}</Text>
                  <Text style={styles.pickerItemMeta}>
                    {MUSCLE_LABELS[item.muscleGroup]} · {item.equipment}
                  </Text>
                </View>
                <View style={styles.pickerItemAddBadge}>
                  <Text style={styles.pickerItemAddIcon}>+ Add</Text>
                </View>
              </Pressable>
            )}
          />
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

function RoutineExerciseItemCard({
  item,
  index,
  canUp,
  canDown,
  onMoveUp,
  onMoveDown,
  onRemove,
  onOpenGuide,
  onUpdateSets,
  styles,
  theme,
}: {
  item: ConfiguredRoutineExercise;
  index: number;
  canUp: boolean;
  canDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onOpenGuide: () => void;
  onUpdateSets: (sets: RoutineSetTarget[]) => void;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
}) {
  const { exercise } = item;

  const sets: RoutineSetTarget[] =
    item.setsData && item.setsData.length > 0
      ? item.setsData
      : Array.from({ length: item.targetSets || 3 }, (_, i) => ({
          setNumber: i + 1,
          weightKg: item.targetWeightKg ?? (exercise.isBodyweight ? 0 : 20),
          reps: item.targetReps ?? (exercise.isBodyweight ? 10 : 8),
          isWarmup: false,
        }));

  const handleUpdateSet = (
    sIdx: number,
    field: "weightKg" | "reps",
    val: number | null,
  ) => {
    const next = sets.map((s, i) => (i === sIdx ? { ...s, [field]: val } : s));
    onUpdateSets(next);
  };

  const handleToggleWarmup = (sIdx: number) => {
    const next = sets.map((s, i) =>
      i === sIdx ? { ...s, isWarmup: !s.isWarmup } : s,
    );
    onUpdateSets(next);
  };

  const handleAddSet = () => {
    if (sets.length >= 20) return;
    const last = sets[sets.length - 1];
    const next: RoutineSetTarget[] = [
      ...sets,
      {
        setNumber: sets.length + 1,
        weightKg: last?.weightKg ?? (exercise.isBodyweight ? 0 : 20),
        reps: last?.reps ?? 10,
        isWarmup: false,
      },
    ];
    onUpdateSets(next);
  };

  const handleRemoveSet = (sIdx: number) => {
    if (sets.length <= 1) return;
    const next = sets
      .filter((_, i) => i !== sIdx)
      .map((s, i) => ({ ...s, setNumber: i + 1 }));
    onUpdateSets(next);
  };

  const handleCopyFirstToAll = () => {
    if (sets.length <= 1) return;
    const first = sets[0]!;
    const next = sets.map((s, i) =>
      i === 0 ? s : { ...s, weightKg: first.weightKg, reps: first.reps },
    );
    onUpdateSets(next);
  };

  return (
    <View style={styles.exerciseCard}>
      {/* Exercise Main Info Row */}
      <View style={styles.exerciseTopRow}>
        <View style={styles.itemOrderCol}>
          <Text style={styles.itemOrderText}>#{index + 1}</Text>
        </View>

        <Pressable
          onPress={onOpenGuide}
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
          onPress={onOpenGuide}
          style={styles.itemInfo}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`View guide for ${exercise.name}`}
        >
          <Text style={styles.itemName} numberOfLines={1}>
            {exercise.name}{" "}
            <Text style={{ fontSize: 11, color: theme.colors.faint }}>ℹ️</Text>
          </Text>
          <Text style={styles.itemMeta}>
            {MUSCLE_LABELS[exercise.muscleGroup] ?? exercise.muscleGroup} ·{" "}
            {exercise.equipment}
            {exercise.isBodyweight ? " · Bodyweight" : ""}
          </Text>
        </Pressable>

        {/* Reorder & Remove Actions */}
        <View style={styles.orderActions}>
          <Pressable
            disabled={!canUp}
            onPress={onMoveUp}
            hitSlop={6}
            style={[styles.orderBtn, !canUp && styles.orderBtnDisabled]}
          >
            <Text
              style={[
                styles.orderBtnText,
                !canUp && styles.orderBtnTextDisabled,
              ]}
            >
              ▲
            </Text>
          </Pressable>

          <Pressable
            disabled={!canDown}
            onPress={onMoveDown}
            hitSlop={6}
            style={[styles.orderBtn, !canDown && styles.orderBtnDisabled]}
          >
            <Text
              style={[
                styles.orderBtnText,
                !canDown && styles.orderBtnTextDisabled,
              ]}
            >
              ▼
            </Text>
          </Pressable>

          <Pressable onPress={onRemove} hitSlop={6} style={styles.removeBtn}>
            <Text style={styles.removeBtnText}>✕</Text>
          </Pressable>
        </View>
      </View>

      {/* Per-Set Breakdown Table */}
      <View style={styles.setsContainer}>
        {/* Table Header */}
        <View style={styles.setsHeaderRow}>
          <Text style={[styles.setsHeaderLabel, { width: 32, textAlign: "center" }]}>
            SET
          </Text>
          <Text style={[styles.setsHeaderLabel, { flex: 1, paddingLeft: 6 }]}>
            {exercise.isBodyweight ? "+WEIGHT (KG)" : "WEIGHT (KG)"}
          </Text>
          <View style={{ width: 14 }} />
          <Text style={[styles.setsHeaderLabel, { flex: 1, paddingLeft: 6 }]}>
            REPS
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Set Rows */}
        {sets.map((set, sIdx) => (
          <RoutineSetRow
            key={`set-${sIdx}-${sets.length}`}
            set={set}
            setIndex={sIdx}
            isBodyweight={exercise.isBodyweight}
            canDelete={sets.length > 1}
            onUpdate={(field, val) => handleUpdateSet(sIdx, field, val)}
            onToggleWarmup={() => handleToggleWarmup(sIdx)}
            onDelete={() => handleRemoveSet(sIdx)}
            styles={styles}
            theme={theme}
          />
        ))}

        {/* Footer: + Add Set & Copy Set 1 to all */}
        <View style={styles.setsFooterRow}>
          <Pressable
            onPress={handleAddSet}
            hitSlop={6}
            style={styles.addSetBtn}
            accessibilityRole="button"
            accessibilityLabel="Add set"
          >
            <Text style={styles.addSetBtnText}>＋ Add Set</Text>
          </Pressable>

          {sets.length > 1 && (
            <Pressable
              onPress={handleCopyFirstToAll}
              hitSlop={6}
              style={styles.copyAllBtn}
              accessibilityRole="button"
              accessibilityLabel="Copy set 1 to all sets"
            >
              <Text style={styles.copyAllBtnText}>Copy Set 1 to all</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function RoutineSetRow({
  set,
  setIndex,
  isBodyweight,
  canDelete,
  onUpdate,
  onToggleWarmup,
  onDelete,
  styles,
  theme,
}: {
  set: RoutineSetTarget;
  setIndex: number;
  isBodyweight: boolean;
  canDelete: boolean;
  onUpdate: (field: "weightKg" | "reps", val: number | null) => void;
  onToggleWarmup: () => void;
  onDelete: () => void;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
}) {
  const [weightStr, setWeightStr] = useState(
    set.weightKg !== null && set.weightKg !== undefined ? String(set.weightKg) : "",
  );
  const [repsStr, setRepsStr] = useState(
    set.reps !== null && set.reps !== undefined ? String(set.reps) : "",
  );

  const [prevWeight, setPrevWeight] = useState(set.weightKg);
  const [prevReps, setPrevReps] = useState(set.reps);

  if (set.weightKg !== prevWeight) {
    setPrevWeight(set.weightKg);
    setWeightStr(
      set.weightKg !== null && set.weightKg !== undefined ? String(set.weightKg) : "",
    );
  }
  if (set.reps !== prevReps) {
    setPrevReps(set.reps);
    setRepsStr(
      set.reps !== null && set.reps !== undefined ? String(set.reps) : "",
    );
  }

  const handleWeightBlur = () => {
    const raw = weightStr.trim().replace(",", ".");
    if (!raw) {
      onUpdate("weightKg", 0);
      setWeightStr("0");
      return;
    }
    const val = parseFloat(raw);
    if (!isNaN(val) && val >= 0) {
      const rounded = Math.round(val * 10) / 10;
      onUpdate("weightKg", rounded);
      setWeightStr(String(rounded));
    } else {
      setWeightStr(String(set.weightKg ?? 0));
    }
  };

  const handleRepsBlur = () => {
    const raw = repsStr.trim();
    if (!raw) {
      onUpdate("reps", 10);
      setRepsStr("10");
      return;
    }
    const val = parseInt(raw, 10);
    if (!isNaN(val) && val >= 1) {
      const clamped = Math.min(100, Math.max(1, val));
      onUpdate("reps", clamped);
      setRepsStr(String(clamped));
    } else {
      setRepsStr(String(set.reps ?? 10));
    }
  };

  return (
    <View style={[styles.setRow, set.isWarmup && styles.setRowWarmup]}>
      {/* Set Number & Warmup Toggle */}
      <Pressable
        onPress={onToggleWarmup}
        hitSlop={6}
        style={[styles.setTagBtn, set.isWarmup && styles.setTagBtnWarmup]}
        accessibilityRole="button"
        accessibilityLabel={`Set ${setIndex + 1}, ${set.isWarmup ? "Warmup set. Tap to change to normal" : "Normal set. Tap to change to warmup"}`}
      >
        <Text style={[styles.setTagText, set.isWarmup && styles.setTagTextWarmup]}>
          {set.isWarmup ? "W" : setIndex + 1}
        </Text>
      </Pressable>

      {/* Weight input box */}
      <View style={styles.setInputBox}>
        <TextInput
          value={weightStr}
          onChangeText={setWeightStr}
          onBlur={handleWeightBlur}
          keyboardType="decimal-pad"
          selectTextOnFocus
          placeholder={isBodyweight ? "BW" : "0"}
          placeholderTextColor={theme.colors.faint}
          style={styles.setInputField}
        />
        <Text style={styles.setInputUnit}>kg</Text>
      </View>

      <Text style={styles.setMultiplyText}>×</Text>

      {/* Reps input box */}
      <View style={styles.setInputBox}>
        <TextInput
          value={repsStr}
          onChangeText={setRepsStr}
          onBlur={handleRepsBlur}
          keyboardType="number-pad"
          selectTextOnFocus
          placeholder="10"
          placeholderTextColor={theme.colors.faint}
          style={styles.setInputField}
        />
        <Text style={styles.setInputUnit}>reps</Text>
      </View>

      {/* Delete set */}
      {canDelete ? (
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={styles.setDeleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`Delete set ${setIndex + 1}`}
        >
          <Text style={styles.setDeleteText}>✕</Text>
        </Pressable>
      ) : (
        <View style={styles.setDeletePlaceholder} />
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    centerBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backBtn: {
      paddingVertical: 4,
    },
    backText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.muted,
      fontWeight: "500",
    },
    headerTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: "700",
      color: theme.colors.text,
    },
    saveBtn: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: theme.radius.sm,
    },
    saveBtnText: {
      fontSize: theme.fontSize.sm,
      fontWeight: "700",
      color: theme.colors.accentInk,
    },
    scrollContent: {
      padding: theme.space[4],
      gap: theme.space[4],
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.space[3],
    },
    inputLabel: {
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      color: theme.colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: theme.colors.surface2,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 9,
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
    },
    splitRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    splitChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    splitChipSelected: {
      backgroundColor: theme.colors.accentSoft,
      borderColor: theme.colors.accent,
    },
    splitChipText: {
      fontSize: theme.fontSize.xs,
      fontWeight: "600",
      color: theme.colors.muted,
    },
    splitChipTextSelected: {
      color: theme.colors.accentText,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
    },
    sectionHeaderCol: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: "700",
      color: theme.colors.text,
    },
    sectionSub: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
      marginTop: 2,
    },
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.space[5],
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    emptyIcon: {
      fontSize: 32,
      marginBottom: 4,
    },
    emptyTitle: {
      fontSize: theme.fontSize.sm,
      fontWeight: "700",
      color: theme.colors.text,
    },
    emptySub: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
      textAlign: "center",
      marginBottom: 8,
      maxWidth: 280,
    },
    addExerciseCenterBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.accentSoft,
      borderColor: theme.colors.accent,
      borderWidth: 1.5,
      borderRadius: theme.radius.md,
      paddingVertical: 14,
      paddingHorizontal: 20,
      gap: 8,
    },
    addExerciseCenterIcon: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.colors.accentText,
    },
    addExerciseCenterText: {
      fontSize: theme.fontSize.sm,
      fontWeight: "700",
      color: theme.colors.accentText,
      letterSpacing: 0.3,
    },
    exerciseCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.space[3],
      gap: 12,
    },
    exerciseTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    itemOrderCol: {
      width: 24,
      alignItems: "center",
    },
    itemOrderText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.muted,
    },
    itemInfo: {
      flex: 1,
      minWidth: 0,
    },
    itemName: {
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.text,
    },
    itemMeta: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
      marginTop: 2,
    },
    orderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    orderBtn: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    orderBtnDisabled: {
      opacity: 0.25,
    },
    orderBtnText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.text,
    },
    orderBtnTextDisabled: {
      color: theme.colors.muted,
    },
    removeBtn: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 4,
    },
    removeBtnText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.over,
    },

    // Sets breakdown in routine card
    setsContainer: {
      marginTop: theme.space[3],
      backgroundColor: theme.colors.surface2,
      borderRadius: theme.radius.sm,
      padding: theme.space[2],
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    setsHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 4,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginBottom: 6,
    },
    setsHeaderLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: theme.colors.muted,
      textTransform: "uppercase",
    },
    setRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 4,
      paddingHorizontal: 2,
      borderRadius: theme.radius.sm,
      gap: 6,
    },
    setRowWarmup: {
      backgroundColor: "rgba(245, 158, 11, 0.08)",
    },
    setTagBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    setTagBtnWarmup: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    setTagText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.text,
    },
    setTagTextWarmup: {
      color: theme.colors.accentInk,
    },
    setInputBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      paddingHorizontal: 8,
      height: 36,
    },
    setInputField: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.text,
      padding: 0,
    },
    setInputUnit: {
      fontSize: 11,
      color: theme.colors.muted,
      marginLeft: 4,
    },
    setMultiplyText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.muted,
    },
    setDeleteBtn: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    setDeleteText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.muted,
    },
    setDeletePlaceholder: {
      width: 28,
    },
    setsFooterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    addSetBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 5,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
    },
    addSetBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.accentText,
    },
    copyAllBtn: {
      paddingVertical: 5,
      paddingHorizontal: 6,
    },
    copyAllBtnText: {
      fontSize: 11,
      fontWeight: "500",
      color: theme.colors.muted,
    },

    deleteRoutineBtn: {
      marginTop: theme.space[2],
      paddingVertical: 12,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.over,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteRoutineBtnText: {
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.over,
    },

    // Modal
    modalScreen: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    modalHeaderTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: "700",
      color: theme.colors.text,
    },
    modalCloseBtn: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    modalCloseText: {
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.accentText,
    },
    searchBox: {
      paddingHorizontal: theme.space[4],
      paddingTop: theme.space[3],
      paddingBottom: theme.space[2],
      backgroundColor: theme.colors.surface,
    },
    searchInput: {
      backgroundColor: theme.colors.surface2,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
    },
    filterScroll: {
      flexGrow: 0,
      backgroundColor: theme.colors.surface,
    },
    filterRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[2],
      gap: 6,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    filterChip: {
      height: 32,
      paddingHorizontal: 12,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    filterChipActive: {
      backgroundColor: theme.colors.accentSoft,
      borderColor: theme.colors.accent,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.muted,
    },
    filterChipTextActive: {
      color: theme.colors.accentText,
    },
    pickerFlatList: {
      flex: 1,
    },
    pickerList: {
      padding: theme.space[3],
      gap: theme.space[2],
    },
    pickerItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.space[3],
      gap: 12,
    },
    pickerItemInfo: {
      flex: 1,
      minWidth: 0,
    },
    pickerItemName: {
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.text,
    },
    pickerItemMeta: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
      marginTop: 2,
    },
    pickerItemAddBadge: {
      backgroundColor: theme.colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.radius.pill,
    },
    pickerItemAddIcon: {
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      color: theme.colors.accentText,
    },
  });
}
