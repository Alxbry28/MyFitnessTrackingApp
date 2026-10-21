import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import * as productRepo from "@/modules/nutrition/repositories/productRepo";
import type { Product } from "@/modules/nutrition/types/product";

import {
  calculateCookedPer100g,
  calculateRawTotals,
  hasOilOrFat,
  parseNotesText,
} from "../services/recipeCalc";
import type { RecipeDetail, RecipeInput } from "../types/recipes";

export type FormIngredient = {
  productId: string;
  productName: string;
  rawGrams: number;
  isEstimated: boolean;
  kcalPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
};

type Props = {
  initial?: RecipeDetail | null;
  onSave: (input: RecipeInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export function RecipeForm({ initial, onSave, onDelete }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [ingredients, setIngredients] = useState<FormIngredient[]>(
    initial?.ingredients.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      rawGrams: i.rawGrams,
      isEstimated: i.isEstimated,
      kcalPer100g: i.kcalPer100g,
      proteinPer100g: i.proteinPer100g,
      carbsPer100g: i.carbsPer100g,
      fatPer100g: i.fatPer100g,
    })) ?? [],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paste from notes modal state
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);

  // Add ingredient search modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [ingredientGrams, setIngredientGrams] = useState("100");

  const rawTotals = useMemo(() => calculateRawTotals(ingredients), [ingredients]);
  const cookedEstimate = useMemo(() => {
    const ratio = initial?.learnedCookedRatio ?? 1;
    const cookedG = rawTotals.rawWeightG * ratio;
    return calculateCookedPer100g(rawTotals, cookedG);
  }, [rawTotals, initial?.learnedCookedRatio]);

  const showOilWarning = useMemo(
    () => ingredients.length > 0 && !hasOilOrFat(ingredients.map((i) => i.productName)),
    [ingredients],
  );

  // Search products when query changes
  const handleSearch = useCallback(
    async (q: string) => {
      setSearchQuery(q);
      if (!q.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const results = await productRepo.search(db, q);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
    },
    [db],
  );

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    const g = parseFloat(ingredientGrams.replace(",", "."));
    if (isNaN(g) || g <= 0) return;

    setIngredients((prev) => [
      ...prev,
      {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        rawGrams: g,
        isEstimated: false,
        kcalPer100g: selectedProduct.kcalPer100g,
        proteinPer100g: selectedProduct.proteinPer100g,
        carbsPer100g: selectedProduct.carbsPer100g,
        fatPer100g: selectedProduct.fatPer100g,
      },
    ]);

    setSelectedProduct(null);
    setSearchQuery("");
    setSearchResults([]);
    setIngredientGrams("100");
    setShowSearchModal(false);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateGrams = (index: number, text: string) => {
    const g = parseFloat(text.replace(",", "."));
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, rawGrams: isNaN(g) ? 0 : g } : ing)),
    );
  };

  // Quick add oil
  const handleAddOil = async () => {
    try {
      const oils = await productRepo.search(db, "oil");
      const oilProduct = oils[0];
      if (oilProduct) {
        setIngredients((prev) => [
          ...prev,
          {
            productId: oilProduct.id,
            productName: oilProduct.name,
            rawGrams: 14,
            isEstimated: false,
            kcalPer100g: oilProduct.kcalPer100g,
            proteinPer100g: oilProduct.proteinPer100g,
            carbsPer100g: oilProduct.carbsPer100g,
            fatPer100g: oilProduct.fatPer100g,
          },
        ]);
      } else {
        setShowSearchModal(true);
        handleSearch("oil");
      }
    } catch {
      setShowSearchModal(true);
    }
  };

  // Parse notes and match library products
  const handleParseNotes = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    try {
      const parsedLines = parseNotesText(pasteText);
      const newIngredients: FormIngredient[] = [];

      for (const line of parsedLines) {
        if (line.isCookedWeight) continue;
        const query = line.foodQuery;
        const matches = await productRepo.search(db, query);
        const match = matches[0];
        if (match) {
          newIngredients.push({
            productId: match.id,
            productName: match.name,
            rawGrams: line.grams ?? 16,
            isEstimated: line.isEstimated || line.grams === null,
            kcalPer100g: match.kcalPer100g,
            proteinPer100g: match.proteinPer100g,
            carbsPer100g: match.carbsPer100g,
            fatPer100g: match.fatPer100g,
          });
        }
      }

      if (newIngredients.length > 0) {
        setIngredients((prev) => [...prev, ...newIngredients]);
      }
      setShowPasteModal(false);
      setPasteText("");
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Enter a recipe name");
      return;
    }
    if (ingredients.length === 0) {
      setError("Add at least one ingredient");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        notes: notes.trim() ? notes.trim() : null,
        ingredients: ingredients.map((i) => ({
          productId: i.productId,
          rawGrams: i.rawGrams,
          isEstimated: i.isEstimated,
        })),
      });
    } catch {
      setError("Couldn't save recipe. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Recipe details card */}
      <View style={styles.card}>
        <Text style={styles.label}>Recipe name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Chopsuey"
          placeholderTextColor={theme.colors.faint}
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: theme.space[3] }]}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Cook with lid on for 10 mins"
          placeholderTextColor={theme.colors.faint}
          multiline
          style={[styles.input, styles.notesInput]}
        />
      </View>

      {/* Raw nutrition summary card */}
      <View style={styles.card}>
        <View style={styles.totalsHeader}>
          <Text style={styles.sectionTitle}>Raw totals</Text>
          <Text style={styles.totalsSub}>
            {rawTotals.rawWeightG} g raw · ≈ {cookedEstimate.kcalPer100g} kcal/100 g
          </Text>
        </View>
        <View style={styles.totalsRow}>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{rawTotals.kcal}</Text>
            <Text style={styles.totalUnit}>kcal</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{rawTotals.protein}g</Text>
            <Text style={styles.totalUnit}>protein</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{rawTotals.carbs}g</Text>
            <Text style={styles.totalUnit}>carbs</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{rawTotals.fat}g</Text>
            <Text style={styles.totalUnit}>fat</Text>
          </View>
        </View>
      </View>

      {/* Oil warning banner */}
      {showOilWarning && (
        <View style={styles.warnBox}>
          <Text style={styles.warnIcon}>!</Text>
          <View style={styles.warnContent}>
            <Text style={styles.warnText}>
              <Text style={{ fontWeight: "700" }}>No oil listed.</Text> 1 tbsp of oil is about 120 kcal, almost half of this batch. Add it if you used any.
            </Text>
            <Pressable onPress={handleAddOil} accessibilityRole="button" style={styles.warnButton}>
              <Text style={styles.warnButtonText}>+ Add oil</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Ingredients section */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Ingredients ({ingredients.length})</Text>
          <Pressable onPress={() => setShowPasteModal(true)} accessibilityRole="button" style={styles.pasteLink}>
            <Text style={styles.pasteLinkText}>Paste notes</Text>
          </Pressable>
        </View>

        {ingredients.length === 0 ? (
          <Text style={styles.emptyText}>No ingredients added yet.</Text>
        ) : (
          ingredients.map((ing, index) => (
            <View key={`${ing.productId}-${index}`} style={[styles.ingRow, index > 0 && styles.divided]}>
              <View style={styles.ingInfo}>
                <Text style={styles.ingName}>{ing.productName}</Text>
                <Text style={styles.ingMeta}>
                  {ing.kcalPer100g ? `${ing.kcalPer100g} kcal/100 g` : "No macros"}
                  {ing.isEstimated ? " · estimated" : ""}
                </Text>
              </View>
              <View style={styles.ingGramsBox}>
                <TextInput
                  value={String(ing.rawGrams)}
                  onChangeText={(t) => handleUpdateGrams(index, t)}
                  keyboardType="numeric"
                  style={styles.gramsInput}
                />
                <Text style={styles.gramsUnit}>g</Text>
              </View>
              <Pressable
                onPress={() => handleRemoveIngredient(index)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${ing.productName}`}
                style={styles.removeBtn}
              >
                <Text style={styles.removeBtnText}>×</Text>
              </Pressable>
            </View>
          ))
        )}

        <Pressable
          onPress={() => setShowSearchModal(true)}
          accessibilityRole="button"
          style={styles.addIngBtn}
        >
          <Text style={styles.addIngBtnText}>+ Add ingredient</Text>
        </Pressable>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          style={[styles.saveBtn, saving && styles.btnDisabled]}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.accentInk} />
          ) : (
            <Text style={styles.saveBtnText}>Save recipe</Text>
          )}
        </Pressable>
        {onDelete && (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteBtnText}>Delete</Text>
          </Pressable>
        )}
      </View>

      {/* Paste notes modal */}
      <Modal visible={showPasteModal} transparent animationType="slide">
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Paste raw-ingredient notes</Text>
            <Text style={styles.modalSub}>
              Paste weights from your notes (e.g. &quot;32g broccoli stem&quot;). Lines with foods in your library will be matched.
            </Text>
            <TextInput
              value={pasteText}
              onChangeText={setPasteText}
              placeholder={"32g broccoli stem\n283g broccoli\n194.8g carrots\n45g onions\nTotal cooked: 532g"}
              placeholderTextColor={theme.colors.faint}
              multiline
              autoFocus
              style={styles.pasteTextarea}
            />
            <View style={styles.modalBtns}>
              <Pressable onPress={() => setShowPasteModal(false)} accessibilityRole="button" style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleParseNotes}
                disabled={parsing || !pasteText.trim()}
                accessibilityRole="button"
                style={[styles.modalActionBtn, (parsing || !pasteText.trim()) && styles.btnDisabled]}
              >
                {parsing ? (
                  <ActivityIndicator color={theme.colors.accentInk} />
                ) : (
                  <Text style={styles.modalActionText}>Parse and match</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Search food modal */}
      <Modal visible={showSearchModal} transparent animationType="slide">
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add ingredient from library</Text>
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search your products..."
              placeholderTextColor={theme.colors.faint}
              autoFocus
              style={styles.modalSearchInput}
            />

            {selectedProduct ? (
              <View style={styles.selectedBox}>
                <Text style={styles.selectedTitle}>{selectedProduct.name}</Text>
                <Text style={styles.selectedMeta}>
                  {selectedProduct.kcalPer100g} kcal/100 g · P: {selectedProduct.proteinPer100g ?? 0}g C: {selectedProduct.carbsPer100g ?? 0}g F: {selectedProduct.fatPer100g ?? 0}g
                </Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.amountLabel}>Raw weight:</Text>
                  <TextInput
                    value={ingredientGrams}
                    onChangeText={setIngredientGrams}
                    keyboardType="numeric"
                    style={styles.amountInput}
                  />
                  <Text style={styles.amountUnit}>g</Text>
                </View>
                <View style={styles.modalBtns}>
                  <Pressable onPress={() => setSelectedProduct(null)} accessibilityRole="button" style={styles.modalCancelBtn}>
                    <Text style={styles.modalCancelText}>Change food</Text>
                  </Pressable>
                  <Pressable onPress={handleAddProduct} accessibilityRole="button" style={styles.modalActionBtn}>
                    <Text style={styles.modalActionText}>Add to recipe</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <ScrollView style={styles.searchResultsList} keyboardShouldPersistTaps="handled">
                {searchResults.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelectedProduct(p)}
                    accessibilityRole="button"
                    style={styles.searchResultItem}
                  >
                    <Text style={styles.searchResultName}>{p.name}</Text>
                    <Text style={styles.searchResultMeta}>{p.kcalPer100g} kcal/100 g</Text>
                  </Pressable>
                ))}
                {searchQuery.trim() !== "" && searchResults.length === 0 && (
                  <Text style={styles.emptyText}>No matching products found.</Text>
                )}
              </ScrollView>
            )}

            {!selectedProduct && (
              <Pressable onPress={() => setShowSearchModal(false)} accessibilityRole="button" style={[styles.modalCancelBtn, { marginTop: theme.space[3] }]}>
                <Text style={styles.modalCancelText}>Close</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: space[4], gap: space[3], paddingBottom: space[6] },
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: space[4],
    },
    label: { color: colors.muted, fontSize: fontSize.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: space[1] },
    input: {
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      fontSize: fontSize.md,
      color: colors.text,
      minHeight: tap,
    },
    notesInput: { minHeight: 70, textAlignVertical: "top" },
    totalsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: space[3] },
    sectionTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.text },
    totalsSub: { fontSize: fontSize.sm, color: colors.muted },
    totalsRow: { flexDirection: "row", justifyContent: "space-between" },
    totalItem: { alignItems: "center", flex: 1 },
    totalValue: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text },
    totalUnit: { fontSize: fontSize.xs, color: colors.muted },
    warnBox: {
      backgroundColor: colors.estimateSoft,
      borderRadius: radius.md,
      padding: space[3],
      flexDirection: "row",
      gap: space[3],
      alignItems: "flex-start",
    },
    warnIcon: { fontSize: fontSize.lg, fontWeight: "700", color: colors.estimate, lineHeight: 22 },
    warnContent: { flex: 1 },
    warnText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
    warnButton: {
      marginTop: space[2],
      alignSelf: "flex-start",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingVertical: space[1],
      paddingHorizontal: space[3],
      minHeight: 36,
      justifyContent: "center",
    },
    warnButtonText: { fontSize: fontSize.xs, fontWeight: "600", color: colors.accentText },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space[3] },
    pasteLink: { paddingHorizontal: space[2], paddingVertical: space[1] },
    pasteLinkText: { fontSize: fontSize.sm, color: colors.accentText, fontWeight: "600" },
    emptyText: { fontSize: fontSize.sm, color: colors.muted, textAlign: "center", marginVertical: space[3] },
    ingRow: { flexDirection: "row", alignItems: "center", gap: space[2], paddingVertical: space[2] },
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
    ingInfo: { flex: 1 },
    ingName: { fontSize: fontSize.sm, fontWeight: "500", color: colors.text },
    ingMeta: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
    ingGramsBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface2, borderRadius: radius.sm, paddingHorizontal: space[2], height: 36 },
    gramsInput: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text, minWidth: 44, textAlign: "right" },
    gramsUnit: { fontSize: fontSize.xs, color: colors.muted, marginLeft: 2 },
    removeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    removeBtnText: { fontSize: fontSize.lg, color: colors.muted },
    addIngBtn: {
      marginTop: space[3],
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
      borderRadius: radius.sm,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    addIngBtnText: { fontSize: fontSize.sm, fontWeight: "600", color: colors.accentText },
    actionRow: { gap: space[2], marginTop: space[2] },
    saveBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      height: tap,
      alignItems: "center",
      justifyContent: "center",
    },
    saveBtnText: { fontSize: fontSize.md, fontWeight: "700", color: colors.accentInk },
    deleteBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.over,
      borderRadius: radius.md,
      height: tap,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteBtnText: { fontSize: fontSize.md, fontWeight: "600", color: colors.over },
    btnDisabled: { opacity: 0.6 },
    errorBox: { backgroundColor: colors.overSoft, borderRadius: radius.md, padding: space[3] },
    errorText: { color: colors.over, fontSize: fontSize.sm, fontWeight: "500" },
    modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: space[4],
      maxHeight: "85%",
    },
    modalTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text, marginBottom: space[1] },
    modalSub: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 18, marginBottom: space[3] },
    pasteTextarea: {
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      padding: space[3],
      fontSize: fontSize.sm,
      color: colors.text,
      minHeight: 140,
      textAlignVertical: "top",
    },
    modalBtns: { flexDirection: "row", gap: space[2], marginTop: space[4] },
    modalCancelBtn: { flex: 1, height: tap, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    modalCancelText: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text },
    modalActionBtn: { flex: 1, height: tap, borderRadius: radius.sm, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    modalActionText: { fontSize: fontSize.sm, fontWeight: "700", color: colors.accentInk },
    modalSearchInput: {
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      paddingHorizontal: space[3],
      height: tap,
      fontSize: fontSize.sm,
      color: colors.text,
      marginBottom: space[3],
    },
    searchResultsList: { maxHeight: 220 },
    searchResultItem: { paddingVertical: space[2], borderBottomWidth: 1, borderBottomColor: colors.border },
    searchResultName: { fontSize: fontSize.sm, fontWeight: "500", color: colors.text },
    searchResultMeta: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
    selectedBox: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: space[3] },
    selectedTitle: { fontSize: fontSize.md, fontWeight: "600", color: colors.text },
    selectedMeta: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
    amountInputRow: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: space[3] },
    amountLabel: { fontSize: fontSize.sm, color: colors.muted },
    amountInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: space[2],
      height: 36,
      minWidth: 60,
      fontSize: fontSize.sm,
      fontWeight: "600",
      color: colors.text,
      textAlign: "right",
    },
    amountUnit: { fontSize: fontSize.sm, color: colors.muted },
  });
}
