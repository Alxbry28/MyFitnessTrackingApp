import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { CalorieSummary } from "@/modules/nutrition/components/CalorieSummary";
import { QuickAdd } from "@/modules/nutrition/components/QuickAdd";
import { useCalorieGoal } from "@/modules/nutrition/hooks/useCalorieGoal";
import { useDayLog } from "@/modules/nutrition/hooks/useDayLog";
import { dayKey, MEAL_LABELS } from "@/modules/nutrition/services/mealTime";
import { formatKcal } from "@/modules/nutrition/services/nutritionCalc";

export default function TodayScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const log = useDayLog(dayKey(new Date()));
  const goal = useCalorieGoal();

  if (log.status === "loading" || goal.state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading today" />
      </View>
    );
  }
  if (log.status === "error" || goal.state.status === "error") {
    return (
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
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <CalorieSummary
        eaten={log.totals.kcal}
        goal={goal.state.goal}
        onSetGoal={() => router.navigate("/settings")}
      />
      <Pressable
        onPress={() => router.push("/scan")}
        accessibilityRole="button"
        style={({ pressed }) => [styles.scan, pressed && styles.scanPressed]}
      >
        <Text style={styles.scanLabel}>Scan</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push("/weight")}
        accessibilityRole="button"
        style={({ pressed }) => [styles.weight, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryLabel}>Log weight</Text>
      </Pressable>
      <QuickAdd />
      <View style={styles.card}>
        {log.groups.map((group, index) => {
          const label = MEAL_LABELS[group.mealType];
          const subtotal = group.entries.length > 0 ? `${formatKcal(group.kcal)} kcal` : "-";
          return (
            <Pressable
              key={group.mealType}
              onPress={() => router.navigate("/log")}
              accessibilityRole="button"
              accessibilityLabel={`${label}, ${subtotal === "-" ? "nothing logged" : subtotal}. Open log`}
              style={({ pressed }) => [styles.meal, index > 0 && styles.divided, pressed && styles.pressed]}
            >
              <Text style={styles.mealName}>{label}</Text>
              <Text style={styles.mealKcal}>{subtotal}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: space[4], gap: space[4] },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4], backgroundColor: colors.bg },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    card: {
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    meal: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: tap,
      paddingHorizontal: space[4],
    },
    divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    pressed: { backgroundColor: colors.surface2 },
    mealName: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    mealKcal: { color: colors.muted, fontSize: fontSize.md, fontVariant: ["tabular-nums"] },
    scan: {
      minHeight: tap,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: colors.accent,
    },
    scanPressed: { opacity: 0.85 },
    scanLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
    weight: {
      minHeight: tap,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    secondaryButton: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    secondaryLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  });
}
