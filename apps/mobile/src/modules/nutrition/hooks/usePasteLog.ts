import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useRef, useState } from "react";

import * as foodLogRepo from "../repositories/foodLogRepo";
import * as productRepo from "../repositories/productRepo";
import * as textLogMatchRepo from "../repositories/textLogMatchRepo";
import { addDays, defaultMeal, logDay } from "../services/mealTime";
import { forGrams } from "../services/nutritionCalc";
import { matchLine, parsePastedLog, textFromEntries } from "../services/pasteLog";
import type { MealType } from "../types/foodLog";
import type { LineMatch, PastedFood, RememberedMatch } from "../types/pasteLog";
import type { Product } from "../types/product";

export type PreviewLine =
  | { kind: "food"; food: PastedFood; match: LineMatch; kcal: number | null }
  | { kind: "unread"; raw: string };

export type PreviewSection = {
  id: string;
  heading: string | null;
  meal: MealType;
  mealFromHeading: boolean;
  kcal: number;
  lines: PreviewLine[];
};

type Choice = { product: Product; remember: boolean };
type Library = { products: Product[]; remembered: RememberedMatch[] };
type LoadState = { status: "loading" } | ({ status: "ready" } & Library) | { status: "error" };

export function usePasteLog(requestedDay?: string) {
  const db = useSQLiteContext();
  const [day] = useState(() => logDay(requestedDay));
  const [text, setText] = useState("");
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  // Fixed when the screen opens, so the first section's meal doesn't jump while typing.
  const [fallbackMeal] = useState(() => defaultMeal(new Date()));
  // Keyed by section position and heading, so editing other lines keeps a chosen meal.
  const [meals, setMeals] = useState<ReadonlyMap<string, MealType>>(new Map());
  // Products chosen in the match sheet, by name key.
  const [choices, setChoices] = useState<ReadonlyMap<string, Choice>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const [products, remembered] = await Promise.all([
        productRepo.search(db, ""),
        textLogMatchRepo.listActive(db),
      ]);
      if (request === latestRequest.current) setLoad({ status: "ready", products, remembered });
    } catch {
      if (request === latestRequest.current) setLoad({ status: "error" });
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const retry = useCallback(() => {
    setLoad({ status: "loading" });
    void reload();
  }, [reload]);

  const products = useMemo(() => (load.status === "ready" ? load.products : []), [load]);

  const sections = useMemo<PreviewSection[]>(() => {
    const remembered = load.status === "ready" ? load.remembered : [];
    // A choice whose product was deleted since is dropped, so its line is matched again.
    const live = new Map<string, Product>();
    for (const [key, choice] of choices) {
      if (products.some((p) => p.id === choice.product.id)) live.set(key, choice.product);
    }
    return parsePastedLog(text, fallbackMeal).map((section, index) => {
      const id = `${index}:${section.heading ?? ""}`;
      const lines = section.lines.map<PreviewLine>((line) => {
        if (line.kind === "unread") return line;
        const match = matchLine(line.key, products, remembered, live);
        const kcal = match.product ? forGrams(match.product, line.grams).kcal : null;
        return { kind: "food", food: line, match, kcal };
      });
      return {
        id,
        heading: section.heading,
        meal: meals.get(id) ?? section.meal,
        mealFromHeading: section.mealFromHeading,
        kcal: lines.reduce((sum, line) => sum + (line.kind === "food" ? (line.kcal ?? 0) : 0), 0),
        lines,
      };
    });
  }, [text, fallbackMeal, meals, choices, products, load]);

  const summary = useMemo(() => {
    const counts = { foods: 0, matched: 0, check: 0, notFound: 0, unread: 0, kcal: 0 };
    for (const section of sections) {
      for (const line of section.lines) {
        if (line.kind === "unread") {
          counts.unread += 1;
          continue;
        }
        counts.foods += 1;
        counts.kcal += line.kcal ?? 0;
        if (line.match.status === "matched") counts.matched += 1;
        else if (line.match.status === "check") counts.check += 1;
        else counts.notFound += 1;
      }
    }
    return { ...counts, log: counts.matched + counts.check, skip: counts.notFound + counts.unread };
  }, [sections]);

  const pickMeal = useCallback((sectionId: string, meal: MealType) => {
    setMeals((current) => new Map(current).set(sectionId, meal));
  }, []);

  const choose = useCallback((key: string, product: Product, remember: boolean) => {
    setChoices((current) => new Map(current).set(key, { product, remember }));
  }, []);

  // A product saved from the sheet becomes this name's choice.
  const chooseCreated = useCallback(
    async (key: string, productId: string, remember: boolean) => {
      try {
        const product = await productRepo.findById(db, productId);
        if (product) choose(key, product, remember);
      } catch {
        // The product is already saved; the reload below lists it so it can be chosen by hand.
      }
      await reload();
    },
    [db, choose, reload],
  );

  // Fills the text from the day before the target day; returns a message when there's nothing.
  const copyPreviousDay = useCallback(async (): Promise<string | null> => {
    try {
      const entries = await foodLogRepo.listByDay(db, addDays(day, -1));
      if (entries.length === 0) return "Nothing logged yesterday";
      const copied = textFromEntries(entries);
      setText((current) => (current.trim() ? `${current.trimEnd()}\n\n${copied}` : copied));
      return null;
    } catch {
      return "Couldn't read yesterday's log.";
    }
  }, [db, day]);

  const confirm = useCallback(async (): Promise<boolean> => {
    // The ref blocks a second tap that lands before the disabled button re-renders.
    if (summary.log === 0 || savingRef.current || load.status !== "ready") return false;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    let productGone = false;
    try {
      await db.withExclusiveTransactionAsync(async (txn) => {
        const remembered = new Set<string>();
        for (const section of sections) {
          for (const line of section.lines) {
            if (line.kind === "unread" || !line.match.product) continue;
            // Re-read inside the transaction so the copied values are current (ADR-6)
            // and a product deleted since the preview stops the whole save.
            const product = await productRepo.findById(txn, line.match.product.id);
            if (!product) {
              productGone = true;
              throw new Error("Matched product is gone");
            }
            await foodLogRepo.create(txn, product, { mealType: section.meal, grams: line.food.grams, day });
            const choice = choices.get(line.food.key);
            if (choice?.remember && choice.product.id === product.id && !remembered.has(line.food.key)) {
              remembered.add(line.food.key);
              await textLogMatchRepo.remember(txn, line.food.key, product.id);
            }
          }
        }
      });
      return true;
    } catch {
      if (productGone) {
        setSaveError("A matched product was removed. Check the lines and try again.");
        void reload();
      } else {
        setSaveError("Couldn't save your log. Nothing was saved.");
      }
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [summary.log, load.status, db, sections, choices, day, reload]);

  return {
    day,
    text,
    setText,
    load: load.status,
    retry,
    sections,
    summary,
    pickMeal,
    choose,
    chooseCreated,
    copyPreviousDay,
    saving,
    saveError,
    confirm,
  };
}
