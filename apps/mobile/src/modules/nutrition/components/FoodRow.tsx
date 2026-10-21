import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

type Props = {
  name: string;
  meta: string;
  query: string;
  first: boolean;
  onPress: () => void;
};

// The first case-insensitive match of the query, for search.html's <mark>.
function splitMatch(name: string, query: string): [string, string, string] {
  const q = query.trim();
  const at = q ? name.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return [name, "", ""];
  return [name.slice(0, at), name.slice(at, at + q.length), name.slice(at + q.length)];
}

// A search.html .prod row: name with the match marked, meta, and a round "+".
export function FoodRow({ name, meta, query, first, onPress }: Props) {
  const styles = makeStyles(useTheme());
  const [before, match, after] = splitMatch(name, query);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${meta}. Add`}
      style={({ pressed }) => [styles.row, !first && styles.divided, pressed && styles.pressed]}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {before}
          {match !== "" && <Text style={styles.mark}>{match}</Text>}
          {after}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <View style={styles.plus} importantForAccessibility="no-hide-descendants">
        <Text style={styles.plusText}>+</Text>
      </View>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize } = theme;
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 60, paddingVertical: space[2], paddingHorizontal: space[4] },
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
    pressed: { backgroundColor: colors.surface2 },
    info: { flex: 1, minWidth: 0 },
    name: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
    mark: { color: colors.accentText, fontWeight: "700" },
    meta: { color: colors.muted, fontSize: fontSize.sm },
    plus: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft },
    plusText: { color: colors.accentText, fontSize: fontSize.lg, fontWeight: "600" },
  });
}
