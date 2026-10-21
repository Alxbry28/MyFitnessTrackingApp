import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { addDays, dayFromKey, dayKey, formatDayShort } from "../services/mealTime";

type Props = { day: string; today: string; onChange: (day: string) => void };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function relative(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  return WEEKDAYS[dayFromKey(day).getDay()];
}

// The date nav from prototypes/log.html; the calendar screen isn't built, so the date opens the picker.
export function DayNavigator({ day, today, onChange }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const isToday = day === today;
  const label = formatDayShort(day);
  const sub = `${relative(day, today)} · tap for calendar`;

  const openPicker = () =>
    DateTimePickerAndroid.open({
      value: dayFromKey(day),
      mode: "date",
      maximumDate: dayFromKey(today),
      onChange: (event, date) => {
        if (event.type === "set" && date) onChange(dayKey(date));
      },
    });

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange(addDays(day, -1))}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        >
          <SymbolView name={{ android: "chevron_left", web: "chevron_left" }} tintColor={theme.colors.muted} size={22} />
        </Pressable>
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${relative(day, today)}. Pick a date`}
          style={styles.label}
        >
          <Text style={styles.date}>{label} ▾</Text>
          <Text style={styles.sub}>{sub}</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange(addDays(day, 1))}
          disabled={isToday}
          accessibilityRole="button"
          accessibilityLabel="Next day"
          accessibilityState={{ disabled: isToday }}
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        >
          <SymbolView
            name={{ android: "chevron_right", web: "chevron_right" }}
            tintColor={isToday ? theme.colors.faint : theme.colors.muted}
            size={22}
          />
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, tap } = theme;
  return StyleSheet.create({
    wrap: { paddingTop: space[2], paddingHorizontal: space[2], paddingBottom: space[3] },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    arrow: { width: tap, height: tap, borderRadius: tap / 2, alignItems: "center", justifyContent: "center" },
    pressed: { backgroundColor: colors.surface2 },
    label: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: tap },
    date: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
    sub: { color: colors.muted, fontSize: fontSize.xs },
  });
}
