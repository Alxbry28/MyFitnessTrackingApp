import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { AmountForm } from "@/modules/nutrition/components/AmountForm";
import { useEntry } from "@/modules/nutrition/hooks/useEntry";
import { gramsToText } from "@/modules/nutrition/services/entrySchema";

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { state, retry, save } = useEntry(id);

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

  const { entry } = state;
  return (
    <AmountForm
      name={entry.productName}
      per100={entry}
      defaultValues={{ mealType: entry.mealType, grams: gramsToText(entry.grams) }}
      submitLabel={() => "Save changes"}
      onSubmit={save}
      onSaved={() => router.back()}
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
