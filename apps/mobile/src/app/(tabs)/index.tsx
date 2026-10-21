import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { MealCard } from "@/modules/nutrition/components/MealCard";
import { QuickAddSheet } from "@/modules/nutrition/components/QuickAddSheet";
import { TodaySummary } from "@/modules/nutrition/components/TodaySummary";
import { useCalorieGoal } from "@/modules/nutrition/hooks/useCalorieGoal";
import { useDayLog } from "@/modules/nutrition/hooks/useDayLog";
import { dayKey, formatDayShort } from "@/modules/nutrition/services/mealTime";

// Built to prototypes/today.html frame 1.
export default function TodayScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const today = dayKey(new Date());
  const log = useDayLog(today);
  const goal = useCalorieGoal();
  const [sheetOpen, setSheetOpen] = useState(false);

  let body;
  if (log.status === "loading" || goal.state.status === "loading") {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading today" />
      </View>
    );
  } else if (log.status === "error" || goal.state.status === "error") {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>{"Couldn't load today."}</Text>
        <Pressable
          onPress={() => {
            log.retry();
            goal.retry();
          }}
          accessibilityRole="button"
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  } else {
    body = (
      <ScrollView contentContainerStyle={styles.content}>
        <TodaySummary totals={log.totals} goal={goal.state.goal} onSetGoal={() => router.navigate("/settings")} />
        {log.groups.map((group) => (
          <MealCard
            key={group.mealType}
            group={group}
            onOpen={() => router.navigate("/log")}
            onAdd={() => router.push({ pathname: "/add", params: { meal: group.mealType, day: today } })}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.appbar}>
        <Text style={styles.h1} accessibilityRole="header">
          Today
        </Text>
        <Text style={styles.sub}>{formatDayShort(today)}</Text>
      </View>
      {body}
      <Pressable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <SymbolView name={{ android: "add", web: "add" }} tintColor={theme.colors.accentInk} size={22} />
        <Text style={styles.fabLabel}>Log food</Text>
      </Pressable>
      {sheetOpen && <QuickAddSheet day={today} onClose={() => setSheetOpen(false)} />}
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    appbar: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      paddingTop: space[2],
      paddingHorizontal: space[4],
      paddingBottom: space[3],
    },
    h1: { color: colors.text, fontSize: fontSize.xl, fontWeight: "700", letterSpacing: -0.5 },
    sub: { color: colors.muted, fontSize: fontSize.sm },
    // Bottom padding keeps the last meal card clear of the floating Log food button.
    content: { paddingHorizontal: space[4], paddingBottom: 56 + space[4] * 2, gap: space[3] },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    secondaryButton: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    secondaryLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    fab: {
      position: "absolute",
      right: space[4],
      bottom: space[4],
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
      paddingHorizontal: space[5],
      borderRadius: 18,
      backgroundColor: colors.accent,
      elevation: 6,
    },
    fabPressed: { opacity: 0.85 },
    fabLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
  });
}
