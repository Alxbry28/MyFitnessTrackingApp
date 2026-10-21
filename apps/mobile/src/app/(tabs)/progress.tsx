import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { BmiCard } from "@/modules/body/components/BmiCard";
import { WeighInRow } from "@/modules/body/components/WeighInRow";
import { WeightCard } from "@/modules/body/components/WeightCard";
import { useMeasurements } from "@/modules/body/hooks/useMeasurements";
import { useProgress } from "@/modules/body/hooks/useProgress";
import { formatCm, formatDelta } from "@/modules/body/services/measurementCalc";

export default function ProgressScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { state, retry } = useProgress();
  const measurements = useMeasurements();

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

      {/* Body Measurements Card */}
      <Pressable
        onPress={() => router.push("/measurements" as any)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.measureCard, pressed && styles.pressed]}
      >
        <View style={styles.measureHeader}>
          <View style={styles.measureTitleRow}>
            <Text style={styles.measureTitle}>Body Measurements</Text>
            {measurements.waistToHeight && (
              <View
                style={[
                  styles.wthBadge,
                  measurements.waistToHeight.category === "healthy"
                    ? styles.wthHealthy
                    : styles.wthWarning,
                ]}
              >
                <Text
                  style={[
                    styles.wthBadgeText,
                    measurements.waistToHeight.category === "healthy"
                      ? styles.wthTextHealthy
                      : styles.wthTextWarning,
                  ]}
                >
                  WHtR {measurements.waistToHeight.ratio.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.measureArrow}>›</Text>
        </View>

        {measurements.deltas.length > 0 ? (
          <View style={styles.measureGrid}>
            {measurements.deltas.slice(0, 4).map((d) => (
              <View key={d.siteKey} style={styles.measurePill}>
                <Text style={styles.pillLabel}>{d.label}</Text>
                <Text style={styles.pillValue}>{formatCm(d.currentCm)}</Text>
                {d.deltaLastCm !== null && d.deltaLastCm !== undefined && (
                  <Text
                    style={[
                      styles.pillDelta,
                      d.deltaLastCm > 0
                        ? styles.deltaPlus
                        : d.deltaLastCm < 0
                          ? styles.deltaMinus
                          : styles.deltaNeutral,
                    ]}
                  >
                    {formatDelta(d.deltaLastCm)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.measureEmpty}>
            Track waist, chest, arms and thighs over time. Tap to log measurements.
          </Text>
        )}
      </Pressable>

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
    pressed: { opacity: 0.8 },
    measureCard: {
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space[4],
      gap: space[3],
    },
    measureHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    measureTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    measureTitle: {
      fontSize: fontSize.md,
      fontWeight: "700",
      color: colors.text,
    },
    wthBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    wthHealthy: {
      backgroundColor: "#2e7d3222",
    },
    wthWarning: {
      backgroundColor: "#ed6c0222",
    },
    wthBadgeText: {
      fontSize: 11,
      fontWeight: "700",
    },
    wthTextHealthy: {
      color: "#2e7d32",
    },
    wthTextWarning: {
      color: "#ed6c02",
    },
    measureArrow: {
      fontSize: fontSize.lg,
      color: colors.faint,
    },
    measureGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    measurePill: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: colors.surface2,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 2,
    },
    pillLabel: {
      fontSize: 11,
      color: colors.muted,
      fontWeight: "500",
    },
    pillValue: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    pillDelta: {
      fontSize: 10,
      fontWeight: "600",
    },
    deltaPlus: {
      color: colors.accent,
    },
    deltaMinus: {
      color: "#0288d1",
    },
    deltaNeutral: {
      color: colors.muted,
    },
    measureEmpty: {
      fontSize: fontSize.sm,
      color: colors.muted,
      lineHeight: 18,
    },
  });
}
