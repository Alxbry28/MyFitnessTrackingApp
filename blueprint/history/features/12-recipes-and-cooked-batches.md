# Feature: Recipes and cooked batches

**From build-plan:** feature 12
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/recipes-and-cooked-batches`

## Goal

Pantry step P4 (`1_docs/plan/09_pantry_inventory.md`; Epic M in
`1_docs/business_analyst/user_story/04_recipes_and_pantry.md` §5 and §8;
`prototypes/recipes.html` frames 1-4):

1. Save **recipes** with raw ingredients from the product library and their raw grams.
2. Parse raw-ingredient notes pasted from notes (with unit parsing, library food matching, and warning if no oil is listed).
3. Cook a **batch** from a recipe (or quick batch) that goes into the pantry fridge without counting toward daily macros; cooking deducts tracked pantry ingredients (e.g. cans of tuna).
4. Get cooked weight via three methods: **settle at the end** (total taken out), **weigh in parts** (app sums container weights), or **estimate** (learned cooked ratio).
5. Active batches show in the pantry under "Cooked" / "In the fridge now" and at the top of food search when adding to a meal.
6. Logging a portion in grams counts toward the day and deducts from the batch.
7. **Settle batch**: when finished or manually settled, calculate actual cooked weight from total grams taken out, recalculate per-100 g calories and macros, retroactively update all portions logged from this batch, and update the recipe's learned cooked ratio.

## Design reference

`prototypes/recipes.html` frames 1 to 4:

- **Frame 1 (Recipes list, More › Recipes):**
  - Section "In the fridge now": active cooked batches with amount left, `⚠ unsettled` badge when unsettled, and `Settle` button.
  - Section "Saved recipes": saved recipes with ingredient count, times cooked, learned ratio (e.g. `ratio ×0.87`), and `kcal/100 g`.
  - Note: "The ratio (cooked ÷ raw weight) is learned each time you settle a batch, so estimates get closer every time."
  - Floating action button: "Cook a batch" (and header link "+ Recipe").
- **Frame 2 (Recipe edit & paste from notes):**
  - Raw weights title, text area to paste ingredient notes.
  - Matched ingredients list with amount in grams, matched library food name, checkmarks, and estimated badges.
  - Warning banner: "No oil listed. 1 tbsp of oil is about 120 kcal..." when no oil/fat is detected.
  - Buttons: "+ Add oil", "Save recipe".
- **Frame 3 (Cook a batch):**
  - Header: raw totals card (raw grams, kcal, protein g, ingredients count) with "Edit for this batch only".
  - Section: "How will you get the cooked weight?"
    - Radio option 1: "Settle at the end" (Log portions in grams. When it's finished, cooked weight = everything taken out).
    - Radio option 2: "Weigh in parts" (Scoop into containers that fit the scale; app adds them up).
    - Radio option 3: "Estimate" (raw g × learned ratio ≈ cooked g).
  - Note: "Cooking never counts toward today; only the portions you eat do."
  - Button: "Save batch to fridge".
- **Frame 4 (Settle sheet):**
  - Bottom sheet: "Chopsuey is finished" / "You took out 1,000 g in total. Use it as the cooked weight?"
  - Table of logged portions: Portion (meal), g, est. kcal, settled kcal, and Total kcal row.
  - Result row: Per 100 g (e.g. "66 → 80 kcal").
  - Checkbox: "I logged every portion (eaten, shared, discarded)".
  - Button: "Settle batch".

## In scope

- **Migration 011:**
  - `recipes`: `id`, `name`, `notes`, `learned_cooked_ratio`, `created_at`, `updated_at`, `deleted_at`.
  - `recipe_ingredients`: `id`, `recipe_id`, `product_id`, `raw_grams`, `is_estimated`, `created_at`, `updated_at`, `deleted_at`.
  - `batches`: `id`, `recipe_id`, `name`, `cooked_at`, `cooked_weight_g`, `weight_method` (`settled` | `weighed_parts` | `estimated`), `is_settled`, `kcal_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`, `created_at`, `updated_at`, `deleted_at`.
  - `batch_ingredients`: `id`, `batch_id`, `product_id`, `raw_grams`, `kcal_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`, `is_estimated`, `created_at`, `updated_at`, `deleted_at`.
  - `food_log_entries`: `updated_by_settle INTEGER NOT NULL DEFAULT 0`.
- **Pure logic in `recipeCalc.ts`:**
  - Total raw nutrition calculation from ingredient grams and per-100 g values.
  - Cooked per-100 g nutrition from raw totals and cooked weight.
  - Cooked ratio calculation and running average update.
  - Ingredient notes parser (handles `32g broccoli stem`, `Total cooked: 532g`, estimates without amounts, oil detection).
- **Recipes list & editor:**
  - Added to More tab (`More > Recipes`).
  - Saved recipes list showing ingredients, times cooked, ratio, kcal/100 g.
  - Recipe editor with ingredient picker, manual grams, paste notes parser, oil warning.
- **Cook a batch flow:**
  - Cook screen from recipe with pre-filled ingredients editable for this batch.
  - Weight methods: "Settle at the end", "Weigh in parts" (input container weights and sum), "Estimate".
  - Creates `batches`, `batch_ingredients`, and `pantry_items` (`kind = 'batch'`, `location = 'fridge'`, `status = 'active'`).
  - Creates `stock_movements` (`delta_grams = cooked_weight_g`, `reason = 'cooked'`).
  - Subtracts tracked pantry items used as ingredients (`stock_movements` with `reason = 'used_in_cooking'`, `delta_grams = -rawGrams`).
- **Pantry & search integration:**
  - Pantry list displays active batches in "Cooked" / "In the fridge now" with amount left and `⚠ unsettled` badge when applicable.
  - Add food / Search shows active pantry batches in "In my pantry" at top.
  - Logging portion from batch creates `food_log_entry` with batch per-100 g values and records `stock_movements` with `reason = 'eaten'`.
- **Settle batch flow:**
  - Settle sheet reachable from pantry batch row / detail screen.
  - Computes total taken out from movements (eaten + shared + discarded).
  - Recalculates batch per-100 g nutrients.
  - Updates all linked `food_log_entries` for this batch with the settled values.
  - Updates recipe's `learned_cooked_ratio`.

## Out of scope

- Container weight presets library (M10, Could).
- Weighing before and after on the scale (M11, Could).
- Equal container split helper (M12, Could).
- Expiry / freshness push notifications (feature 27).

## Build loop

Continuous Mode: steps run in order without review pauses. Each step keeps
`npx tsc --noEmit` and `npx expo lint` passing, and `npx expo-doctor` runs at
the end. Checkpoint commits are disabled. No test runner is configured, so
pure logic stays in React-free service files.

## Build steps

- [x] 1. **Database migration & pure calculation service.** Migration `011_recipes_and_batches.ts` creating tables `recipes`, `recipe_ingredients`, `batches`, `batch_ingredients` and adding `updated_by_settle` to `food_log_entries`. Types in `modules/recipes/types/recipes.ts`. Pure logic in `modules/recipes/services/recipeCalc.ts` (raw nutrition totals, cooked per-100 g values, learned ratio, ingredient notes parser). Done when migration is registered, typecheck and lint pass.
- [x] 2. **Recipe repository & hooks.** `recipeRepo.ts` with queries to list recipes, get recipe with ingredients, create recipe, update recipe, and soft-delete recipe. Hook `useRecipes.ts`. Done when typecheck and lint pass.
- [x] 3. **Recipes list screen & recipe editor.** Route `/recipes` under More tab (`apps/mobile/src/app/recipes/index.tsx`) and recipe editor (`apps/mobile/src/app/recipes/new.tsx`, `apps/mobile/src/app/recipes/[id].tsx`) with ingredient picker, manual grams, paste-notes parser, oil warning banner, and save. Done when typecheck and lint pass.
- [x] 4. **Batch cooking repository & Cook a batch screen.** `batchRepo.ts` with batch creation, snapshotting ingredients, creating pantry batch item with `cooked` movement, and deducting tracked pantry ingredients with `used_in_cooking` movements. Screen `/recipes/cook/[recipeId].tsx` with raw totals, ingredient adjustments, weight method choice (settle at end, weigh in parts, estimate), and save batch to fridge. Done when typecheck and lint pass.
- [x] 5. **Pantry & search integration for batches.** Update `pantryRepo.ts` to join batches in `STOCK_SELECT` so cooked batches appear in Pantry list under "Cooked" / "In the fridge now" with unsettled badges. Update Add food / food search to surface cooked batches in "In my pantry" and log portions in grams. Done when typecheck and lint pass.
- [x] 6. **Settle batch sheet & retro-active portion update.** Settle sheet (`SettleBatchSheet.tsx` / `/pantry/settle/[batchId].tsx`) per frame 4: displays all portions logged from the batch with est vs settled calories, updates batch cooked weight and per-100 g values, updates all linked `food_log_entries`, and updates recipe's `learned_cooked_ratio`. Done when typecheck, lint, and `npx expo-doctor` pass.

## Files / areas

- `apps/mobile/src/db/migrations/011_recipes_and_batches.ts`, `index.ts`
- `apps/mobile/src/modules/recipes/`: `types/recipes.ts`, `services/recipeCalc.ts`, `repositories/recipeRepo.ts`, `repositories/batchRepo.ts`, `hooks/useRecipes.ts`, `components/SettleBatchSheet.tsx`
- `apps/mobile/src/modules/pantry/`: `types/pantry.ts`, `repositories/pantryRepo.ts`, `components/PantryRow.tsx`
- `apps/mobile/src/app/`: `(tabs)/more.tsx`, `recipes/index.tsx`, `recipes/new.tsx`, `recipes/[id].tsx`, `recipes/cook/[recipeId].tsx`, `pantry/[id].tsx`, `add/index.tsx`, `pantry/settle/[batchId].tsx`

## Testing

No test runner is configured (`AGENTS.md` Commands). Pure logic in
`recipeCalc.ts` (raw nutrition, cooked per 100 g, cooked ratio, notes parser).
Evidence per step: `npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor`
at the end.

## Notes for the AI

- Every multi-table write runs inside an exclusive transaction with foreign keys enabled.
- Cooking never counts toward daily macros (ADR-8).
- Settling a batch updates only the log entries linked to that batch (D7).
- No em dashes in code comments or text.

## Try it now

Open the app on your phone via Expo Go:
1. Tap **More** -> tap **Recipes**.
2. Tap **+ New recipe**, name it "Chopsuey", tap **Paste notes**, paste ingredient list with grams, verify matched ingredients, and tap **Save recipe**.
3. Tap **Cook a batch**, review raw ingredients and choose **Settle at the end**, then tap **Save batch to fridge**.
4. Tap the **Pantry** tab -> see "Chopsuey" under **Cooked** with `⚠ unsettled`.
5. Tap **Log a portion** -> log 300 g to Lunch.
6. Open Chopsuey batch detail -> tap **Settle batch**, review portions table with est vs settled kcal, and tap **Settle batch**.
7. Go to **Log** tab -> verify Lunch now reflects the settled calories and macros.
