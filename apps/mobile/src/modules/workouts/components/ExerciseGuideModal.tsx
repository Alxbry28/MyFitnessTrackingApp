import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { Image } from "expo-image";
import { ExerciseArtThumb } from "./ExerciseArtThumb";
import { getExerciseGuide } from "../data/exerciseGuides";
import { getExerciseImageSet } from "../data/exerciseImages";
import { exerciseRepo } from "../repositories/exerciseRepo";
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  type Exercise,
} from "../types/workouts";

type Props = {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onSelect?: (exercise: Exercise) => void;
  isPicker?: boolean;
};

type PerformanceStats = {
  lastText: string;
  maxWeight: number;
  maxVolume: number;
};

export function ExerciseGuideModal({
  visible,
  exercise,
  onClose,
  onSelect,
  isPicker = false,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const styles = makeStyles(theme);

  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [motionMode, setMotionMode] = useState<"loop" | "start" | "finish">("loop");
  const [activeFrame, setActiveFrame] = useState<0 | 1>(0);

  useEffect(() => {
    if (!visible) return;
    if (motionMode !== "loop") return;
    const interval = setInterval(() => {
      setActiveFrame((f) => (f === 0 ? 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, motionMode]);

  useEffect(() => {
    if (!visible || !exercise) {
      const timer = setTimeout(() => {
        setStats(null);
      }, 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    async function loadStats() {
      try {
        const [prev, maxData] = await Promise.all([
          exerciseRepo.getPreviousPerformance(db, exercise!.id),
          exerciseRepo.getHistoryMax(db, exercise!.id),
        ]);
        if (!cancelled) {
          setStats({
            lastText: prev.text || "No completed sessions yet",
            maxWeight: maxData.maxWeight,
            maxVolume: maxData.maxVolume,
          });
        }
      } catch {
        if (!cancelled) {
          setStats({
            lastText: "No completed sessions yet",
            maxWeight: 0,
            maxVolume: 0,
          });
        }
      }
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [visible, exercise, db]);

  if (!exercise) return null;

  const isCustom = !exercise.guideId && !exercise.id.startsWith("ex_");
  const guide = getExerciseGuide(exercise.guideId, exercise.name);
  const imageSet = getExerciseImageSet(exercise.guideId);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Top App Bar */}
        <View style={styles.appbar}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            style={styles.closeBtn}
          >
            <Text style={styles.closeBtnText}>✕ Close</Text>
          </Pressable>

          <Text style={styles.appbarTitle} numberOfLines={1}>
            Exercise Form Guide
          </Text>

          {isPicker && onSelect ? (
            <Pressable
              onPress={() => {
                onSelect(exercise);
                onClose();
              }}
              hitSlop={8}
              accessibilityRole="button"
              style={styles.topAddBtn}
            >
              <Text style={styles.topAddText}>+ Add</Text>
            </Pressable>
          ) : (
            <View style={styles.closeBtnPlaceholder} />
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroCard}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, styles.badgeMuscle]}>
                <Text style={styles.badgeMuscleText}>
                  {isCustom ? "Custom" : MUSCLE_LABELS[exercise.muscleGroup]}
                </Text>
              </View>
              <View style={[styles.badge, styles.badgeEquip]}>
                <Text style={styles.badgeEquipText}>
                  {EQUIPMENT_LABELS[exercise.equipment]}
                </Text>
              </View>
              <View style={[styles.badge, styles.badgeCategory]}>
                <Text style={styles.badgeCategoryText}>
                  {guide.category} · {guide.force}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{exercise.name}</Text>

            {/* Real Photography Demo Stage or Monogram Fallback */}
            {imageSet ? (
              <View style={styles.photoStageContainer}>
                <View style={styles.photoFrameBox}>
                  <Image
                    source={activeFrame === 0 ? imageSet.start : imageSet.finish}
                    style={styles.photoImage}
                    contentFit="contain"
                    transition={200}
                  />
                  <View style={styles.framePositionBadge}>
                    <Text style={styles.framePositionBadgeText}>
                      {activeFrame === 0 ? "1. Starting Position" : "2. Peak Contraction"}
                    </Text>
                  </View>
                </View>

                {/* Motion Mode Controls */}
                <View style={styles.motionControlRow}>
                  <Pressable
                    onPress={() => setMotionMode("loop")}
                    accessibilityRole="button"
                    style={[styles.motionTab, motionMode === "loop" && styles.motionTabActive]}
                  >
                    <Text
                      style={[
                        styles.motionTabText,
                        motionMode === "loop" && styles.motionTabTextActive,
                      ]}
                    >
                      {motionMode === "loop" ? "▶ Looping" : "▶ Motion"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setMotionMode("start");
                      setActiveFrame(0);
                    }}
                    accessibilityRole="button"
                    style={[styles.motionTab, motionMode === "start" && styles.motionTabActive]}
                  >
                    <Text
                      style={[
                        styles.motionTabText,
                        motionMode === "start" && styles.motionTabTextActive,
                      ]}
                    >
                      Start
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setMotionMode("finish");
                      setActiveFrame(1);
                    }}
                    accessibilityRole="button"
                    style={[styles.motionTab, motionMode === "finish" && styles.motionTabActive]}
                  >
                    <Text
                      style={[
                        styles.motionTabText,
                        motionMode === "finish" && styles.motionTabTextActive,
                      ]}
                    >
                      Finish
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.heroArtStage}>
                <ExerciseArtThumb
                  muscleGroup={exercise.muscleGroup}
                  equipment={exercise.equipment}
                  guideId={exercise.guideId}
                  name={exercise.name}
                  size="lg"
                  isCustom={isCustom}
                />
              </View>
            )}

            {/* Muscle Focus Detail */}
            <View style={styles.muscleFocusCard}>
              <View style={styles.focusRow}>
                <View style={[styles.dot, { backgroundColor: theme.colors.artMuscle }]} />
                <Text style={styles.focusLabel}>Target:</Text>
                <Text style={styles.focusValue} numberOfLines={2}>
                  {guide.primaryMuscles.join(", ")}
                </Text>
              </View>

              {guide.secondaryMuscles.length > 0 && (
                <View style={[styles.focusRow, { marginTop: 6 }]}>
                  <View style={[styles.dot, { backgroundColor: theme.colors.artSecondary }]} />
                  <Text style={styles.focusLabel}>Assisting:</Text>
                  <Text style={styles.focusValue} numberOfLines={2}>
                    {guide.secondaryMuscles.join(", ")}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Historical PR / Previous Stats */}
          {stats && (
            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statHeader}>LAST SESSION</Text>
                  <Text style={styles.statBody} numberOfLines={1}>
                    {stats.lastText}
                  </Text>
                </View>

                {stats.maxWeight > 0 && (
                  <View style={styles.statPrCol}>
                    <Text style={styles.statHeader}>BEST PR</Text>
                    <Text style={styles.statPrValue}>
                      {stats.maxWeight} kg
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Execution Steps */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>STEP-BY-STEP EXECUTION</Text>
            <View style={styles.stepsList}>
              {guide.steps.map((step, idx) => (
                <View key={idx} style={styles.stepItem}>
                  <View style={styles.stepNumCircle}>
                    <Text style={styles.stepNumText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepHeading}>{step.title}</Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Form Cues: Dos & Don'ts */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>FORM CUES & CHECKPOINTS</Text>

            <View style={styles.cuesContainer}>
              <Text style={styles.cuesSubheading}>WHAT TO DO</Text>
              {guide.dos.map((item, idx) => (
                <View key={`do-${idx}`} style={styles.cueRow}>
                  <View style={styles.doIcon}>
                    <Text style={styles.doIconText}>✓</Text>
                  </View>
                  <Text style={styles.cueText}>{item}</Text>
                </View>
              ))}

              <Text style={[styles.cuesSubheading, { marginTop: 14 }]}>
                WHAT TO AVOID
              </Text>
              {guide.donts.map((item, idx) => (
                <View key={`dont-${idx}`} style={styles.cueRow}>
                  <View style={styles.dontIcon}>
                    <Text style={styles.dontIconText}>✕</Text>
                  </View>
                  <Text style={styles.cueText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Breathing & Bracing Card */}
          <View style={styles.breathingCard}>
            <View style={styles.breathingHeader}>
              <Text style={styles.breathingIcon}>🫁</Text>
              <Text style={styles.breathingTitle}>BREATHING & BRACING CUE</Text>
            </View>
            <Text style={styles.breathingDesc}>{guide.breathingCue}</Text>
          </View>

          {/* Bottom Action if in Picker */}
          {isPicker && onSelect ? (
            <Pressable
              onPress={() => {
                onSelect(exercise);
                onClose();
              }}
              style={styles.bottomAddBtn}
              accessibilityRole="button"
            >
              <Text style={styles.bottomAddText}>+ Add {exercise.name} to Workout</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onClose}
              style={styles.bottomCloseBtn}
              accessibilityRole="button"
            >
              <Text style={styles.bottomCloseText}>Done</Text>
            </Pressable>
          )}

          {/* Attribution footer */}
          <Text style={styles.attribution}>
            Exercise demonstrations & movement reference from open-source free-exercise-db (Public Domain / Unlicense).
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    appbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    closeBtn: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    closeBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.muted,
    },
    closeBtnPlaceholder: {
      width: 50,
    },
    appbarTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
    },
    topAddBtn: {
      backgroundColor: theme.colors.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 6,
    },
    topAddText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.accentText,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.space[4],
      gap: theme.space[4],
    },
    heroCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.space[4],
      alignItems: "center",
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 6,
      marginBottom: 8,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    badgeMuscle: {
      backgroundColor: "rgba(255, 107, 74, 0.16)",
    },
    badgeMuscleText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.artMuscle,
      textTransform: "uppercase",
    },
    badgeEquip: {
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    badgeEquipText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.muted,
    },
    badgeCategory: {
      backgroundColor: theme.colors.timerSoft,
    },
    badgeCategoryText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.timer,
      textTransform: "uppercase",
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: 12,
    },
    heroArtStage: {
      marginVertical: 4,
      padding: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    photoStageContainer: {
      width: "100%",
      marginVertical: 6,
      alignItems: "center",
    },
    photoFrameBox: {
      width: "100%",
      height: 220,
      backgroundColor: theme.colors.surface2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    photoImage: {
      width: "100%",
      height: "100%",
    },
    framePositionBadge: {
      position: "absolute",
      top: 8,
      left: 8,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    framePositionBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#ffffff",
    },
    motionControlRow: {
      flexDirection: "row",
      width: "100%",
      backgroundColor: theme.colors.surface2,
      borderRadius: 8,
      padding: 3,
      marginTop: 8,
      gap: 4,
    },
    motionTab: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    motionTabActive: {
      backgroundColor: theme.colors.accent,
    },
    motionTabText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.muted,
    },
    motionTabTextActive: {
      color: theme.colors.accentInk,
    },
    muscleFocusCard: {
      width: "100%",
      backgroundColor: theme.colors.surface2,
      borderRadius: 10,
      padding: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    focusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      flexShrink: 0,
    },
    focusLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.muted,
      textTransform: "uppercase",
      width: 65,
    },
    focusValue: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text,
      flex: 1,
    },
    statsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    statCol: {
      flex: 1,
    },
    statHeader: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.muted,
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    statBody: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text,
    },
    statPrCol: {
      alignItems: "flex-end",
      paddingLeft: 12,
    },
    statPrValue: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.colors.estimate,
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.space[4],
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.colors.muted,
      letterSpacing: 0.6,
      marginBottom: 12,
    },
    stepsList: {
      gap: 12,
    },
    stepItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    stepNumCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    stepNumText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.accentText,
    },
    stepContent: {
      flex: 1,
    },
    stepHeading: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 2,
    },
    stepDesc: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.muted,
    },
    cuesContainer: {
      gap: 8,
    },
    cuesSubheading: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.muted,
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    cueRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    doIcon: {
      width: 18,
      height: 18,
      borderRadius: 4,
      backgroundColor: theme.colors.okSoft,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    doIconText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.colors.ok,
    },
    dontIcon: {
      width: 18,
      height: 18,
      borderRadius: 4,
      backgroundColor: theme.colors.overSoft,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    dontIconText: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.colors.over,
    },
    cueText: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.text,
      flex: 1,
    },
    breathingCard: {
      backgroundColor: theme.colors.timerSoft,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(78, 168, 222, 0.3)",
      padding: theme.space[4],
    },
    breathingHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
    },
    breathingIcon: {
      fontSize: 16,
    },
    breathingTitle: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.colors.timer,
      letterSpacing: 0.5,
    },
    breathingDesc: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.text,
    },
    bottomAddBtn: {
      backgroundColor: theme.colors.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    bottomAddText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.accentInk,
    },
    bottomCloseBtn: {
      backgroundColor: theme.colors.surface2,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    bottomCloseText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
    },
    attribution: {
      fontSize: 11,
      color: theme.colors.faint,
      textAlign: "center",
      marginTop: 6,
    },
  });
}
