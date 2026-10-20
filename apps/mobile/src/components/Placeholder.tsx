import { StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

export function Placeholder({ title, feature }: { title: string; feature: number }) {
  const styles = makeStyles(useTheme());
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>Coming in feature {feature}.</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize } = theme;
  return StyleSheet.create({
    screen: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[2], backgroundColor: colors.bg },
    title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
    body: { color: colors.muted, fontSize: fontSize.md },
  });
}
