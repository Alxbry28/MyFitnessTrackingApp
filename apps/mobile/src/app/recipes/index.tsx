import { router } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { useRecipes } from "@/modules/recipes/hooks/useRecipes";

export default function RecipesScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const { state, retry } = useRecipes();

  const count = state.status === "ready" ? state.recipes.length : 0;

  let body: ReactNode;
  if (state.status === "loading") {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading recipes" />
      </View>
    );
  } else if (state.status === "error") {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>{"Couldn't load your recipes."}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.retryBtn}>
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (state.recipes.length === 0) {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>No recipes saved yet.</Text>
        <Pressable
          onPress={() => router.push({ pathname: "/recipes/[id]", params: { id: "new" } })}
          accessibilityRole="button"
          style={styles.createBtn}
        >
          <Text style={styles.createBtnText}>+ Create your first recipe</Text>
        </Pressable>
      </View>
    );
  } else {
    const activeBatches = state.activeBatches ?? [];
    body = (
      <FlatList
        data={state.recipes}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          activeBatches.length > 0 ? (
            <View style={styles.headerSection}>
              <Text style={styles.sectionLabel} accessibilityRole="header">In the fridge now</Text>
              <View style={styles.card}>
                {activeBatches.map((batch, idx) => (
                  <View key={batch.id} style={[styles.batchRow, idx > 0 && styles.divided]}>
                    <View style={styles.info}>
                      <Text style={styles.name}>{batch.name}</Text>
                      <View style={styles.batchMeta}>
                        <Text style={styles.meta}>{`${Math.round(batch.gramsLeft ?? 0)} g left`}</Text>
                        {!batch.isSettled && (
                          <View style={styles.badgeEst}>
                            <Text style={styles.badgeTextEst}>⚠ unsettled</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {!batch.isSettled ? (
                      <Pressable
                        onPress={() => router.push({ pathname: "/pantry/settle/[batchId]" as any, params: { batchId: batch.id } })}
                        style={styles.settleBadge}
                        accessibilityRole="button"
                      >
                        <Text style={styles.settleBadgeText}>Settle</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.settledText}>settled</Text>
                    )}
                  </View>
                ))}
              </View>
              <Text style={[styles.sectionLabel, { marginTop: theme.space[3] }]} accessibilityRole="header">
                Saved recipes
              </Text>
            </View>
          ) : undefined
        }
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/recipes/[id]", params: { id: item.id } })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, index > 0 && styles.divided, pressed && styles.pressed]}
          >
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {`${item.ingredientCount ?? 0} ingredients · cooked ${item.timesCooked ?? 0}× · `}
                {item.learnedCookedRatio ? (
                  `ratio ×${item.learnedCookedRatio}`
                ) : (
                  <Text style={styles.ratioBadge}>ratio not learned</Text>
                )}
              </Text>
            </View>
            <View style={styles.amtBox}>
              <Text style={styles.amt}>{item.kcalPer100g !== null && item.kcalPer100g !== undefined ? item.kcalPer100g : "—"}</Text>
              <Text style={styles.amtUnit}>kcal/100 g</Text>
            </View>
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View style={styles.footerNoteBox}>
            <Text style={styles.footerNote}>
              The ratio (cooked ÷ raw weight) is learned each time you settle a batch, so estimates get closer every time.
            </Text>
          </View>
        }
      />
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.appbar}>
        <View>
          <Text style={styles.h1} accessibilityRole="header">Recipes</Text>
          <Text style={styles.sub}>{count === 1 ? "1 saved" : `${count} saved`}</Text>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: "/recipes/[id]", params: { id: "new" } })}
          accessibilityRole="button"
          style={styles.newBtn}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>

      <View style={styles.bodyWrap}>
        {body}
      </View>

      {state.status === "ready" && state.recipes.length > 0 && (
        <Pressable
          onPress={() => {
            const first = state.recipes[0];
            if (first) {
              router.push({ pathname: "/recipes/cook/[recipeId]" as any, params: { recipeId: first.id } });
            }
          }}
          accessibilityRole="button"
          style={styles.fab}
        >
          <Text style={styles.fabText}>Cook a batch</Text>
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    appbar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      paddingHorizontal: space[4],
      paddingVertical: space[3],
    },
    h1: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text, letterSpacing: -0.5 },
    sub: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
    newBtn: { minHeight: tap, justifyContent: "center", paddingHorizontal: space[2] },
    newBtnText: { fontSize: fontSize.md, fontWeight: "600", color: colors.accentText },
    bodyWrap: { flex: 1 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: space[4] },
    message: { fontSize: fontSize.md, color: colors.muted, textAlign: "center", marginBottom: space[3] },
    retryBtn: {
      backgroundColor: colors.surface2,
      paddingHorizontal: space[4],
      paddingVertical: space[2],
      borderRadius: radius.md,
      minHeight: tap,
      justifyContent: "center",
    },
    retryLabel: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text },
    createBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: space[4],
      paddingVertical: space[2],
      borderRadius: radius.md,
      minHeight: tap,
      justifyContent: "center",
    },
    createBtnText: { fontSize: fontSize.md, fontWeight: "700", color: colors.accentInk },
    listContent: { paddingHorizontal: space[4], paddingBottom: 100 },
    headerSection: { marginBottom: space[3] },
    sectionLabel: { fontSize: fontSize.xs, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: "600", marginBottom: space[2] },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space[3] },
    batchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space[3], gap: space[3], minHeight: 56 },
    batchMeta: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: 2 },
    badgeEst: { paddingVertical: 1, paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: colors.estimateSoft },
    badgeTextEst: { fontSize: fontSize.xs, fontWeight: "600", color: colors.estimate },
    settleBadge: { backgroundColor: colors.accentSoft, paddingHorizontal: space[3], paddingVertical: 6, borderRadius: radius.pill },
    settleBadgeText: { fontSize: fontSize.xs, fontWeight: "700", color: colors.accentText },
    settledText: { fontSize: fontSize.xs, color: colors.ok, fontWeight: "600" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: space[3],
      gap: space[3],
      minHeight: 56,
    },
    divided: { borderTopWidth: 1, borderTopColor: colors.border },
    pressed: { opacity: 0.7 },
    info: { flex: 1, minWidth: 0 },
    name: { fontSize: fontSize.md, fontWeight: "500", color: colors.text },
    meta: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
    ratioBadge: { color: colors.estimate, fontSize: fontSize.xs },
    amtBox: { alignItems: "flex-end" },
    amt: { fontSize: fontSize.md, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] },
    amtUnit: { fontSize: fontSize.xs, color: colors.muted },
    footerNoteBox: { marginTop: space[4], padding: space[3] },
    footerNote: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 18, textAlign: "center" },
    fab: {
      position: "absolute",
      right: space[4],
      bottom: space[5],
      height: 56,
      paddingHorizontal: space[5],
      borderRadius: 18,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    fabText: { fontSize: fontSize.md, fontWeight: "700", color: colors.accentInk },
  });
}
