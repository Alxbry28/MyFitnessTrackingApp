import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { EntryEditForm } from "@/modules/nutrition/components/EntryEditForm";
import { useEntry } from "@/modules/nutrition/hooks/useEntry";
import { dayKey } from "@/modules/nutrition/services/mealTime";

// Built to prototypes/entry-edit.html; the native header is hidden in _layout.
export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { state, retry, save, remove } = useEntry(id);
  const [today] = useState(() => dayKey(new Date()));

  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading entry" />
      </View>
    );
  }
  if (state.status === "not_found" || state.status === "error") {
    const notFound = state.status === "not_found";
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          {notFound ? "This entry doesn't exist anymore." : "Couldn't load this entry."}
        </Text>
        <Pressable onPress={notFound ? () => router.back() : retry} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonLabel}>{notFound ? "Back to log" : "Retry"}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <EntryEditForm
      entry={state.entry}
      servingGrams={state.servingGrams}
      dayKcal={state.dayKcal}
      today={today}
      onSave={save}
      onDelete={remove}
      onLeave={() => router.back()}
    />
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4], padding: space[5], backgroundColor: colors.bg },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    button: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    buttonLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  });
}
