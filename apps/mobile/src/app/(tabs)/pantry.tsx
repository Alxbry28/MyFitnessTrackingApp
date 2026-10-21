import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { dayKey } from "@/modules/nutrition/services/mealTime";
import { PantryRow } from "@/modules/pantry/components/PantryRow";
import { usePantry } from "@/modules/pantry/hooks/usePantry";
import { GROUP_LABELS, GROUP_ORDER, groupOf, locationsText, type PantryGroup } from "@/modules/pantry/services/pantryStock";

type Filter = "all" | PantryGroup;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "cooked", label: "Cooked" },
  { value: "groceries", label: "Groceries" },
  { value: "supplements", label: "Supplements" },
];

const EMPTY_GROUP: Record<PantryGroup, string> = {
  cooked: "Cooked batches arrive with recipes.",
  groceries: "No groceries in your pantry yet.",
  supplements: "Supplements arrive soon.",
};

// Built to prototypes/pantry.html frame 1.
export default function PantryScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const { state, retry } = usePantry();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const today = dayKey(new Date());
  const count = state.status === "ready" ? state.items.length : 0;

  let body: ReactNode;
  if (state.status === "loading") {
    body = <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading your pantry" />;
  } else if (state.status === "error") {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>{"Couldn't load your pantry."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.retry}>
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (state.items.length === 0) {
    body = <Text style={styles.message}>Nothing in your pantry yet. Tap + Add stock after you shop.</Text>;
  } else {
    const q = query.trim().toLowerCase();
    const matching = state.items.filter((i) => !q || i.name.toLowerCase().includes(q));
    const groups = GROUP_ORDER.filter((g) => filter === "all" || filter === g)
      .map((g) => ({ group: g, items: matching.filter((i) => groupOf(i.kind) === g) }))
      .filter((g) => g.items.length > 0);

    if (groups.length > 0) {
      body = groups.map(({ group, items }) => (
        <View key={group} style={styles.groupWrap}>
          <View style={styles.groupHead}>
            <Text style={styles.sectionLabel} accessibilityRole="header">
              {GROUP_LABELS[group]}
            </Text>
            <Text style={styles.groupWhere}>{locationsText(items)}</Text>
          </View>
          <View style={styles.card}>
            {items.map((item, index) => (
              <PantryRow key={item.id} item={item} today={today} last={index === items.length - 1} />
            ))}
          </View>
        </View>
      ));
    } else if (q) {
      body = <Text style={styles.message}>{`Nothing matches '${query.trim()}'`}</Text>;
    } else {
      body = <Text style={styles.message}>{filter === "all" ? "" : EMPTY_GROUP[filter]}</Text>;
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.appbar}>
        <Text style={styles.h1} accessibilityRole="header">
          Pantry
        </Text>
        <Text style={styles.sub}>{count === 1 ? "1 item" : `${count} items`}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your pantry"
          placeholderTextColor={theme.colors.faint}
          accessibilityLabel="Search your pantry"
          autoCorrect={false}
          style={styles.search}
        />
        <View style={styles.chips} accessibilityRole="radiogroup">
          {FILTERS.map((f) => {
            const on = f.value === filter;
            return (
              <Pressable
                key={f.value}
                onPress={() => setFilter(f.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {body}
      </ScrollView>
      <Pressable
        onPress={() => router.push({ pathname: "/scan", params: { for: "pantry" } })}
        accessibilityRole="button"
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <SymbolView name={{ android: "add", web: "add" }} tintColor={theme.colors.accentInk} size={22} />
        <Text style={styles.fabLabel}>Add stock</Text>
      </Pressable>
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
      gap: space[2],
      paddingTop: space[2],
      paddingHorizontal: space[4],
      paddingBottom: space[3],
    },
    h1: { color: colors.text, fontSize: fontSize.xl, fontWeight: "700", letterSpacing: -0.5 },
    sub: { color: colors.muted, fontSize: fontSize.sm },
    // Bottom padding keeps the last row clear of the floating Add stock button.
    content: { paddingHorizontal: space[4], paddingBottom: 56 + space[4] * 2, gap: space[3] },
    search: {
      height: 44,
      paddingHorizontal: space[4],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
      color: colors.text,
      fontSize: fontSize.md,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
    chip: { height: 32, justifyContent: "center", paddingHorizontal: space[3], borderRadius: radius.pill, backgroundColor: colors.surface2 },
    chipOn: { backgroundColor: colors.accentSoft },
    chipLabel: { color: colors.muted, fontSize: fontSize.sm },
    chipLabelOn: { color: colors.accentText, fontWeight: "600" },
    groupWrap: { gap: space[3] },
    groupHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: space[1] },
    sectionLabel: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.7 },
    groupWhere: { color: colors.faint, fontSize: fontSize.xs },
    // List cards drop the vertical padding (pantry.html frame 1); rows bring their own.
    card: {
      paddingHorizontal: space[4],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    center: { alignItems: "center", gap: space[3] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center", paddingVertical: space[3] },
    retry: { minHeight: tap, justifyContent: "center", paddingHorizontal: space[5], borderRadius: radius.md, backgroundColor: colors.surface2 },
    retryLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
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
