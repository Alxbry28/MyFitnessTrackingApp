import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

type Props = { changes: string[]; onDiscard: () => void; onKeep: () => void };

// prototypes/entry-edit.html frame 4.
export function DiscardDialog({ changes, onDiscard, onKeep }: Props) {
  const styles = makeStyles(useTheme());
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onKeep}>
      <View style={styles.backdrop}>
        <View style={styles.scrim} />
        <View style={styles.dialog} accessibilityRole="alert">
          <Text style={styles.h2} accessibilityRole="header">
            Discard changes?
          </Text>
          <Text style={styles.p}>{"You changed this entry but didn't save:"}</Text>
          <View style={styles.list}>
            {changes.map((line) => (
              <Text key={line} style={styles.item}>
                <Text style={styles.bullet}>• </Text>
                {line}
              </Text>
            ))}
          </View>
          <View style={styles.actions}>
            <Pressable onPress={onDiscard} accessibilityRole="button" style={styles.action}>
              <Text style={styles.discard}>Discard</Text>
            </Pressable>
            <Pressable onPress={onKeep} accessibilityRole="button" style={[styles.action, styles.keep]}>
              <Text style={styles.keepLabel}>Keep editing</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "center", paddingHorizontal: space[5] },
    scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
    dialog: {
      gap: space[3],
      padding: space[5],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    h2: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
    p: { color: colors.muted, fontSize: fontSize.md, lineHeight: 22 },
    list: { gap: space[1] },
    item: { color: colors.text, fontSize: fontSize.sm },
    bullet: { color: colors.accentText },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: space[2], marginTop: space[2] },
    action: { minHeight: tap, justifyContent: "center", paddingHorizontal: space[4], borderRadius: radius.sm },
    discard: { color: colors.over, fontSize: fontSize.md, fontWeight: "600" },
    keep: { backgroundColor: colors.accent },
    keepLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "600" },
  });
}
