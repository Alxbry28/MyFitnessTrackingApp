import { Component, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

export function StartupLoading() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.screen} accessibilityLabel="Opening your data">
      <ActivityIndicator color={theme.colors.accent} size="large" />
    </View>
  );
}

function StartupError({ error }: { error: Error }) {
  const styles = makeStyles(useTheme());
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{"Couldn't open your data"}</Text>
      <Text style={styles.body}>
        Nothing was deleted. Close and reopen the app to try again.
      </Text>
      <Text style={styles.detail}>{error.message}</Text>
    </View>
  );
}

type BoundaryState = { error: Error | null };

// Catches a failed database open or migration thrown by the suspense SQLiteProvider.
export class DatabaseErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) return <StartupError error={this.state.error} />;
    return this.props.children;
  }
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize } = theme;
  return StyleSheet.create({
    screen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: space[3],
      padding: space[5],
      backgroundColor: colors.bg,
    },
    title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", textAlign: "center" },
    body: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    detail: { color: colors.faint, fontSize: fontSize.xs, textAlign: "center" },
  });
}
