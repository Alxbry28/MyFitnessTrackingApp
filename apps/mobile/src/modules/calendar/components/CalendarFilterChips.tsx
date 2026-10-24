import { Pressable, ScrollView, StyleSheet, Text } from "react-native";


import { useTheme } from "@/lib/theme/useTheme";
import type { CalendarFilter } from "../types/calendar";

type Props = {
  active: CalendarFilter;
  onChange: (filter: CalendarFilter) => void;
};

const FILTERS: { key: CalendarFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "food", label: "Food" },
  { key: "body", label: "Body" },
  { key: "pantry", label: "Pantry" },
  { key: "workouts", label: "Workouts" },
];

export function CalendarFilterChips({ active, onChange }: Props) {
  const { colors, fontSize, radius, space } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, { gap: space[2] }]}
    >
      {FILTERS.map((f) => {
        const isSelected = active === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => onChange(f.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.chip,
              {
                borderRadius: radius.pill,
                backgroundColor: isSelected ? colors.accentSoft : colors.surface2,
                borderColor: isSelected ? colors.accent : colors.border,
              },

            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  fontSize: fontSize.xs,
                  color: isSelected ? colors.accentText : colors.muted,
                  fontWeight: isSelected ? "600" : "400",
                },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  chip: {
    height: 30,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chipText: {
    letterSpacing: 0.2,
  },
});
