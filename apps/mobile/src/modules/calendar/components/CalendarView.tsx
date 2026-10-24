import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/lib/theme/useTheme";
import { useMonthCalendar } from "../hooks/useMonthCalendar";
import { CalendarDaySheet } from "./CalendarDaySheet";
import { CalendarFilterChips } from "./CalendarFilterChips";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarMonthNav } from "./CalendarMonthNav";
import { CalendarStats3 } from "./CalendarStats3";

type Props = {
  initialDate?: Date;
};

export function CalendarView({ initialDate }: Props) {
  const { colors, fontSize } = useTheme();
  const {
    filter,
    setFilter,
    data,
    loading,
    error,
    prevMonth,
    nextMonth,
    canGoNext,
    selectedDay,
    setSelectedDay,
  } = useMonthCalendar(initialDate);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={[styles.errorText, { color: colors.muted, fontSize: fontSize.sm }]}>
          {"Couldn't load calendar data."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Month Navigator */}
      <CalendarMonthNav
        label={data.monthLabel}
        onPrev={prevMonth}
        onNext={nextMonth}
        canGoNext={canGoNext}
      />

      {/* Filter Chips */}
      <CalendarFilterChips active={filter} onChange={setFilter} />

      {/* 3-up Monthly Stats */}
      <CalendarStats3
        dailyAvgKcal={data.dailyAvgKcal}
        daysOnTarget={data.daysOnTarget}
        loggedDaysCount={data.loggedDaysCount}
        weighInsCount={data.weighInsCount}
      />

      {/* 7-column Calendar Grid */}
      <CalendarGrid
        days={data.days}
        filter={filter}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      {/* Day Events Sheet Modal */}
      <CalendarDaySheet
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    textAlign: "center",
  },
});
