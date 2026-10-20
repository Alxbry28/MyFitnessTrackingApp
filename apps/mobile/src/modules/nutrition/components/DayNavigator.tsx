import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { addDays, dayFromKey, dayKey, formatDayLabel } from "../services/mealTime";

type Props = { day: string; today: string; onChange: (day: string) => void };

export function DayNavigator({ day, today, onChange }: Props) {
  const styles = makeStyles(useTheme());
  const isToday = day === today;
  const label = formatDayLabel(day, today);

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
    <View>
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange(addDays(day, -1))}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          style={styles.arrow}
        >
          <Text style={styles.arrowGlyph}>‹</Text>
        </Pressable>
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={`${label}. Pick a date`}
          style={styles.label}
        >
          <Text style={styles.labelText}>{label}</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange(addDays(day, 1))}
          disabled={isToday}
          accessibilityRole="button"
          accessibilityLabel="Next day"
          accessibilityState={{ disabled: isToday }}
          style={styles.arrow}
        >
          <Text style={[styles.arrowGlyph, isToday && styles.disabled]}>›</Text>
        </Pressable>
      </View>
      {!isToday && (
        <Pressable onPress={() => onChange(today)} accessibilityRole="button" style={styles.today}>
          <Text style={styles.todayLink}>Back to today</Text>
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, tap } = theme;
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    arrow: { width: tap, height: tap, alignItems: "center", justifyContent: "center" },
    arrowGlyph: { color: colors.text, fontSize: fontSize.xl },
    disabled: { color: colors.faint },
    label: { flex: 1, alignItems: "center", minHeight: tap, justifyContent: "center" },
    labelText: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
    today: { alignSelf: "center", minHeight: tap, justifyContent: "center", paddingHorizontal: space[4] },
    todayLink: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: "600" },
  });
}
