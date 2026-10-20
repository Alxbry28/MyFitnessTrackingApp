import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolView, type AndroidSymbol } from "expo-symbols";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { MatchSheet } from "@/modules/nutrition/components/MatchSheet";
import { PasteLogPreview } from "@/modules/nutrition/components/PasteLogPreview";
import { usePasteLog, type PreviewLine, type PreviewSection } from "@/modules/nutrition/hooks/usePasteLog";
import { dayKey, formatDayLabel, MEAL_LABELS } from "@/modules/nutrition/services/mealTime";
import { formatKcal } from "@/modules/nutrition/services/nutritionCalc";
import { copyLunchToDinner, editorSpans } from "@/modules/nutrition/services/pasteLog";

type FoodLine = Extract<PreviewLine, { kind: "food" }>;
type Styles = ReturnType<typeof makeStyles>;

function joinMeals(labels: string[]): string {
  return labels.length < 2 ? labels.join("") : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

// Every meal that has a line with this name, so one choice visibly covers them all.
function mealsFor(key: string, sections: PreviewSection[]): string {
  const labels = sections
    .filter((s) => s.lines.some((l) => l.kind === "food" && l.food.key === key))
    .map((s) => MEAL_LABELS[s.meal]);
  return joinMeals([...new Set(labels)]);
}

export default function PasteLogScreen() {
  const { day: requestedDay } = useLocalSearchParams<{ day?: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const log = usePasteLog(requestedDay);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [notice, setNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState<FoodLine | null>(null);
  const lunchCopy = useMemo(() => copyLunchToDinner(log.text), [log.text]);
  const spans = useMemo(() => editorSpans(log.text), [log.text]);
  const dayLabel = formatDayLabel(log.day, dayKey(new Date()));

  // Android back on the Preview returns to the text instead of closing the screen.
  useEffect(() => {
    if (mode !== "preview") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setMode("write");
      return true;
    });
    return () => sub.remove();
  }, [mode]);

  const paste = async () => {
    setNotice(null);
    try {
      const clip = await Clipboard.getStringAsync();
      if (clip.trim()) log.setText(clip);
      else setNotice("Nothing to paste");
    } catch {
      setNotice("Couldn't read the clipboard.");
    }
  };

  const copyYesterday = async () => {
    setNotice(await log.copyPreviousDay());
  };

  const appBar =
    mode === "write" ? (
      <AppBar
        icon="close"
        iconLabel="Close"
        onIcon={() => router.back()}
        title="Text log"
        sub={dayLabel}
        top={insets.top}
        styles={styles}
        theme={theme}
      />
    ) : (
      <AppBar
        icon="arrow_back"
        iconLabel="Back to text"
        onIcon={() => setMode("write")}
        title="Preview"
        sub={dayLabel}
        top={insets.top}
        styles={styles}
        theme={theme}
      />
    );

  if (mode === "write") {
    const foods = log.summary.foods;
    return (
      <View style={styles.screen}>
        {appBar}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.chips}>
            <Chip icon="content_paste" label="Paste" onPress={() => void paste()} styles={styles} theme={theme} />
            <Chip
              icon="history"
              label="Copy yesterday"
              onPress={() => void copyYesterday()}
              styles={styles}
              theme={theme}
            />
            {lunchCopy !== null && (
              <Chip label="Lunch → Dinner" onPress={() => log.setText(lunchCopy)} styles={styles} theme={theme} />
            )}
          </View>
          {notice && (
            <Text style={styles.notice} accessibilityLiveRegion="polite">
              {notice}
            </Text>
          )}
          <View style={styles.halo}>
            <TextInput
              onChangeText={log.setText}
              multiline
              placeholder={"Breakfast:\n220g taho\n\nLunch:\n250g white rice"}
              placeholderTextColor={theme.colors.faint}
              accessibilityLabel="Paste your log"
              autoCorrect={false}
              autoCapitalize="none"
              textAlignVertical="top"
              style={styles.editor}
            >
              {/* Styled runs as children (frame 1 colors); their text always equals log.text. */}
              {spans.map((line, index) => (
                <Text key={index}>
                  {index > 0 ? "\n" : ""}
                  {line.map((span, i) => (
                    <Text key={i} style={span.tone === "heading" ? styles.editorHeading : span.tone === "amount" ? styles.editorAmount : undefined}>
                      {span.text}
                    </Text>
                  ))}
                </Text>
              ))}
            </TextInput>
          </View>
          <Text style={styles.format}>
            One header per meal, then one food per line: <Text style={styles.code}> 250g white rice </Text>,{" "}
            <Text style={styles.code}> 250ml milk </Text> or <Text style={styles.code}> 8oz chicken </Text>. Matched
            against your library, works offline.
          </Text>
          <Pressable
            onPress={() => setMode("preview")}
            disabled={foods === 0}
            accessibilityRole="button"
            accessibilityState={{ disabled: foods === 0 }}
            style={[styles.btn, styles.primary, foods === 0 && styles.disabled]}
          >
            <Text style={styles.primaryLabel}>{foods === 1 ? "Preview 1 food" : `Preview ${foods} foods`}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  let body: ReactNode;
  if (log.load === "loading") {
    body = <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading your products" />;
  } else if (log.load === "error") {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>{"Couldn't load your products."}</Text>
        <Pressable onPress={log.retry} accessibilityRole="button" style={[styles.btn, styles.ghost, styles.padded]}>
          <Text style={styles.ghostLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  } else {
    body = (
      <PasteLogPreview
        sections={log.sections}
        summary={log.summary}
        onPickMeal={log.pickMeal}
        onOpenLine={(line) => setChecking(line)}
      />
    );
  }

  const { log: logCount, skip } = log.summary;
  const disabled = logCount === 0 || log.saving || log.load !== "ready";
  const logLabel = skip > 0 ? `Log ${logCount}, skip ${skip}` : `Log ${logCount}`;

  return (
    <View style={styles.screen}>
      {appBar}
      <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
      <View style={[styles.bottom, { paddingBottom: theme.space[4] + insets.bottom }]}>
        {log.saveError && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {log.saveError}
          </Text>
        )}
        <View style={styles.total}>
          <Text style={styles.totalLabel}>Total so far</Text>
          <Text style={styles.totalValue}>{formatKcal(log.summary.kcal)} kcal</Text>
        </View>
        <View style={styles.row}>
          <Pressable onPress={() => setMode("write")} accessibilityRole="button" style={[styles.btn, styles.ghost, styles.rowSmall]}>
            <Text style={styles.ghostLabel}>Edit text</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              if (await log.confirm()) router.back();
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled, busy: log.saving }}
            style={[styles.btn, styles.primary, styles.rowBig, disabled && styles.disabled]}
          >
            <Text style={styles.primaryLabel}>{log.saving ? "Saving..." : logLabel}</Text>
          </Pressable>
        </View>
      </View>
      {checking && (
        <MatchSheet
          food={checking.food}
          match={checking.match}
          meals={mealsFor(checking.food.key, log.sections)}
          onUse={(product, remember) => {
            log.choose(checking.food.key, product, remember);
            setChecking(null);
          }}
          onCreated={(productId, remember) => {
            setChecking(null);
            void log.chooseCreated(checking.food.key, productId, remember);
          }}
          onClose={() => setChecking(null)}
        />
      )}
    </View>
  );
}

