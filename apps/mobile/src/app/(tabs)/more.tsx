import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

const ITEMS = [
  { name: "Calorie Stats", meta: "TDEE, weekly averages and adherence", href: "/calorie-stats" },
  { name: "Workouts", meta: "Track sessions, exercises and sets", href: "/workouts/index" },
  { name: "Recipes", meta: "Saved recipes and cooked batches", href: "/recipes/index" },
  { name: "Products", meta: "Your food library", href: "/products" },
  { name: "Settings", meta: "Goal, backup and restore", href: "/settings" },
] as const;

// The More tab from prototypes/pantry.html's five-tab bar; Recipes joins it with feature 12.
export default function MoreScreen() {
  const styles = makeStyles(useTheme());
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {ITEMS.map((item, index) => (
          <Pressable
            key={item.href}
            onPress={() => router.navigate(item.href)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}. ${item.meta}`}
            style={({ pressed }) => [styles.item, index > 0 && styles.divided, pressed && styles.pressed]}
          >
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.meta}</Text>
            </View>
            <Text style={styles.go}>›</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: space[4] },
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      minHeight: 56,
      paddingVertical: space[2],
      paddingHorizontal: space[4],
    },
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
    pressed: { backgroundColor: colors.surface2 },
    info: { flex: 1 },
    name: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
    meta: { color: colors.muted, fontSize: fontSize.sm },
    go: { color: colors.faint, fontSize: fontSize.lg },
  });
}
