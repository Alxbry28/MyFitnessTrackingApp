import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { BmiCard } from "@/modules/body/components/BmiCard";
import { WeighInRow } from "@/modules/body/components/WeighInRow";
import { WeightCard } from "@/modules/body/components/WeightCard";
import { useProgress } from "@/modules/body/hooks/useProgress";

export default function ProgressScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { state, retry } = useProgress();

  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading progress" />
      </View>
    );
  }
  if (state.status === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{"Couldn't load your progress."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const logWeight = () => router.push("/weight");
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <WeightCard
        trend={state.trend}
        chart={state.chart}
        latest={state.latest}
        today={state.today}
        onLog={logWeight}
      />
      <BmiCard
        profile={state.profile}
        latest={state.latest}
        onEditProfile={() => router.push("/body-profile")}
      />
      {state.recent.length > 0 && (
        <>
          <Text style={styles.section} accessibilityRole="header">
            Last 14 days
          </Text>
          <View style={styles.card}>
            {state.recent.map((reading, index) => (
              <WeighInRow
                key={reading.id}
                reading={reading}
                today={state.today}
                divided={index > 0}
                onPress={() => router.push({ pathname: "/weight", params: { id: reading.id } })}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: space[4], gap: space[4] },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4], backgroundColor: colors.bg },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    section: {
      color: colors.muted,
      fontSize: fontSize.xs,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: -space[2],
    },
    card: { borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surface },
    secondaryButton: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    secondaryLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  });
}
