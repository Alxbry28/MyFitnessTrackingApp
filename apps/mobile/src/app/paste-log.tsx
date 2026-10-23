import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
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
import { AiMealPreview } from "@/modules/nutrition/components/AiMealPreview";
import { MatchSheet } from "@/modules/nutrition/components/MatchSheet";
import { PasteLogPreview } from "@/modules/nutrition/components/PasteLogPreview";
import { usePasteLog, type PreviewLine, type PreviewSection } from "@/modules/nutrition/hooks/usePasteLog";
import * as foodLogRepo from "@/modules/nutrition/repositories/foodLogRepo";
import * as productRepo from "@/modules/nutrition/repositories/productRepo";
import * as pantryRepo from "@/modules/pantry/repositories/pantryRepo";
import * as settingsRepo from "@/modules/nutrition/repositories/settingsRepo";
import { parseMealsWithAi, type AiMealParseResult } from "@/modules/nutrition/services/aiMealParser";
import { dayKey, formatDayLabel, MEAL_LABELS } from "@/modules/nutrition/services/mealTime";
import { formatKcal } from "@/modules/nutrition/services/nutritionCalc";
import { copyLunchToDinner, textFromEntries } from "@/modules/nutrition/services/pasteLog";

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
  const { day: requestedDay, ai: requestedAi } = useLocalSearchParams<{ day?: string; ai?: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const log = usePasteLog(requestedDay);
  const [mode, setMode] = useState<"write" | "preview" | "ai_preview">("write");
  const [notice, setNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState<FoodLine | null>(null);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiMealParseResult | null>(null);

  const lunchCopy = useMemo(() => copyLunchToDinner(log.text), [log.text]);
  const dayLabel = formatDayLabel(log.day, dayKey(new Date()));

  // Android back on the Preview / AI Preview returns to the text instead of closing the screen.
  useEffect(() => {
    if (mode === "write") return;
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

  const handleParseAi = async () => {
    setNotice(null);
    setAiError(null);
    const trimmed = log.text.trim();
    if (!trimmed) {
      setNotice("Type or paste your meals first.");
      return;
    }

    const apiKey = await settingsRepo.getAiApiKey(db);
    if (!apiKey) {
      setAiError("AI API Key not configured. Please add your free Google Gemini API key in Settings.");
      return;
    }

    const provider = (await settingsRepo.getAiProvider(db)) ?? "gemini";
    const model = await settingsRepo.getAiModel(db, provider);
    setAiLoading(true);
    try {
      const result = await parseMealsWithAi({
        text: trimmed,
        apiKey,
        provider,
        model,
      });
      setAiResult(result);
      setMode("ai_preview");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to analyze meal with AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleRemoveAiItem = (mealIdx: number, itemIdx: number) => {
    if (!aiResult) return;
    const newMeals = aiResult.meals.map((meal, mIdx) => {
      if (mIdx !== mealIdx) return meal;
      return {
        ...meal,
        items: meal.items.filter((_, iIdx) => iIdx !== itemIdx),
      };
    });
    const allItems = newMeals.flatMap((m) => m.items);
    const totalKcal = allItems.reduce((sum, item) => sum + item.calories, 0);
    const totalProtein = Math.round(allItems.reduce((sum, item) => sum + item.protein, 0) * 10) / 10;
    const totalCarbs = Math.round(allItems.reduce((sum, item) => sum + item.carbs, 0) * 10) / 10;
    const totalFat = Math.round(allItems.reduce((sum, item) => sum + item.fat, 0) * 10) / 10;

    setAiResult({
      meals: newMeals,
      totalKcal,
      totalProtein,
      totalCarbs,
      totalFat,
    });
  };

  const handleSaveAiLog = async () => {
    if (!aiResult) return;
    setAiSaving(true);
    try {
      if (log.initialEntryIds.length > 0) {
        for (const id of log.initialEntryIds) {
          await foodLogRepo.softDelete(db, id);
        }
      }
      for (const meal of aiResult.meals) {
        for (const item of meal.items) {
          const searchResults = await productRepo.search(db, item.name);
          let product = searchResults.find(
            (p) => p.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
          );
          if (!product) {
            const createRes = await productRepo.create(
              db,
              {
                barcode: null,
                name: item.name.trim(),
                brand: null,
                servingSize: null,
                servingGrams: null,
                kcalPer100g: item.kcalPer100g,
                proteinPer100g: item.proteinPer100g,
                carbsPer100g: item.carbsPer100g,
                fatPer100g: item.fatPer100g,
                netWeightG: null,
                eatenDrained: false,
                drainedKcalPer100g: null,
                drainedProteinPer100g: null,
                drainedCarbsPer100g: null,
                drainedFatPer100g: null,
                usualDrainedG: null,
              },
              "manual",
            );
            if (createRes.ok) {
              const created = await productRepo.findById(db, createRes.id);
              if (created) product = created;
            }
          }
          if (product) {
            const stockItem = await pantryRepo.stockForProduct(db, product.id);
            if (stockItem) {
              await pantryRepo.logPortion(db, {
                itemId: stockItem.id,
                product,
                mealType: meal.mealType,
                grams: item.grams,
                day: log.day,
                wholeUnit: false,
              });
            } else {
              await foodLogRepo.create(db, product, {
                day: log.day,
                mealType: meal.mealType,
                grams: item.grams,
              });
            }
          }
        }
      }
      router.back();
    } catch {
      setAiError("Couldn't save parsed items to your log. Please try again.");
    } finally {
      setAiSaving(false);
    }
  };

  const appBar =
    mode === "write" ? (
      <AppBar
        icon="close"
        iconLabel="Close"
        onIcon={() => router.back()}
        title={requestedAi === "1" ? "AI Meal Parse" : log.isEditingExisting ? "Edit today's meals" : "Edit meal list"}
        sub={log.isEditingExisting ? `${dayLabel} · ${log.initialEntryIds.length} items loaded` : dayLabel}
        top={insets.top}
        styles={styles}
        theme={theme}
      />
    ) : mode === "preview" ? (
      <AppBar
        icon="arrow_back"
        iconLabel="Back to text"
        onIcon={() => setMode("write")}
        title="Match preview"
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
        title="AI Breakdown"
        sub={dayLabel}
        top={insets.top}
        styles={styles}
        theme={theme}
      />
    );

  if (mode === "ai_preview" && aiResult) {
    return (
      <View style={styles.screen}>
        {appBar}
        <AiMealPreview
          result={aiResult}
          dayLabel={dayLabel}
          saving={aiSaving}
          onSave={() => void handleSaveAiLog()}
          onBack={() => setMode("write")}
          onRemoveItem={handleRemoveAiItem}
        />
      </View>
    );
  }

  if (mode === "write") {
    const foods = log.summary.foods;
    return (
      <View style={styles.screen}>
        {appBar}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.chips}>
            {log.isEditingExisting && (
              <Chip
                label="Reload today's log"
                onPress={async () => {
                  const entries = await foodLogRepo.listByDay(db, log.day);
                  log.setText(textFromEntries(entries));
                }}
                styles={styles}
                theme={theme}
              />
            )}
            <Chip
              label="Format template"
              onPress={() =>
                log.setText(
                  "Breakfast:\n100g food\n\nLunch:\n100g food\n\nDinner:\n100g food\n\nSnacks:\n100g food\n\nSupplements:\n1 cap Hydroxicut\n5g Creatine",
                )
              }
              styles={styles}
              theme={theme}
            />
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

          {aiError && (
            <View style={styles.aiErrorCard}>
              <Text style={styles.aiErrorText}>{aiError}</Text>
              {aiError.includes("Settings") && (
                <Pressable
                  onPress={() => router.push("/(tabs)/settings")}
                  style={styles.aiSettingsBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.aiSettingsBtnText}>Open Settings</Text>
                </Pressable>
              )}
            </View>
          )}

          {notice && (
            <Text style={styles.notice} accessibilityLiveRegion="polite">
              {notice}
            </Text>
          )}

          <View style={styles.halo}>
            <TextInput
              value={log.text}
              onChangeText={log.setText}
              multiline
              placeholder={"Breakfast:\n100g food\n\nLunch:\n100g food\n\nDinner:\n100g food\n\nSnacks:\n100g food\n\nSupplements:\n1 cap Hydroxicut\n5g Creatine"}
              placeholderTextColor={theme.colors.faint}
              accessibilityLabel="Paste your log"
              autoCorrect={false}
              autoCapitalize="none"
              textAlignVertical="top"
              style={styles.editor}
            />
          </View>

          <Text style={styles.format}>
            Format: <Text style={styles.code}>Breakfast:\n100g food</Text>, <Text style={styles.code}>Supplements:\n1 cap Hydroxicut\n5g Creatine</Text>. Logged supplements will automatically deduct from your Supplement Inventory.
          </Text>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => setMode("preview")}
              disabled={foods === 0 || aiLoading}
              accessibilityRole="button"
              accessibilityState={{ disabled: foods === 0 || aiLoading }}
              style={[
                styles.btn,
                styles.ghost,
                styles.actionHalf,
                (foods === 0 || aiLoading) && styles.disabled,
              ]}
            >
              <Text style={styles.ghostLabel}>
                {foods <= 1 ? "Offline Match" : `Match (${foods})`}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => void handleParseAi()}
              disabled={aiLoading || !log.text.trim()}
              accessibilityRole="button"
              accessibilityState={{ disabled: aiLoading || !log.text.trim(), busy: aiLoading }}
              style={[
                styles.btn,
                styles.primary,
                styles.actionHalf,
                (aiLoading || !log.text.trim()) && styles.disabled,
              ]}
            >
              {aiLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.colors.accentInk} />
                  <Text style={styles.primaryLabel}>Analyzing...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <SymbolView
                    name={{ android: "auto_awesome", web: "auto_awesome" }}
                    tintColor={theme.colors.accentInk}
                    size={18}
                  />
                  <Text style={styles.primaryLabel}>✨ AI Parse</Text>
                </View>
              )}
            </Pressable>
          </View>
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
    aiErrorCard: {
      backgroundColor: colors.overSoft ?? colors.surface2,
      padding: space[3],
      borderRadius: radius.md,
      gap: space[2],
      borderWidth: 1,
      borderColor: colors.over,
    },
    aiErrorText: {
      color: colors.over,
      fontSize: fontSize.sm,
      fontWeight: "500",
    },
    aiSettingsBtn: {
      alignSelf: "flex-start",
      backgroundColor: colors.surface,
      paddingHorizontal: space[3],
      paddingVertical: 6,
      borderRadius: radius.sm,
    },
    aiSettingsBtnText: {
      fontSize: fontSize.xs,
      fontWeight: "700",
      color: colors.text,
    },
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
    format: { color: colors.muted, fontSize: fontSize.xs },
    code: { color: colors.text, backgroundColor: colors.surface2 },
    center: { alignItems: "center", gap: space[4] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    error: { color: colors.over, fontSize: fontSize.sm },
    actionsRow: {
      flexDirection: "row",
      gap: space[2],
    },
    actionHalf: {
      flex: 1,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
    },
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
