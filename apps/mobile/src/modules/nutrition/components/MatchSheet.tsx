import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { searchOffProducts, type OffSearch } from "@/lib/openFoodFacts";
import { useTheme, type Theme } from "@/lib/theme/useTheme";

import { useProducts } from "../hooks/useProducts";
import * as productRepo from "../repositories/productRepo";
import { formatKcal, forGrams } from "../services/nutritionCalc";
import type { OffSearchItem } from "../services/offProduct";
import { newProductForm, type ProductFormValues } from "../services/productSchema";
import type { LineMatch, PastedFood } from "../types/pasteLog";
import type { Product } from "../types/product";
import { ProductForm } from "./ProductForm";

const MAX_OPTIONS = 5;
const OFF_NOTE = "From Open Food Facts. It's community data, so check it against the label before saving.";

type Props = {
  food: PastedFood;
  match: LineMatch;
  // Every meal with a line of this name, e.g. "Lunch and Dinner".
  meals: string;
  onUse: (product: Product, remember: boolean) => void;
  onCreated: (productId: string, remember: boolean) => void;
  onClose: () => void;
};

type Step =
  | { step: "options" }
  | { step: "online"; result: OffSearch | null }
  | { step: "form"; draft: ProductFormValues; fromOff: boolean };

// Mount it only while open, so each opening starts from the line's own name.
export function MatchSheet({ food, match, meals, onUse, onCreated, onClose }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const db = useSQLiteContext();
  const { query, setQuery, products, status, retry } = useProducts(food.name);
  const [selectedId, setSelectedId] = useState<string | null>(match.product?.id ?? null);
  const [remember, setRemember] = useState(true);
  const [step, setStep] = useState<Step>({ step: "options" });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const current = match.product;
  const options = [
    ...(current && !products.some((p) => p.id === current.id) ? [current] : []),
    ...products,
  ].slice(0, MAX_OPTIONS);
  const selected = options.find((p) => p.id === selectedId) ?? null;
  const notFound = match.status === "not_found";

  const searchOnline = async () => {
    setStep({ step: "online", result: null });
    const result = await searchOffProducts(query);
    if (mounted.current) setStep((s) => (s.step === "online" ? { step: "online", result } : s));
  };

  const back = () => setStep({ step: "options" });

  let body: ReactNode;
  if (step.step === "form") {
    body = (
      <>
        <Text style={styles.title} accessibilityRole="header">
          New product
        </Text>
        {step.fromOff && <Text style={styles.note}>{OFF_NOTE}</Text>}
        <View style={styles.form}>
          <ProductForm
            defaultValues={step.draft}
            submitLabel="Save product"
            onSubmit={(input) => productRepo.create(db, input, step.fromOff ? "open_food_facts" : "manual")}
            onSaved={(id) => onCreated(id, remember)}
          />
        </View>
        <GhostButton label="Back" onPress={back} styles={styles} />
      </>
    );
  } else if (step.step === "online") {
    body = (
      <>
        <Text style={styles.title} accessibilityRole="header">
          Open Food Facts
        </Text>
        <View style={styles.form}>
          <OnlineResults
            result={step.result}
            query={query}
            styles={styles}
            theme={theme}
            onChoose={(item: OffSearchItem) => setStep({ step: "form", draft: item.draft, fromOff: item.found })}
          />
        </View>
        <GhostButton label="Back" onPress={back} styles={styles} />
      </>
    );
  } else {
    body = (
      <>
        <Text style={styles.title} accessibilityRole="header">
          Which {food.name}?
        </Text>
        <Text style={styles.q}>
          For <Text style={styles.qStrong}>{food.raw}</Text> in {meals}
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your library"
          placeholderTextColor={theme.colors.faint}
          accessibilityLabel="Search your library"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.search}
        />
        <ScrollView style={styles.options} contentContainerStyle={styles.optionsContent} keyboardShouldPersistTaps="handled">
          {status === "loading" && <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading products" />}
          {status === "error" && (
            <View style={styles.centered}>
              <Text style={styles.message}>{"Couldn't load your products."}</Text>
              <GhostButton label="Retry" onPress={retry} styles={styles} />
            </View>
          )}
          {status === "ready" && options.length === 0 && (
            <Text style={styles.message}>{`No products match '${query.trim()}'`}</Text>
          )}
          {status === "ready" &&
            options.map((product) => {
              const on = product.id === selectedId;
              const meta = `${product.brand ?? "Custom"} · ${Math.round(product.kcalPer100g)} kcal / 100 g`;
              const kcal = formatKcal(forGrams(product, food.grams).kcal);
              return (
                <Pressable
                  key={product.id}
                  onPress={() => setSelectedId(product.id)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${product.name}, ${meta}, ${kcal} kcal`}
                  accessibilityState={{ checked: on }}
                  style={[styles.opt, on && styles.optOn]}
                >
                  <View style={[styles.radio, on && styles.radioOn]} />
                  <View style={styles.info}>
                    <Text style={styles.optName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.optMeta} numberOfLines={1}>
                      {meta}
                    </Text>
                  </View>
                  <Text style={styles.optKcal}>{kcal}</Text>
                </Pressable>
              );
            })}
        </ScrollView>
        <View style={styles.links}>
          <Pressable
            onPress={() => setStep({ step: "form", draft: newProductForm(null, food.name), fromOff: false })}
            accessibilityRole="button"
            style={styles.link}
          >
            <Text style={styles.linkLabel}>New product</Text>
          </Pressable>
          {notFound && query.trim() !== "" && (
            <Pressable onPress={() => void searchOnline()} accessibilityRole="button" style={styles.link}>
              <Text style={styles.linkLabel}>Search Open Food Facts</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setRemember((r) => !r)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: remember }}
          style={styles.remember}
        >
          <View style={[styles.box, remember && styles.boxOn]}>
            {remember && <Text style={styles.boxMark}>✓</Text>}
          </View>
          <Text style={styles.rememberLabel}>Always use this for &quot;{food.name}&quot;</Text>
        </Pressable>
        <Pressable
          onPress={() => selected && onUse(selected, remember)}
          disabled={!selected}
          accessibilityRole="button"
          accessibilityState={{ disabled: !selected }}
          style={[styles.btn, styles.primary, !selected && styles.disabled]}
        >
          <Text style={styles.primaryLabel} numberOfLines={1}>
            {selected ? `Use ${selected.name}` : "Pick a product"}
          </Text>
        </Pressable>
      </>
    );
  }

  const tall = step.step !== "options";
  return (
    <Modal visible transparent animationType="fade" onRequestClose={step.step === "options" ? onClose : back}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View style={[styles.sheet, tall && styles.sheetTall]}>
          <View style={styles.grabber} />
          {body}
        </View>
      </View>
    </Modal>
  );
}

function GhostButton({ label, onPress, styles }: { label: string; onPress: () => void; styles: Styles }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.btn, styles.ghost]}>
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

function OnlineResults({
  result,
  query,
  styles,
  theme,
  onChoose,
}: {
  result: OffSearch | null;
  query: string;
  styles: Styles;
  theme: Theme;
  onChoose: (item: OffSearchItem) => void;
}) {
  if (result === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={styles.message} accessibilityLiveRegion="polite">
          Searching Open Food Facts...
        </Text>
      </View>
    );
  }
  if (result.kind === "offline" || result.kind === "error") {
    return (
      <Text style={styles.message} accessibilityLiveRegion="polite">
        {"Couldn't reach Open Food Facts. Go back and add it as a new product from the label."}
      </Text>
    );
  }
  if (result.items.length === 0) {
    return (
      <Text style={styles.message} accessibilityLiveRegion="polite">
        {`Nothing on Open Food Facts for '${query.trim()}'.`}
      </Text>
    );
  }
  return (
    <FlatList
      data={result.items}
      keyExtractor={(_, index) => String(index)}
      renderItem={({ item }) => {
        const meta = [item.draft.brand, item.found ? `${item.draft.kcalPer100g} kcal / 100 g` : "No kcal listed"]
          .filter(Boolean)
          .join(" · ");
        return (
          <Pressable
            onPress={() => onChoose(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.draft.name}, ${meta}. Check and save`}
            style={({ pressed }) => [styles.opt, styles.offRow, pressed && styles.optOn]}
          >
            <View style={styles.info}>
              <Text style={styles.optName} numberOfLines={1}>
                {item.draft.name}
              </Text>
              <Text style={styles.optMeta} numberOfLines={1}>
                {meta}
              </Text>
            </View>
          </Pressable>
        );
      }}
      contentContainerStyle={styles.optionsContent}
    />
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end" },
    scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
    sheet: {
      maxHeight: "85%",
      gap: space[3],
      paddingTop: space[2],
      paddingHorizontal: space[4],
      paddingBottom: space[5],
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    sheetTall: { height: "90%", maxHeight: "90%" },
    grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: colors.faint },
    title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
    q: { color: colors.muted, fontSize: fontSize.sm },
    qStrong: { color: colors.text, fontWeight: "700" },
    note: {
      padding: space[3],
      borderRadius: radius.sm,
      backgroundColor: colors.estimateSoft,
      color: colors.text,
      fontSize: fontSize.sm,
    },
    search: {
      height: tap,
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
      paddingHorizontal: space[3],
      color: colors.text,
      fontSize: fontSize.md,
    },
    options: { flexGrow: 0 },
    optionsContent: { gap: space[2] },
    form: { flex: 1 },
    centered: { alignItems: "center", gap: space[3] },
    message: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    opt: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      minHeight: 60,
      paddingVertical: space[2],
      paddingHorizontal: space[3],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    offRow: { minHeight: tap + space[3] },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.faint },
    radioOn: { borderWidth: 6, borderColor: colors.accent },
    info: { flex: 1, minWidth: 0 },
    optName: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
    optMeta: { color: colors.muted, fontSize: fontSize.sm },
    optKcal: { color: colors.text, fontSize: fontSize.md, fontWeight: "600", fontVariant: ["tabular-nums"] },
    links: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
    link: {
      height: 32,
      justifyContent: "center",
      paddingHorizontal: space[3],
      borderRadius: radius.pill,
      backgroundColor: colors.accentSoft,
    },
    linkLabel: { color: colors.accentText, fontSize: fontSize.xs, fontWeight: "700" },
    remember: { flexDirection: "row", alignItems: "center", gap: space[2], minHeight: tap },
    box: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: colors.faint,
      alignItems: "center",
      justifyContent: "center",
    },
    boxOn: { borderColor: colors.accent, backgroundColor: colors.accent },
    boxMark: { color: colors.accentInk, fontSize: fontSize.xs, fontWeight: "700" },
    rememberLabel: { flex: 1, color: colors.muted, fontSize: fontSize.sm },
    btn: { minHeight: tap, alignItems: "center", justifyContent: "center", paddingHorizontal: space[3], borderRadius: radius.md },
    primary: { backgroundColor: colors.accent },
    primaryLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
    ghost: { backgroundColor: colors.surface2 },
    ghostLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
    disabled: { opacity: 0.4 },
  });
}
