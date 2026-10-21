import { router } from "expo-router";
import { SymbolView, type AndroidSymbol } from "expo-symbols";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { useQuickAdd } from "../hooks/useQuickAdd";
import { gramsToText } from "../services/entrySchema";
import { defaultMeal, MEAL_LABELS } from "../services/mealTime";
import { forGrams, formatKcal } from "../services/nutritionCalc";
import { MEAL_TYPES, type MealType } from "../types/foodLog";

type Props = { day: string; onClose: () => void };
type Styles = ReturnType<typeof makeStyles>;

// prototypes/today.html frame 2. Mount it only while open, so the meal starts from the time of day.
export function QuickAddSheet({ day, onClose }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const [meal, setMeal] = useState<MealType>(() => defaultMeal(new Date()));
  const { state, retry } = useQuickAdd();

  // Close first so Back from the next screen lands on Today, not on the sheet.
  const go = (open: () => void) => {
    onClose();
    open();
  };

  let recent;
  if (state.status === "loading") {
    recent = <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading recent foods" />;
  } else if (state.status === "error") {
    recent = (
      <View style={styles.errorRow}>
        <Text style={styles.message}>{"Couldn't load recent foods."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.retry}>
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (state.recent.length === 0) {
    recent = <Text style={styles.message}>Foods you log appear here.</Text>;
  } else {
    recent = (
      <View>
        {state.recent.map(({ product, lastGrams }, index) => {
          const meta = [product.brand, `${gramsToText(lastGrams)} g`, `${formatKcal(forGrams(product, lastGrams).kcal)} kcal`]
            .filter(Boolean)
            .join(" · ");
          return (
            <Pressable
              key={product.id}
              onPress={() =>
                go(() => router.push({ pathname: "/add/[productId]", params: { productId: product.id, meal, day } }))
              }
              accessibilityRole="button"
              accessibilityLabel={`Add ${product.name} to ${MEAL_LABELS[meal]}. ${meta}`}
              style={({ pressed }) => [styles.recent, index > 0 && styles.recentDivided, pressed && styles.pressed]}
            >
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {meta}
                </Text>
              </View>
              <View style={styles.plus}>
                <Text style={styles.plusLabel}>+</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: theme.space[5] + insets.bottom }]}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
            <View style={styles.grabber} />
          </Pressable>
          <Text style={styles.h2} accessibilityRole="header">
            Add to
          </Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {MEAL_TYPES.map((m) => {
              const on = m === meal;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMeal(m)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{MEAL_LABELS[m]}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actions}>
            <Action icon="barcode_scanner" label="Scan barcode" onPress={() => go(() => router.push({ pathname: "/scan", params: { meal } }))} styles={styles} theme={theme} />
            <Action
              icon="search"
              label="Search library"
              onPress={() => go(() => router.push({ pathname: "/add", params: { meal, day } }))}
              styles={styles}
              theme={theme}
            />
            <Action
              icon="edit_note"
              label="Type or paste"
              onPress={() => go(() => router.push({ pathname: "/paste-log", params: { day } }))}
              styles={styles}
              theme={theme}
            />
            <Action
              icon="auto_awesome"
              label="✨ AI Meal Parse"
              primary
              onPress={() => go(() => router.push({ pathname: "/paste-log", params: { day, ai: "1" } }))}
              styles={styles}
              theme={theme}
            />
          </View>
          <Text style={styles.section}>Recent</Text>
          {recent}
        </View>
      </View>
    </Modal>
  );
}

function Action({
  icon,
  label,
  onPress,
  primary = false,
  wide = false,
  styles,
  theme,
}: {
  icon: AndroidSymbol;
  label: string;
  onPress: () => void;
  primary?: boolean;
  wide?: boolean;
  styles: Styles;
  theme: Theme;
}) {
  const color = primary ? theme.colors.accentInk : theme.colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, wide && styles.actionWide, primary && styles.actionPrimary, pressed && styles.actionPressed]}
    >
      <SymbolView name={{ android: icon, web: icon }} tintColor={color} size={20} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end" },
    scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
    sheet: {
      gap: space[3],
      paddingTop: space[2],
      paddingHorizontal: space[4],
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderTopWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, marginBottom: space[1], backgroundColor: colors.faint },
    h2: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
    chip: { height: 32, justifyContent: "center", paddingHorizontal: space[3], borderRadius: radius.pill, backgroundColor: colors.surface2 },
    chipOn: { backgroundColor: colors.accentSoft },
    chipLabel: { color: colors.muted, fontSize: fontSize.sm },
    chipLabelOn: { color: colors.accentText, fontWeight: "600" },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
    action: {
      flexBasis: "48%",
      flexGrow: 1,
      height: tap,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space[2],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    actionWide: { flexBasis: "100%" },
    actionPrimary: { backgroundColor: colors.accent },
    actionPressed: { opacity: 0.85 },
    actionLabel: { fontSize: fontSize.sm, fontWeight: "600" },
    section: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.7 },
    recent: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 56 },
    recentDivided: { borderTopWidth: 1, borderTopColor: colors.border },
    pressed: { backgroundColor: colors.surface2 },
    info: { flex: 1, minWidth: 0 },
    name: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
    meta: { color: colors.muted, fontSize: fontSize.sm },
    plus: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
    },
    plusLabel: { color: colors.accentText, fontSize: fontSize.lg, fontWeight: "600" },
    message: { color: colors.muted, fontSize: fontSize.sm, paddingVertical: space[2] },
    errorRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
    retry: { height: 32, justifyContent: "center", paddingHorizontal: space[3], borderRadius: radius.pill, backgroundColor: colors.surface2 },
    retryLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
  });
}
