import { router } from "expo-router";
import { SymbolView, type AndroidSymbol } from "expo-symbols";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Styles = ReturnType<typeof makeStyles>;

export function AddStockSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();

  const go = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: theme.space[5] + insets.bottom }]}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
            <View style={styles.grabber} />
          </Pressable>

          <Text style={styles.title} accessibilityRole="header">
            Add to Pantry
          </Text>
          <Text style={styles.subtitle}>Stock supplements, groceries, or cooked batches</Text>

          <View style={styles.options}>
            <OptionRow
              icon="medication"
              title="New Supplement"
              subtitle="AI Quick Fill, barcode scan, or manual entry"
              primary
              onPress={() => go(() => router.push("/pantry/new-supplement"))}
              styles={styles}
              theme={theme}
            />

            <OptionRow
              icon="search"
              title="Search Food Library"
              subtitle="Choose from saved products or cooked batches"
              onPress={() => go(() => router.push({ pathname: "/add", params: { for: "pantry" } }))}
              styles={styles}
              theme={theme}
            />

            <OptionRow
              icon="kitchen"
              title="New Grocery Item"
              subtitle="AI Quick Fill, barcode scan, or manual entry"
              onPress={() =>
                go(() =>
                  router.push({
                    pathname: "/product/[id]",
                    params: { id: "new", then: "pantry", kind: "packaged" },
                  }),
                )
              }
              styles={styles}
              theme={theme}
            />

            <OptionRow
              icon="barcode_scanner"
              title="Scan Barcode"
              subtitle="Look up package via camera barcode reader"
              onPress={() => go(() => router.push({ pathname: "/scan", params: { for: "pantry" } }))}
              styles={styles}
              theme={theme}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OptionRow({
  icon,
  title,
  subtitle,
  primary = false,
  onPress,
  styles,
  theme,
}: {
  icon: AndroidSymbol;
  title: string;
  subtitle: string;
  primary?: boolean;
  onPress: () => void;
  styles: Styles;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.option, primary && styles.optionPrimary, pressed && styles.optionPressed]}
    >
      <View style={[styles.iconWrap, primary && styles.iconWrapPrimary]}>
        <SymbolView
          name={{ android: icon, web: icon }}
          tintColor={primary ? theme.colors.accentInk : theme.colors.text}
          size={22}
        />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.optionTitle, primary && styles.optionTitlePrimary]}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={[styles.arrow, primary && styles.arrowPrimary]}>›</Text>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius } = theme;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
    },
    scrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.scrim,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: space[4],
      paddingTop: space[3],
      gap: space[2],
    },
    grabber: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.faint,
      alignSelf: "center",
      marginBottom: space[2],
    },
    title: {
      color: colors.text,
      fontSize: fontSize.lg,
      fontWeight: "700",
    },
    subtitle: {
      color: colors.muted,
      fontSize: fontSize.sm,
      marginBottom: space[2],
    },
    options: {
      gap: space[2],
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionPrimary: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    optionPressed: {
      opacity: 0.85,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    iconWrapPrimary: {
      backgroundColor: colors.accent,
    },
    textWrap: {
      flex: 1,
      minWidth: 0,
    },
    optionTitle: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: "600",
    },
    optionTitlePrimary: {
      color: colors.accentText,
    },
    optionSubtitle: {
      color: colors.muted,
      fontSize: fontSize.xs,
      marginTop: 2,
    },
    arrow: {
      color: colors.faint,
      fontSize: fontSize.lg,
    },
    arrowPrimary: {
      color: colors.accentText,
      fontWeight: "600",
    },
  });
}
