import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { DayNavigator } from "@/modules/nutrition/components/DayNavigator";
import { MealSection } from "@/modules/nutrition/components/MealSection";
import { useDayLog } from "@/modules/nutrition/hooks/useDayLog";
import { dayKey } from "@/modules/nutrition/services/mealTime";
import { formatKcal, formatMacro } from "@/modules/nutrition/services/nutritionCalc";
import type { FoodLogEntry } from "@/modules/nutrition/types/foodLog";

function editEntry(entry: FoodLogEntry) {
  router.push({ pathname: "/entry/[id]", params: { id: entry.id } });
}

export default function LogScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const today = dayKey(new Date());
  const [day, setDay] = useState(today);
  const { status, retry, groups, totals, isEmpty, remove, undo, pendingUndo, actionError } =
    useDayLog(day);

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
    body = (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.total}>
          <Text style={styles.totalKcal}>
            {formatKcal(totals.kcal)} <Text style={styles.totalUnit}>kcal</Text>
          </Text>
          <Text style={styles.macros}>
            P {formatMacro(totals.proteinG)} · C {formatMacro(totals.carbsG)} · F {formatMacro(totals.fatG)}
          </Text>
        </View>
        {isEmpty && (
          <Text style={styles.message}>{day === today ? "No food logged today" : "Nothing logged this day"}</Text>
        )}
        {groups.map((group) => (
          <MealSection
            key={group.mealType}
            group={group}
            onAdd={(meal) => router.push({ pathname: "/add", params: { meal, day } })}
            onEdit={editEntry}
            onDelete={(entry) => void remove(entry)}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
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
    content: { padding: space[4], paddingBottom: tap * 2, gap: space[1] },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4] },
    total: {
      padding: space[4],
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      gap: space[1],
    },
    totalKcal: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", fontVariant: ["tabular-nums"] },
    totalUnit: { color: colors.muted, fontSize: fontSize.sm, fontWeight: "400" },
    macros: { color: colors.muted, fontSize: fontSize.sm, fontVariant: ["tabular-nums"] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center", paddingVertical: space[3] },
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
