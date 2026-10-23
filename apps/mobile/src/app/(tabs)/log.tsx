import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { DayNavigator } from "@/modules/nutrition/components/DayNavigator";
import { DayTotalCard } from "@/modules/nutrition/components/DayTotalCard";
import { MealSection } from "@/modules/nutrition/components/MealSection";
import { useCalorieGoal } from "@/modules/nutrition/hooks/useCalorieGoal";
import { useDayLog } from "@/modules/nutrition/hooks/useDayLog";
import { dayKey, MEAL_LABELS } from "@/modules/nutrition/services/mealTime";
import type { FoodLogEntry, MealType } from "@/modules/nutrition/types/foodLog";

function editEntry(entry: FoodLogEntry) {
  router.push({ pathname: "/entry/[id]", params: { id: entry.id } });
}

// Built to prototypes/log.html.
export default function LogScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const today = dayKey(new Date());
  const [day, setDay] = useState(today);
  const { status, retry, groups, totals, isEmpty, remove, undo, pendingUndo, actionError } = useDayLog(day);
  const goal = useCalorieGoal();
  const addTo = (meal: MealType) => router.push({ pathname: "/add", params: { meal, day } });

  let body: ReactNode;
  if (status === "loading") {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading your log" />
      </View>
    );
  } else if (status === "error") {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>{"Couldn't load your log."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  } else {
    const filled = groups.filter((g) => g.entries.length > 0);
    const empty = groups.filter((g) => g.entries.length === 0);
    body = (
      <ScrollView contentContainerStyle={styles.content}>
        <DayTotalCard totals={totals} goal={goal.state.status === "ready" ? goal.state.goal : null} />
        {isEmpty && (
          <Text style={styles.message}>{day === today ? "No food logged today" : "Nothing logged this day"}</Text>
        )}
        {filled.map((group) => (
          <MealSection key={group.mealType} group={group} onAdd={addTo} onEdit={editEntry} onDelete={(entry) => void remove(entry)} />
        ))}
        {/* Not in log.html: keeps adding to any meal on any day, which features 2, 7 and 29 shipped. */}
        <View style={styles.card}>
          {empty.map((group, index) => (
            <Pressable
              key={group.mealType}
              onPress={() => addTo(group.mealType)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.addRow, index > 0 && styles.divided, pressed && styles.pressed]}
            >
              <Text style={styles.addLabel}>+ Add to {MEAL_LABELS[group.mealType]}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => router.push({ pathname: "/paste-log", params: { day } })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.addRow, empty.length > 0 && styles.divided, pressed && styles.pressed]}
          >
            <Text style={styles.addLabel}>Type or paste a meal list</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <DayNavigator day={day} today={today} onChange={setDay} />
      {body}
      {actionError && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {actionError}
        </Text>
      )}
      {pendingUndo && (
        <View style={styles.snackbar} accessibilityLiveRegion="polite">
          <Text style={styles.snackText} numberOfLines={1}>
            Deleted {pendingUndo.name}
          </Text>
          <Pressable onPress={() => void undo()} accessibilityRole="button" style={styles.undo}>
            <Text style={styles.undoLabel}>Undo</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: space[4], paddingBottom: tap * 2, gap: space[3] },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center", paddingVertical: space[3] },
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    addRow: { minHeight: 52, justifyContent: "center", paddingHorizontal: space[4] },
    addLabel: { color: colors.accentText, fontSize: fontSize.md, fontWeight: "600" },
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
    pressed: { backgroundColor: colors.surface2 },
    error: { color: colors.over, fontSize: fontSize.sm, paddingHorizontal: space[4], paddingBottom: space[2] },
    secondaryButton: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    secondaryLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    snackbar: {
      position: "absolute",
      left: space[4],
      right: space[4],
      bottom: space[4],
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      paddingLeft: space[4],
      borderRadius: radius.md,
      backgroundColor: colors.text,
    },
    snackText: { flex: 1, color: colors.bg, fontSize: fontSize.md },
    undo: { minHeight: tap, justifyContent: "center", paddingHorizontal: space[4] },
    undoLabel: { color: colors.accent, fontSize: fontSize.md, fontWeight: "700" },
  });
}
