import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { FoodRow } from "@/modules/nutrition/components/FoodRow";
import { useFoodSearch } from "@/modules/nutrition/hooks/useFoodSearch";
import { loggedPer100 } from "@/modules/nutrition/services/drained";
import { gramsToText } from "@/modules/nutrition/services/entrySchema";
import { defaultMeal, MEAL_LABELS } from "@/modules/nutrition/services/mealTime";
import { formatKcal } from "@/modules/nutrition/services/nutritionCalc";
import { MEAL_TYPES, type MealType } from "@/modules/nutrition/types/foodLog";
import type { Product } from "@/modules/nutrition/types/product";
import { stockLeftText, unitsText, weightText } from "@/modules/pantry/services/pantryStock";
import type { PantryStock } from "@/modules/pantry/types/pantry";

function isMealType(value: string | undefined): value is MealType {
  return MEAL_TYPES.some((m) => m === value);
}

function productMeta(product: Product, lastGrams: number | undefined): string {
  return [
    product.brand,
    `${formatKcal(loggedPer100(product).kcalPer100g)} kcal / 100 g${product.eatenDrained ? " drained" : ""}`,
    lastGrams !== undefined ? `last ${gramsToText(lastGrams)} g` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function pantryMeta(item: PantryStock): string {
  if (item.kind === "supplement") return `${weightText(item.gramsLeft)} left`;
  return `${unitsText(item.gramsLeft, item.netWeightG)} · ${stockLeftText(item)}`;
}

// Built to prototypes/search.html frame 1, with "In my pantry" first (8c).
export default function AddFoodScreen() {
  // meal and day pass through from Today and Log; the next screens validate them.
  // for=pantry comes from the scanner's Search products while adding stock.
  const { meal, day, for: target } = useLocalSearchParams<{ meal?: string; day?: string; for?: string }>();
  const pantryMode = target === "pantry";
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const [mealType, setMealType] = useState<MealType>(isMealType(meal) ? meal : defaultMeal(new Date()));
  const { query, setQuery, state, retry } = useFoodSearch(!pantryMode);
  const q = query.trim();
  const logParams = { meal: mealType, ...(day ? { day } : {}) };

  const pickProduct = (product: Product) =>
    pantryMode
      ? router.push({ pathname: "/pantry/add/[productId]", params: { productId: product.id } })
      : router.push({ pathname: "/add/[productId]", params: { productId: product.id, ...logParams } });

  const pickPantry = (item: PantryStock) =>
    router.push({ pathname: "/pantry/portion/[itemId]", params: { itemId: item.id, ...logParams, from: "add" } });

  const searchOnline = () =>
    router.push({
      pathname: "/add/online",
      params: { q, ...(pantryMode ? { for: "pantry" } : logParams) },
    });

  const createProduct = () =>
    router.push({
      pathname: "/product/[id]",
      params: { id: "new", name: q, ...(pantryMode ? { then: "pantry" } : { then: "log", ...logParams }) },
    });

  const scan = () => router.push({ pathname: "/scan", params: pantryMode ? { for: "pantry" } : { meal: mealType } });

  let body: ReactNode;
  if (state.status === "loading") {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading foods" />
      </View>
    );
  } else if (state.status === "error") {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>{"Couldn't load your foods."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (state.total === 0 && state.pantry.length === 0 && q === "") {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>Your library is empty. Add a product first.</Text>
        <Pressable
          onPress={() => router.push({ pathname: "/product/[id]", params: { id: "new" } })}
          accessibilityRole="button"
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>Add product</Text>
        </Pressable>
      </View>
    );
  } else {
    const { products, lastGrams, pantry } = state;
    body = (
      <>
        {pantry.length > 0 && (
          <>
            <Text style={styles.sectionLabel} accessibilityRole="header">
              In my pantry
            </Text>
            <View style={styles.card}>
              {pantry.map((item, index) => (
                <FoodRow
                  key={item.id}
                  name={item.name}
                  meta={pantryMeta(item)}
                  query={q}
                  first={index === 0}
                  onPress={() => pickPantry(item)}
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel} accessibilityRole="header">
          {q ? `Your library · ${products.length} ${products.length === 1 ? "result" : "results"}` : "Your library"}
        </Text>
        {products.length === 0 ? (
          <Text style={styles.empty}>{`No products match '${q}'`}</Text>
        ) : (
          <View style={styles.card}>
            {products.map((product, index) => (
              <FoodRow
                key={product.id}
                name={product.name}
                meta={productMeta(product, lastGrams.get(product.id))}
                query={q}
                first={index === 0}
                onPress={() => pickProduct(product)}
              />
            ))}
          </View>
        )}

        {q !== "" && (
          <>
            <Text style={styles.sectionLabel} accessibilityRole="header">
              Not here?
            </Text>
            <View style={styles.card}>
              <MoreRow
                icon="language"
                name="Search Open Food Facts"
                meta="Packaged products · needs internet"
                first
                onPress={searchOnline}
                styles={styles}
                theme={theme}
              />
              <MoreRow
                icon="add"
                name={`Create "${q}" product`}
                meta="Enter values from a label"
                onPress={createProduct}
                styles={styles}
                theme={theme}
              />
            </View>
          </>
        )}
      </>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.searchbar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <SymbolView name={{ android: "arrow_back", web: "arrow_back" }} tintColor={theme.colors.muted} size={22} />
        </Pressable>
        <View style={styles.search}>
          <SymbolView name={{ android: "search", web: "search" }} tintColor={theme.colors.muted} size={22} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search foods"
            placeholderTextColor={theme.colors.faint}
            accessibilityLabel="Search foods"
            autoCorrect={false}
            autoFocus
            returnKeyType="search"
            selectionColor={theme.colors.accent}
            style={styles.searchInput}
          />
        </View>
        <Pressable onPress={scan} accessibilityRole="button" accessibilityLabel="Scan barcode" style={styles.scanBtn}>
          <SymbolView
            name={{ android: "barcode_scanner", web: "barcode_scanner" }}
            tintColor={theme.colors.accentText}
            size={22}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: theme.space[4] + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {!pantryMode && (
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Meal">
            {MEAL_TYPES.map((m) => {
              const on = m === mealType;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMealType(m)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  hitSlop={{ top: 8, bottom: 8 }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{MEAL_LABELS[m]}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {body}
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function MoreRow({
  icon,
  name,
  meta,
  first,
  onPress,
  styles,
  theme,
}: {
  icon: "language" | "add";
  name: string;
  meta: string;
  first?: boolean;
  onPress: () => void;
  styles: Styles;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${meta}`}
      style={({ pressed }) => [styles.more, !first && styles.divided, pressed && styles.pressed]}
    >
      <SymbolView name={{ android: icon, web: icon }} tintColor={theme.colors.accentText} size={22} />
      <View style={styles.moreInfo}>
        <Text style={styles.moreName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.moreMeta}>{meta}</Text>
      </View>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    searchbar: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
      paddingTop: space[2],
      paddingHorizontal: space[4],
      paddingBottom: space[3],
    },
    back: { width: 40, height: 40, marginLeft: -space[2], alignItems: "center", justifyContent: "center" },
    // search.html .search: the focused field with a 1 dp accent border (its glow ring is dropped).
    search: {
      flex: 1,
      height: tap,
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
      paddingHorizontal: space[3],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.surface2,
    },
    searchInput: { flex: 1, height: tap, padding: 0, color: colors.text, fontSize: fontSize.md },
    scanBtn: { width: tap, height: tap, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.surface2 },
    content: { flexGrow: 1, paddingHorizontal: space[4], gap: space[3] },
    chips: { flexDirection: "row", gap: space[2] },
    chip: { height: 32, justifyContent: "center", paddingHorizontal: space[3], borderRadius: radius.pill, backgroundColor: colors.surface2 },
    chipOn: { backgroundColor: colors.accentSoft },
    chipLabel: { color: colors.muted, fontSize: fontSize.sm },
    chipLabelOn: { color: colors.accentText, fontWeight: "600" },
    sectionLabel: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.7 },
    card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: "hidden" },
    empty: { color: colors.muted, fontSize: fontSize.sm },
    more: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 56, paddingVertical: space[2], paddingHorizontal: space[4] },
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
    pressed: { backgroundColor: colors.surface2 },
    moreInfo: { flex: 1, minWidth: 0 },
    moreName: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
    moreMeta: { color: colors.muted, fontSize: fontSize.xs },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4], paddingVertical: space[6] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    button: { minHeight: tap, justifyContent: "center", paddingHorizontal: space[5], borderRadius: radius.md, backgroundColor: colors.surface2 },
    buttonLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  });
}
