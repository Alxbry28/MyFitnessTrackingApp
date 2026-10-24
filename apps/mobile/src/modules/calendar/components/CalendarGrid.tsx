import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/lib/theme/useTheme";
import type { CalendarFilter, DayEvents } from "../types/calendar";

type Props = {
  days: (DayEvents | null)[];
  filter: CalendarFilter;
  selectedDay: DayEvents | null;
  onSelectDay: (day: DayEvents) => void;
};

const DOW_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function formatSubtext(day: DayEvents, filter: CalendarFilter): string | null {
  if (filter === "body") {
    return day.weightKg != null ? `${day.weightKg}` : null;
  }
  if (filter === "workouts") {
    return day.hasWorkout ? "WOD" : null;
  }
  if (filter === "pantry") {
    return day.hasPantry ? `${day.pantryMovementCount}x` : null;
  }
  // all or food
  if (day.kcal != null && day.kcal > 0) {
    return day.kcal >= 1000 ? `${(day.kcal / 1000).toFixed(1)}k` : `${day.kcal}`;
  }
  return null;
}

export function CalendarGrid({ days, filter, selectedDay, onSelectDay }: Props) {
  const { colors, fontSize, radius } = useTheme();

  // Group days into 7-day rows to guarantee strict weekly alignment without wrapping errors
  const weeks: (DayEvents | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      {/* Day of Week Header */}
      <View style={styles.dowRow}>
        {DOW_LABELS.map((label, idx) => (
          <View key={idx} style={styles.col}>
            <Text style={[styles.dowText, { color: colors.faint, fontSize: fontSize.xs }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* 7-column Grid rendered week by week */}
      <View style={styles.grid}>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((item, colIndex) => {
              if (!item) {
                return (
                  <View
                    key={`blank-${weekIndex}-${colIndex}`}
                    style={[styles.dayCell, styles.blankCell]}
                  />
                );
              }

              const isSelected = selectedDay?.day === item.day;
              const isToday = item.isToday;
              const subtext = formatSubtext(item, filter);

              let barColor = "transparent";
              if (item.adherence === "ok") barColor = colors.ok;
              else if (item.adherence === "over") barColor = colors.over;
              else if (item.adherence === "low") barColor = colors.estimate;

              return (
                <Pressable
                  key={item.day}
                  onPress={() => onSelectDay(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${item.dayNumber}`}
                  style={[
                    styles.dayCell,
                    {
                      backgroundColor: isToday ? colors.accentSoft : colors.surface2,
                      borderRadius: radius.sm,
                      borderColor: isSelected
                        ? colors.text
                        : isToday
                        ? colors.accent
                        : "transparent",
                      borderWidth: isSelected ? 2 : isToday ? 1.5 : 0,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      {
                        color: isToday ? colors.accentText : colors.text,
                        fontSize: fontSize.sm,
                        fontWeight: isToday ? "700" : "600",
                      },
                    ]}
                  >
                    {item.dayNumber}
                  </Text>

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.daySub,
                      {
                        color: colors.muted,
                        fontSize: 9,
                      },
                    ]}
                  >
                    {subtext ?? " "}
                  </Text>

                  {/* Event indicator markers */}
                  <View style={styles.markersRow}>
                    {item.hasWorkout && (
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: colors.pr ?? colors.accent },
                        ]}
                      />
                    )}
                    {item.weightKg != null && (
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: colors.accentText },
                        ]}
                      />
                    )}
                    {(item.hasCooking || item.hasPantry) && (
                      <View
                        style={[styles.dot, { backgroundColor: colors.ok }]}
                      />
                    )}
                  </View>

                  {/* Adherence bottom bar */}
                  <View
                    style={[styles.adherenceBar, { backgroundColor: barColor }]}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  dowRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  col: {
    flex: 1,
    alignItems: "center",
  },
  dowText: {
    fontWeight: "600",
  },
  grid: {
    gap: 4,
  },
  weekRow: {
    flexDirection: "row",
    gap: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 0.85,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
    position: "relative",
  },
  blankCell: {
    backgroundColor: "transparent",
  },
  dayNum: {
    lineHeight: 14,
  },
  daySub: {
    marginTop: 2,
    lineHeight: 11,
    fontWeight: "500",
  },
  markersRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
    height: 4,
    alignItems: "center",
  },
  dot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  adherenceBar: {
    position: "absolute",
    bottom: 3,
    left: 4,
    right: 4,
    height: 3,
    borderRadius: 2,
  },
});
