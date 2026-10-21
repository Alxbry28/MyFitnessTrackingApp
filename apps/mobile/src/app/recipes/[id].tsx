import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { RecipeForm } from "@/modules/recipes/components/RecipeForm";
import { useRecipeDetail } from "@/modules/recipes/hooks/useRecipes";
import { recipeRepo } from "@/modules/recipes/repositories/recipeRepo";
import type { RecipeInput } from "@/modules/recipes/types/recipes";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();

  const isNew = id === "new";
  const { state, retry } = useRecipeDetail(isNew ? null : id);

  const handleSave = async (input: RecipeInput) => {
    if (isNew) {
      await recipeRepo.create(db, input);
    } else {
      await recipeRepo.update(db, id, input);
    }
    router.replace("/recipes/index" as const);
  };

  const handleDelete = async () => {
    if (!isNew && id) {
      await recipeRepo.delete(db, id);
      router.replace("/recipes/index" as const);
    }
  };

  if (!isNew && state.status === "loading") {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading recipe" />
      </View>
    );
  }

  if (!isNew && state.status === "error") {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.message}>{"Couldn't load recipe."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const recipe = !isNew && state.status === "ready" ? state.recipe : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.backBtn}>
          <Text style={styles.backText}>‹ Recipes</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {isNew ? "New recipe" : recipe?.name ?? "Recipe"}
        </Text>
        {!isNew && id && (
          <Pressable
            onPress={() => router.push({ pathname: "/recipes/cook/[recipeId]" as any, params: { recipeId: id } })}
            accessibilityRole="button"
            style={styles.cookBtn}
          >
            <Text style={styles.cookBtnText}>Cook</Text>
          </Pressable>
        )}
      </View>

      <RecipeForm
        initial={recipe}
        onSave={handleSave}
        onDelete={!isNew ? handleDelete : undefined}
      />
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { justifyContent: "center", alignItems: "center", padding: space[4] },
    message: { fontSize: fontSize.md, color: colors.muted, marginBottom: space[3] },
    retryBtn: { minHeight: tap, paddingHorizontal: space[4], justifyContent: "center" },
    retryText: { fontSize: fontSize.md, color: colors.accentText, fontWeight: "600" },
    appbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: space[4],
      paddingVertical: space[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      minHeight: 52,
    },
    backBtn: { minHeight: tap, justifyContent: "center", paddingRight: space[2] },
    backText: { fontSize: fontSize.md, color: colors.accentText, fontWeight: "500" },
    title: { fontSize: fontSize.md, fontWeight: "700", color: colors.text, flex: 1, textAlign: "center" },
    cookBtn: { minHeight: tap, justifyContent: "center", paddingLeft: space[2] },
    cookBtnText: { fontSize: fontSize.md, color: colors.accentText, fontWeight: "600" },
  });
}
