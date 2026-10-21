import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import { batchRepo } from "../repositories/batchRepo";
import { recipeRepo } from "../repositories/recipeRepo";
import type { Batch, Recipe, RecipeDetail } from "../types/recipes";

type ListState =
  | { status: "loading" }
  | { status: "ready"; recipes: Recipe[]; activeBatches: Batch[] }
  | { status: "error" };

export function useRecipes() {
  const db = useSQLiteContext();
  const [state, setState] = useState<ListState>({ status: "loading" });
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const [recipes, activeBatches] = await Promise.all([
        recipeRepo.list(db),
        batchRepo.listActive(db),
      ]);
      if (request === latestRequest.current) {
        setState({ status: "ready", recipes, activeBatches });
      }
    } catch {
      if (request === latestRequest.current) {
        setState({ status: "error" });
      }
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  return { state, reload: load, retry };
}

type DetailState =
  | { status: "loading" }
  | { status: "ready"; recipe: RecipeDetail | null }
  | { status: "error" };

export function useRecipeDetail(id: string | null) {
  const db = useSQLiteContext();
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    if (!id) {
      setState({ status: "ready", recipe: null });
      return;
    }
    const request = ++latestRequest.current;
    try {
      const recipe = await recipeRepo.get(db, id);
      if (request === latestRequest.current) {
        setState({ status: "ready", recipe });
      }
    } catch {
      if (request === latestRequest.current) {
        setState({ status: "error" });
      }
    }
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  return { state, reload: load, retry };
}
