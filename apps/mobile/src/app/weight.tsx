import { router, Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { WeightForm } from "@/modules/body/components/WeightForm";
import { useWeightEntry } from "@/modules/body/hooks/useWeightEntry";
import { dayKey } from "@/modules/nutrition/services/mealTime";

export default function WeightScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { state, retry, manualOnDay, save, remove } = useWeightEntry(id);

  let body;
  if (state.status === "loading") {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading weight" />
      </View>
    );
  } else if (state.status === "not_found" || state.status === "error") {
    const notFound = state.status === "not_found";
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>
          {notFound ? "This weigh-in doesn't exist anymore." : "Couldn't load your weight."}
        </Text>
        <Pressable onPress={notFound ? () => router.back() : retry} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonLabel}>{notFound ? "Back" : "Retry"}</Text>
        </Pressable>
      </View>
    );
  } else {
    body = (
      <WeightForm
        initialKg={state.prefillKg}
        initialDay={state.entry?.day ?? dayKey(new Date())}
        yesterdayKg={state.yesterdayKg}
        averageKg={state.averageKg}
        manualOnDay={manualOnDay}
        onSave={save}
        onDelete={state.entry ? remove : undefined}
        onDone={() => router.back()}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: id ? "Edit weigh-in" : "Log weight" }} />
      {body}
    </>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: space[4],
      padding: space[5],
      backgroundColor: colors.bg,
    },
    message: {
      color: colors.muted,
      fontSize: fontSize.md,
      textAlign: "center",
    },
    button: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    buttonLabel: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: "600",
    },
  });
}
