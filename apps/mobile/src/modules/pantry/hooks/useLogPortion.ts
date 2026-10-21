import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import * as productRepo from "@/modules/nutrition/repositories/productRepo";
import { isDrained } from "@/modules/nutrition/services/drained";
import { logDay } from "@/modules/nutrition/services/mealTime";
import { formatKcal } from "@/modules/nutrition/services/nutritionCalc";
import type { EntryInput } from "@/modules/nutrition/types/foodLog";
import type { Product } from "@/modules/nutrition/types/product";

import { batchRepo } from "@/modules/recipes/repositories/batchRepo";

import * as pantryRepo from "../repositories/pantryRepo";
import { fitsStock, netToDrained, stockGramsFor } from "../services/pantryStock";
import type { PantryStock } from "../types/pantry";

type State =
  | { status: "loading" }
  | { status: "ready"; item: PantryStock; product: Product }
  | { status: "not_found" }
  | { status: "error" };

export type PortionResult = { ok: true } | { ok: false; message: string };

// Said in drained grams for a drained product, or tabs/caps for count supplements.
function notEnough(gramsLeft: number, product: Product, unit?: string): PortionResult {
  if (unit === "tabs" || unit === "caps") {
    return {
      ok: false,
      message: `Only ${Math.round(gramsLeft)} ${unit} left. Use Adjust if there's more.`,
    };
  }
  const drained = isDrained(product) && product.usualDrainedG !== null;
  const shown = drained ? netToDrained(gramsLeft, product.netWeightG, product.usualDrainedG) : gramsLeft;
  return {
    ok: false,
    message: `Only ${formatKcal(shown)} g${drained ? " drained" : ""} left. Use Adjust if there's more.`,
  };
}

// Loads the pantry item and its product, whose per-100 g values the log entry copies.
export function useLogPortion(itemId: string, day?: string) {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    pantryRepo
      .findItem(db, itemId)
      .then(async (item) => {
        if (!item) {
          if (active) setState({ status: "not_found" });
          return;
        }

        if (item.kind === "batch" && item.batchId) {
          const batch = await batchRepo.get(db, item.batchId);
          if (!active) return;
          if (batch) {
            const product: Product = {
              id: batch.id,
              barcode: null,
              name: batch.name,
              brand: "Batch",
              servingSize: null,
              servingGrams: null,
              kcalPer100g: batch.kcalPer100g,
              proteinPer100g: batch.proteinPer100g,
              carbsPer100g: batch.carbsPer100g,
              fatPer100g: batch.fatPer100g,
              netWeightG: batch.cookedWeightG,
              eatenDrained: false,
              drainedKcalPer100g: null,
              drainedProteinPer100g: null,
              drainedCarbsPer100g: null,
              drainedFatPer100g: null,
              usualDrainedG: null,
              source: "manual",
              isFavorite: false,
              createdAt: batch.createdAt,
              updatedAt: batch.updatedAt,
            };
            setState({ status: "ready", item, product });
            return;
          }
        }

        const product = item.productId ? await productRepo.findById(db, item.productId) : null;
        if (!active) return;
        setState(product ? { status: "ready", item, product } : { status: "not_found" });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [db, itemId, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  const save = useCallback(
    async (item: PantryStock, product: Product, input: EntryInput, wholeUnit: boolean): Promise<PortionResult> => {
      if (item.kind === "batch" && item.batchId) {
        if (!fitsStock(input.grams, item.gramsLeft)) return notEnough(item.gramsLeft, product, item.unit);
        try {
          await batchRepo.logPortion(db, {
            batchId: item.batchId,
            pantryItemId: item.id,
            batchName: item.name,
            grams: input.grams,
            mealType: input.mealType,
            day: logDay(day),
          });
          return { ok: true };
        } catch (e) {
          return { ok: false, message: e instanceof Error ? e.message : "Couldn't log batch portion" };
        }
      }

      const usual = isDrained(product) ? product.usualDrainedG : null;
      const stockGrams = stockGramsFor(input.grams, wholeUnit && usual !== null, product.netWeightG, usual);
      if (!fitsStock(stockGrams, item.gramsLeft)) return notEnough(item.gramsLeft, product, item.unit);
      try {
        await pantryRepo.logPortion(db, { itemId: item.id, product, ...input, day: logDay(day), wholeUnit });
      } catch (e) {
        // The ledger can have changed since the screen loaded; report the stored amount.
        if (e instanceof pantryRepo.NotEnoughStockError) return notEnough(e.gramsLeft, product, item.unit);
        throw e;
      }
      return { ok: true };
    },
    [db, day],
  );

  return { state, retry, save };
}
