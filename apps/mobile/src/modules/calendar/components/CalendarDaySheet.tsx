import { router } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/lib/theme/useTheme";
import type { DayEvents } from "../types/calendar";

type Props = {
  day: DayEvents | null;
  onClose: () => void;
};

function formatDisplayDate(dayKey: string): string {
  const parts = dayKey.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0]!, 10);
    const m = parseInt(parts[1]!, 10) - 1;
    const d = parseInt(parts[2]!, 10);
    const date = new Date(y, m, d);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return dayKey;
}

export function CalendarDaySheet({ day, onClose }: Props) {
  const { colors, fontSize, radius, space } = useTheme();

  if (!day) return null;

  const displayDate = formatDisplayDate(day.day);
  const hasAnyEvent =
    (day.kcal != null && day.kcal > 0) ||
    day.weightKg != null ||
    day.hasWorkout ||
    day.hasCooking ||
    day.hasPantry;

  const navigateToLog = () => {
    onClose();
    router.push({ pathname: "/(tabs)/log", params: { date: day.day } });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.scrim, { backgroundColor: colors.scrim }]} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Grabber */}
          <View style={[styles.grabber, { backgroundColor: colors.faint }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text, fontSize: fontSize.lg }]}>
              {displayDate}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={[styles.closeText, { color: colors.muted, fontSize: fontSize.md }]}>✕</Text>
            </Pressable>
          </View>

          {/* Event Rows */}
          <View style={[styles.eventsList, { gap: space[3] }]}>
            {day.kcal != null && day.kcal > 0 && (
              <View style={[styles.eventRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                  <Text style={{ fontSize: 16 }}>🍽️</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: colors.text, fontSize: fontSize.sm }]}>
                    Food logged
                  </Text>
                  <Text style={[styles.eventDetail, { color: colors.muted, fontSize: fontSize.xs }]}>
                    {day.kcal.toLocaleString()} kcal
                    {day.protein != null ? ` · ${day.protein}g P` : ""}
                    {day.carbs != null ? ` · ${day.carbs}g C` : ""}
                    {day.fat != null ? ` · ${day.fat}g F` : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={navigateToLog}
                  style={[styles.actionBtn, { backgroundColor: colors.accentSoft }]}
                >
                  <Text style={[styles.actionBtnText, { color: colors.accentText, fontSize: fontSize.xs }]}>
                    View Log ›
                  </Text>
                </Pressable>
              </View>
            )}

            {day.weightKg != null && (
              <View style={[styles.eventRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                  <Text style={{ fontSize: 16 }}>⚖️</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: colors.text, fontSize: fontSize.sm }]}>
                    Weighed in
                  </Text>
                  <Text style={[styles.eventDetail, { color: colors.muted, fontSize: fontSize.xs }]}>
                    {day.weightKg} kg logged
                  </Text>
                </View>
              </View>
            )}

            {day.hasWorkout && (
              <View style={[styles.eventRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                  <Text style={{ fontSize: 16 }}>🏋️</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: colors.text, fontSize: fontSize.sm }]}>
                    Workout
                  </Text>
                  <Text style={[styles.eventDetail, { color: colors.muted, fontSize: fontSize.xs }]}>
                    {day.workoutNames.length > 0 ? day.workoutNames.join(", ") : "Workout logged"}
                  </Text>
                </View>
              </View>
            )}

            {day.hasCooking && (
              <View style={[styles.eventRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                  <Text style={{ fontSize: 16 }}>🍲</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: colors.text, fontSize: fontSize.sm }]}>
                    Cooked Batch
                  </Text>
                  <Text style={[styles.eventDetail, { color: colors.muted, fontSize: fontSize.xs }]}>
                    {day.cookingNames.length > 0 ? day.cookingNames.join(", ") : "Meal prep batch"}
                  </Text>
                </View>
              </View>
            )}

            {day.hasPantry && (
              <View style={[styles.eventRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                  <Text style={{ fontSize: 16 }}>📦</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: colors.text, fontSize: fontSize.sm }]}>
                    Pantry Movements
                  </Text>
                  <Text style={[styles.eventDetail, { color: colors.muted, fontSize: fontSize.xs }]}>
                    {day.pantryMovementCount} stock movement(s)
                  </Text>
                </View>
              </View>
            )}

            {!hasAnyEvent && (
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyText, { color: colors.muted, fontSize: fontSize.sm }]}>
                  No activities recorded on this date.
                </Text>
                <Pressable
                  onPress={navigateToLog}
                  style={[styles.primaryBtn, { backgroundColor: colors.accent, borderRadius: radius.md }]}
                >
                  <Text style={[styles.primaryBtnText, { color: colors.accentInk, fontSize: fontSize.sm }]}>
                    + Log Food For This Day
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontWeight: "700",
  },
  closeText: {
    paddingHorizontal: 8,
  },
  eventsList: {
    minHeight: 100,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontWeight: "600",
    marginBottom: 2,
  },
  eventDetail: {},
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    fontWeight: "600",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 12,
  },
  emptyText: {
    textAlign: "center",
  },
  primaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  primaryBtnText: {
    fontWeight: "700",
  },
});
