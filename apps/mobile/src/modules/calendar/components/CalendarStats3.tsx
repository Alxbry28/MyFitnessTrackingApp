import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/lib/theme/useTheme";

type Props = {
  dailyAvgKcal: number;
  daysOnTarget: number;
  loggedDaysCount: number;
  weighInsCount: number;
};

export function CalendarStats3({
  dailyAvgKcal,
  daysOnTarget,
  loggedDaysCount,
  weighInsCount,
}: Props) {
  const { colors, fontSize, radius, space } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: 16, gap: space[2] }]}>
      <View
        style={[
          styles.statCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: space[2],
          },
        ]}
      >
        <Text style={[styles.label, { color: colors.muted, fontSize: fontSize.xs }]}>Daily avg</Text>
        <Text style={[styles.val, { color: colors.text, fontSize: fontSize.md }]}>
          {dailyAvgKcal > 0 ? dailyAvgKcal.toLocaleString() : "—"}
          {dailyAvgKcal > 0 && <Text style={[styles.unit, { color: colors.muted, fontSize: fontSize.xs }]}> kcal</Text>}
        </Text>
      </View>

      <View
        style={[
          styles.statCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: space[2],
          },
        ]}
      >
        <Text style={[styles.label, { color: colors.muted, fontSize: fontSize.xs }]}>On target</Text>
        <Text style={[styles.val, { color: colors.text, fontSize: fontSize.md }]}>
          {daysOnTarget}
          <Text style={[styles.unit, { color: colors.muted, fontSize: fontSize.xs }]}>
            {loggedDaysCount > 0 ? ` / ${loggedDaysCount}` : " days"}
          </Text>
        </Text>
      </View>

      <View
        style={[
          styles.statCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: space[2],
          },
        ]}
      >
        <Text style={[styles.label, { color: colors.muted, fontSize: fontSize.xs }]}>Weigh-ins</Text>
        <Text style={[styles.val, { color: colors.text, fontSize: fontSize.md }]}>
          {weighInsCount}
          <Text style={[styles.unit, { color: colors.muted, fontSize: fontSize.xs }]}> days</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
  },
  label: {
    marginBottom: 2,
  },
  val: {
    fontWeight: "700",
  },
  unit: {
    fontWeight: "400",
  },
});
