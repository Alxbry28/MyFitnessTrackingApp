import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
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
import { useExerciseLibrary } from "@/modules/workouts/hooks/useExerciseLibrary";
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

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.appbar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>{isPicker ? "Cancel" : "‹ Back"}</Text>
        </Pressable>
        <Text style={styles.appbarTitle}>{isPicker ? "Choose exercise" : "Exercises"}</Text>
        <Pressable
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+ Custom</Text>
        </Pressable>
      </View>

      <View style={styles.searchbarWrap}>
        <View style={styles.searchBox}>
          <SymbolView
            name={{ android: "search", web: "search" }}
            tintColor={theme.colors.muted}
            size={20}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises"
            placeholderTextColor={theme.colors.faint}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {search !== "" && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Text style={styles.clearText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

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
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => handleSelectExercise(item)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.row,
                index > 0 && styles.divided,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.badges}>
                  <View style={styles.badgeMuscle}>
                    <Text style={styles.badgeTextMuscle}>{MUSCLE_LABELS[item.muscleGroup]}</Text>
                  </View>
                  <Text style={styles.equipText}>{EQUIPMENT_LABELS[item.equipment]}</Text>
                  {item.isBodyweight && (
                    <Text style={styles.bwText}>· Bodyweight</Text>
                  )}
                </View>
              </View>
              {isPicker && (
                <Text style={styles.pickChevron}>›</Text>
              )}
            </Pressable>
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: theme.space[6] + insets.bottom },
          ]}
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
              <Text style={styles.modalTitle}>New custom exercise</Text>
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
              placeholder="e.g. Bulgarian Split Squat"
              placeholderTextColor={theme.colors.faint}
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>Muscle group</Text>
            <View style={styles.optionsWrap}>
              {MUSCLE_GROUPS.map((mg) => {
                const on = customMuscle === mg;
                return (
                  <Pressable
                    key={mg}
                    onPress={() => setCustomMuscle(mg)}
                    style={[styles.optionChip, on && styles.optionChipOn]}
                  >
                    <Text style={[styles.optionText, on && styles.optionTextOn]}>
                      {MUSCLE_LABELS[mg]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Equipment</Text>
            <View style={styles.optionsWrap}>
              {(["barbell", "dumbbell", "machine", "cable", "bodyweight", "other"] as Equipment[]).map((eq) => {
                const on = customEquipment === eq;
                return (
                  <Pressable
                    key={eq}
                    onPress={() => {
                      setCustomEquipment(eq);
                      if (eq === "bodyweight") setCustomIsBodyweight(true);
                    }}
                    style={[styles.optionChip, on && styles.optionChipOn]}
                  >
                    <Text style={[styles.optionText, on && styles.optionTextOn]}>
                      {EQUIPMENT_LABELS[eq]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setCustomIsBodyweight((prev) => !prev)}
              style={styles.checkboxRow}
            >
              <View style={[styles.box, customIsBodyweight && styles.boxChecked]}>
                {customIsBodyweight && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Bodyweight movement (reps-focused)</Text>
            </Pressable>

            <Pressable
              onPress={handleCreateExercise}
              disabled={creating}
              accessibilityRole="button"
              style={[styles.submitBtn, creating && styles.disabled]}
            >
              {creating ? (
                <ActivityIndicator color={theme.colors.accentInk} />
              ) : (
                <Text style={styles.submitBtnText}>Save exercise</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: space[4] },
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
    backText: { color: colors.accentText, fontSize: fontSize.md, fontWeight: "500" },
    appbarTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    addBtn: { minHeight: tap, justifyContent: "center" },
    addBtnText: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: "600" },
    searchbarWrap: { paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[2] },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface2,
      borderRadius: radius.md,
      paddingHorizontal: space[3],
      height: 44,
      gap: space[2],
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.text },
    clearText: { color: colors.muted, fontSize: fontSize.sm, paddingHorizontal: space[1] },
    chipsWrap: { paddingBottom: space[2] },
    chipsContent: { paddingHorizontal: space[4], gap: space[2] },
    chip: {
      paddingHorizontal: space[3],
      height: 32,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    chipText: { fontSize: fontSize.xs, color: colors.muted, fontWeight: "500" },
    chipTextOn: { color: colors.accentText, fontWeight: "600" },
    emptyText: { color: colors.muted, fontSize: fontSize.md, marginBottom: space[3] },
    createFirstBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: space[4],
      paddingVertical: space[2],
      borderRadius: radius.md,
    },
    createFirstText: { color: colors.accentInk, fontSize: fontSize.sm, fontWeight: "700" },
    listContent: { paddingHorizontal: space[4] },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: space[3],
      gap: space[2],
      minHeight: 56,
    },
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
    pressed: { opacity: 0.7 },
    info: { flex: 1 },
    name: { fontSize: fontSize.md, fontWeight: "500", color: colors.text },
    badges: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: 3 },
    badgeMuscle: {
      backgroundColor: colors.surface2,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: radius.pill,
    },
    badgeTextMuscle: { fontSize: fontSize.xs, color: colors.muted, fontWeight: "600" },
    equipText: { fontSize: fontSize.xs, color: colors.faint },
    bwText: { fontSize: fontSize.xs, color: colors.faint },
    pickChevron: { fontSize: fontSize.lg, color: colors.muted },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: space[4],
      gap: space[3],
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: space[1],
    },
    modalTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text },
    closeBtn: { fontSize: fontSize.lg, color: colors.muted, padding: space[1] },
    inputLabel: { fontSize: fontSize.xs, color: colors.muted, fontWeight: "600", textTransform: "uppercase" },
    textInput: {
      backgroundColor: colors.surface2,
      borderRadius: radius.md,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      fontSize: fontSize.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionsWrap: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
    optionChip: {
      paddingHorizontal: space[3],
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionChipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    optionText: { fontSize: fontSize.xs, color: colors.muted },
    optionTextOn: { color: colors.accentText, fontWeight: "600" },
    checkboxRow: { flexDirection: "row", alignItems: "center", gap: space[2], paddingVertical: space[1] },
    box: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    boxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
    checkMark: { color: colors.accentInk, fontSize: 10, fontWeight: "700" },
    checkboxLabel: { fontSize: fontSize.sm, color: colors.text },
    submitBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      minHeight: tap,
      justifyContent: "center",
      alignItems: "center",
      marginTop: space[2],
    },
    submitBtnText: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
    disabled: { opacity: 0.5 },
  });
}
