import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/lib/theme/useTheme";

type Props = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  canGoNext?: boolean;
};

export function CalendarMonthNav({ label, onPrev, onNext, canGoNext = true }: Props) {
  const { colors, fontSize } = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPrev}
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        hitSlop={12}
        style={styles.arrowBtn}
      >
        <Text style={[styles.arrow, { color: colors.muted, fontSize: fontSize.xl }]}>‹</Text>
      </Pressable>

      <Text style={[styles.title, { color: colors.text, fontSize: fontSize.md }]}>{label}</Text>

      <Pressable
        onPress={onNext}
        disabled={!canGoNext}
        accessibilityRole="button"
        accessibilityLabel="Next month"
        accessibilityState={{ disabled: !canGoNext }}
        hitSlop={12}
        style={styles.arrowBtn}
      >
        <Text
          style={[
            styles.arrow,
            { color: canGoNext ? colors.muted : colors.faint, fontSize: fontSize.xl },
          ]}
        >
          ›
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    fontWeight: "300",
  },
  title: {
    fontWeight: "700",
  },
});
