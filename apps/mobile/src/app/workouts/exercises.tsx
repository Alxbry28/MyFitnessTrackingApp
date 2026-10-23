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
import { useExerciseLibrary } from "@/modules/workouts/hooks/useExerciseLibrary";
import { exerciseRepo } from "@/modules/workouts/repositories/exerciseRepo";
import {
  EQUIPMENT_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from "@/modules/workouts/types/workouts";

export default function ExercisesScreen() {
  const { pick, sessionId } = useLocalSearchParams<{ pick?: string; sessionId?: string }>();
  const isPicker = pick === "1";
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const {
    search,
    setSearch,
    muscleGroup,
    setMuscleGroup,
    exercises,
    loading,
    createExercise,
  } = useExerciseLibrary();

  // Custom exercise modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>("chest");
  const [customEquipment, setCustomEquipment] = useState<Equipment>("barbell");
  const [customIsBodyweight, setCustomIsBodyweight] = useState(false);
  const [creating, setCreating] = useState(false);

  // Exercise Form Guide modal state
  const [selectedForGuide, setSelectedForGuide] = useState<Exercise | null>(null);

  // Last performance map: exerciseId -> text
  const [lastPerfMap, setLastPerfMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadLastPerf() {
      const map: Record<string, string> = {};
      await Promise.all(
        exercises.map(async (ex) => {
          try {
            const prev = await exerciseRepo.getPreviousPerformance(db, ex.id);
            if (prev.text && !prev.text.includes("First time")) {
              map[ex.id] = prev.text;
            }
          } catch {
            // ignore
          }
        }),
      );
      if (!cancelled) setLastPerfMap(map);
    }
    if (exercises.length > 0) {
      void loadLastPerf();
    }
    return () => {
      cancelled = true;
    };
  }, [exercises, db]);

  const builtInCount = exercises.filter((e) => e.guideId || e.id.startsWith("ex_")).length;
  const customCount = exercises.length - builtInCount;

  const handleSelectExercise = (exercise: Exercise) => {
    if (isPicker && sessionId) {
      router.dismissTo({
        pathname: "/workouts/[id]" as any,
        params: { id: sessionId, addExerciseId: exercise.id },
      });
    }
  };

  const handleCreateExercise = async () => {
    if (!customName.trim()) {
      Alert.alert("Name required", "Please enter an exercise name.");
      return;
    }
    setCreating(true);
    try {
      const created = await createExercise({
        name: customName.trim(),
        muscleGroup: customMuscle,
        equipment: customEquipment,
        isBodyweight: customIsBodyweight,
      });
      setModalVisible(false);
      setCustomName("");
      if (isPicker && sessionId) {
        router.dismissTo({
          pathname: "/workouts/[id]" as any,
          params: { id: sessionId, addExerciseId: created.id },
        });
      }
    } catch {
      Alert.alert("Error", "Could not create exercise.");
    } finally {
      setCreating(false);
    }
  };

  const getMuscleBadgeColor = (mg: MuscleGroup) => {
    if (mg === "chest" || mg === "back") return { bg: theme.colors.accentSoft, text: theme.colors.accentText };
    if (mg === "legs") return { bg: theme.colors.okSoft, text: theme.colors.ok };
    if (mg === "shoulders" || mg === "core") return { bg: theme.colors.rpeSoft, text: theme.colors.rpe };
    return { bg: theme.colors.surface2, text: theme.colors.muted };
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Top Back & Custom Row (Frame 3) */}
      <View style={styles.topNavRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>
            {isPicker ? "‹ Active Workout" : "‹ Workouts"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.customLink}>+ Custom</Text>
        </Pressable>
      </View>

      {/* App Bar */}
      <View style={styles.appbar}>
        <Text style={styles.appbarTitle}>
          {isPicker ? "Add Exercise" : "Exercises"}
        </Text>
        <Text style={styles.appbarSub}>
          {builtInCount} built-in · {customCount} custom
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises..."
            placeholderTextColor={theme.colors.faint}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {search !== "" && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Text style={styles.clearText}>✕ Clear</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Muscle Group Chips */}
      <View style={styles.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          <Pressable
            onPress={() => setMuscleGroup(undefined)}
            accessibilityRole="radio"
            accessibilityState={{ checked: muscleGroup === undefined }}
            style={[styles.chip, muscleGroup === undefined && styles.chipOn]}
          >
            <Text style={[styles.chipText, muscleGroup === undefined && styles.chipTextOn]}>
              All
            </Text>
          </Pressable>
          {MUSCLE_GROUPS.map((mg) => {
            const on = muscleGroup === mg;
            return (
              <Pressable
                key={mg}
                onPress={() => setMuscleGroup(on ? undefined : mg)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {MUSCLE_LABELS[mg]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} size="large" />
        </View>
      ) : exercises.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No exercises found.</Text>
          <Pressable
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            style={styles.createFirstBtn}
          >
            <Text style={styles.createFirstText}>+ Create custom exercise</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isCustom = !item.guideId && !item.id.startsWith("ex_");
            const badgeColors = getMuscleBadgeColor(item.muscleGroup);
            const lastText = lastPerfMap[item.id];

            return (
              <Pressable
                onPress={() => setSelectedForGuide(item)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.libRow, pressed && styles.rowPressed]}
              >
                <ExerciseArtThumb
                  muscleGroup={item.muscleGroup}
                  equipment={item.equipment}
                  guideId={item.guideId}
                  name={item.name}
                  size="md"
                  isCustom={isCustom}
                />

                <View style={styles.infoCol}>
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.badge, { backgroundColor: isCustom ? theme.colors.estimateSoft : badgeColors.bg }]}>
                      <Text style={[styles.badgeText, { color: isCustom ? theme.colors.estimate : badgeColors.text }]}>
                        {isCustom ? "Custom" : MUSCLE_LABELS[item.muscleGroup]}
                      </Text>
                    </View>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {EQUIPMENT_LABELS[item.equipment]}
                      {lastText ? ` · ${lastText}` : ""}
                    </Text>
                  </View>
                </View>

                {isPicker ? (
                  <Pressable
                    onPress={() => handleSelectExercise(item)}
                    hitSlop={8}
                    style={styles.addPlusBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${item.name}`}
                  >
                    <Text style={styles.addPlusText}>+ Add</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.chevronText}>›</Text>
                )}
              </Pressable>
            );
          }}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: theme.space[6] + insets.bottom + 20 },
          ]}
          ListFooterComponent={
            <View style={styles.ccNote}>
              <Text style={styles.ccNoteText}>
                <Text style={styles.ccNoteBold}>Exercise demonstrations:</Text>{" "}
                <Text style={styles.ccCode}>free-exercise-db</Text> (Public Domain / Unlicense).
              </Text>
            </View>
          }
        />
      )}

      {/* Custom Exercise Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { paddingBottom: theme.space[5] + insets.bottom },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Custom Exercise</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Exercise name</Text>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g. Cable Chest Press"
              placeholderTextColor={theme.colors.faint}
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>Muscle group</Text>
            <View style={styles.optionWrap}>
              {MUSCLE_GROUPS.map((mg) => (
                <Pressable
                  key={mg}
                  onPress={() => setCustomMuscle(mg)}
                  style={[
                    styles.optionChip,
                    customMuscle === mg && styles.optionChipOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      customMuscle === mg && styles.optionChipTextOn,
                    ]}
                  >
                    {MUSCLE_LABELS[mg]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Equipment</Text>
            <View style={styles.optionWrap}>
              {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((eq) => (
                <Pressable
                  key={eq}
                  onPress={() => {
                    setCustomEquipment(eq);
                    if (eq === "bodyweight") setCustomIsBodyweight(true);
                  }}
                  style={[
                    styles.optionChip,
                    customEquipment === eq && styles.optionChipOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      customEquipment === eq && styles.optionChipTextOn,
                    ]}
                  >
                    {EQUIPMENT_LABELS[eq]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={[styles.modalActionBtn, styles.modalCancelBtn]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateExercise}
                disabled={creating}
                style={[styles.modalActionBtn, styles.modalSaveBtn]}
              >
                <Text style={styles.modalSaveText}>
                  {creating ? "Saving..." : "Create"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exercise Form Guide Modal */}
      <ExerciseGuideModal
        visible={selectedForGuide !== null}
        exercise={selectedForGuide}
        onClose={() => setSelectedForGuide(null)}
        onSelect={handleSelectExercise}
        isPicker={isPicker}
      />
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
      paddingVertical: 2,
    },
    backText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.accentText,
      fontWeight: "500",
    },
    customLink: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.accentText,
      fontWeight: "600",
    },
    appbar: {
      paddingHorizontal: theme.space[4],
      paddingTop: theme.space[2],
      paddingBottom: theme.space[2],
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    appbarTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: "700",
      color: theme.colors.text,
      letterSpacing: -0.3,
    },
    appbarSub: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
    },
    searchWrap: {
      paddingHorizontal: theme.space[4],
      marginBottom: theme.space[2],
    },
    searchBox: {
      height: 42,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.space[3],
    },
    searchInput: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      color: theme.colors.text,
      padding: 0,
    },
    clearText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
      fontWeight: "600",
    },
    chipsWrap: {
      marginBottom: theme.space[3],
    },
    chipsContent: {
      paddingHorizontal: theme.space[4],
      gap: theme.space[2],
    },
    chip: {
      height: 32,
      paddingHorizontal: theme.space[3],
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    chipOn: {
      backgroundColor: theme.colors.accentSoft,
    },
    chipText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.muted,
      fontWeight: "500",
    },
    chipTextOn: {
      color: theme.colors.accentText,
      fontWeight: "600",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: theme.space[5],
    },
    emptyText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.muted,
      marginBottom: theme.space[3],
    },
    createFirstBtn: {
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[2],
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surface2,
    },
    createFirstText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.accentText,
      fontWeight: "600",
    },

    // List & Rows
    listContainer: {
      paddingHorizontal: theme.space[4],
      gap: 0,
    },
    libRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.space[2] + 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: theme.space[3],
    },
    rowPressed: {
      backgroundColor: theme.colors.surface2,
    },
    infoCol: {
      flex: 1,
      minWidth: 0,
    },
    exerciseName: {
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.text,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 3,
    },
    badge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: theme.radius.pill,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "600",
    },
    metaText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
      flex: 1,
    },
    addPlusBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: theme.colors.accentSoft,
    },
    addPlusText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.accentText,
    },
    chevronText: {
      fontSize: 20,
      color: theme.colors.faint,
      paddingHorizontal: 4,
    },

    // Attribution Note
    ccNote: {
      marginTop: theme.space[4],
      padding: theme.space[3],
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    ccNoteText: {
      fontSize: 11,
      color: theme.colors.muted,
      lineHeight: 16,
    },
    ccNoteBold: {
      color: theme.colors.text,
      fontWeight: "600",
    },
    ccCode: {
      fontFamily: "monospace",
      color: theme.colors.accentText,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
      justifyContent: "flex-end",
    },
    modalCard: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      padding: theme.space[4],
      gap: theme.space[2],
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.space[2],
    },
    modalTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: "700",
      color: theme.colors.text,
    },
    closeBtn: {
      fontSize: 18,
      color: theme.colors.muted,
    },
    inputLabel: {
      fontSize: theme.fontSize.xs,
      fontWeight: "600",
      color: theme.colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: theme.space[2],
    },
    textInput: {
      height: 42,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.text,
      paddingHorizontal: theme.space[3],
      fontSize: theme.fontSize.sm,
    },
    optionWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.space[2],
    },
    optionChip: {
      paddingHorizontal: theme.space[3],
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: "transparent",
    },
    optionChipOn: {
      backgroundColor: theme.colors.accentSoft,
      borderColor: theme.colors.accent,
    },
    optionChipText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.muted,
    },
    optionChipTextOn: {
      color: theme.colors.accentText,
      fontWeight: "600",
    },
    modalActions: {
      flexDirection: "row",
      gap: theme.space[2],
      marginTop: theme.space[4],
    },
    modalActionBtn: {
      flex: 1,
      height: 44,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    modalCancelBtn: {
      backgroundColor: theme.colors.surface2,
    },
    modalCancelText: {
      color: theme.colors.muted,
      fontWeight: "600",
    },
    modalSaveBtn: {
      backgroundColor: theme.colors.accent,
    },
    modalSaveText: {
      color: theme.colors.accentInk,
      fontWeight: "700",
    },
  });
}