// The prototype's app bar: muted icon button, title, then the day on the right.
function AppBar({
  icon,
  iconLabel,
  onIcon,
  title,
  sub,
  top,
  styles,
  theme,
}: {
  icon: AndroidSymbol;
  iconLabel: string;
  onIcon: () => void;
  title: string;
  sub: string;
  top: number;
  styles: Styles;
  theme: Theme;
}) {
  return (
    <View style={[styles.appbar, { paddingTop: top + theme.space[2] }]}>
      <Pressable
        onPress={onIcon}
        accessibilityRole="button"
        accessibilityLabel={iconLabel}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
      >
        <SymbolView name={{ android: icon, web: icon }} tintColor={theme.colors.muted} size={22} />
      </Pressable>
      <Text style={styles.appbarTitle} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.appbarSub}>{sub}</Text>
    </View>
  );
}

function Chip({
  icon,
  label,
  onPress,
  styles,
  theme,
}: {
  icon?: AndroidSymbol;
  label: string;
  onPress: () => void;
  styles: Styles;
  theme: Theme;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
      {icon && <SymbolView name={{ android: icon, web: icon }} tintColor={theme.colors.muted} size={16} />}
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    appbar: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
      paddingHorizontal: space[4],
      paddingBottom: space[3],
      backgroundColor: colors.bg,
    },
    iconBtn: {
      width: tap,
      height: tap,
      marginLeft: -space[3],
      borderRadius: tap / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBtnPressed: { backgroundColor: colors.surface2 },
    appbarTitle: { flex: 1, color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
    appbarSub: { color: colors.muted, fontSize: fontSize.sm },
    content: { flexGrow: 1, paddingHorizontal: space[4], paddingBottom: space[4], gap: space[3] },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[1],
      height: 32,
      paddingHorizontal: space[3],
      borderRadius: radius.pill,
      backgroundColor: colors.surface2,
    },
    chipPressed: { backgroundColor: colors.border },
    chipLabel: { color: colors.muted, fontSize: fontSize.sm },
    notice: { color: colors.muted, fontSize: fontSize.sm },
    // The 3 dp accentSoft ring stands in for the prototype's box-shadow halo.
    halo: { flexGrow: 1, padding: 3, borderRadius: radius.md + 3, backgroundColor: colors.accentSoft },
    editor: {
      flexGrow: 1,
      minHeight: tap * 6,
      padding: space[4],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: fontSize.md,
      lineHeight: 23,
    },
    editorHeading: { color: colors.accentText, fontWeight: "700" },
    editorAmount: { color: colors.muted },
    format: { color: colors.muted, fontSize: fontSize.xs },
    code: { color: colors.text, backgroundColor: colors.surface2 },
    center: { alignItems: "center", gap: space[4] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    error: { color: colors.over, fontSize: fontSize.sm },
    bottom: {
      gap: space[3],
      paddingTop: space[3],
      paddingHorizontal: space[4],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    total: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    totalLabel: { color: colors.muted, fontSize: fontSize.sm },
    totalValue: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", fontVariant: ["tabular-nums"] },
    row: { flexDirection: "row", gap: space[2] },
    rowSmall: { flex: 1 },
    rowBig: { flex: 2 },
    btn: { minHeight: tap, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
    padded: { paddingHorizontal: space[5] },
    primary: { backgroundColor: colors.accent },
    primaryLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
    ghost: { backgroundColor: colors.surface2 },
    ghostLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
    disabled: { opacity: 0.4 },
  });
}
