# Feature: Food log

**From build-plan:** feature 2
**Build attempt:** 1
**Status:** verified
**Branch:** feature/food-log

## Goal

Log a saved product to a meal with grams, see the day's entries grouped by meal on
the Log tab, edit an entry's grams or meal, and delete an entry with Undo. Each
entry stores a copy of the product's name and per-100 g values plus the computed
kcal and macros, so editing the product later never changes a logged day (ADR-6).
PRD acceptance: a full real day logged, and editing a product afterwards doesn't
change that day.

## Design reference

- `prototypes/log.html` (day list: total, meal groups with subtotals, entry rows
  with name, amount and kcal) and `prototypes/search.html` frames 1-2 (pick a
  product, set the amount with a live kcal and macro preview, "Add to <Meal>").
- `1_docs/DESIGN_SYSTEM.md` §6-7 (`MealSection`, `EntryRow`, `GramsInput`,
  add-to-meal sheet) and §9 content style: a space before units, whole kcal,
  grams to one decimal only below 10.
- Reuse the feature 1 theme tokens. "Ugly is fine" until Oct 28: match layout,
  skip polish. Day navigation, the date picker and goal progress are later
  features and stay out.

## In scope

- **Migration `002_food_log`:** the `food_log_entries` table and indexes from
  `1_docs/DATABASE.md` §3, unchanged. Additive only.
- **Calculation services (pure, no React or SQLite):**
  - `forGrams(per100, grams)` returns kcal, protein, carbs and fat for those
    grams (`value * grams / 100`). A null macro stays null.
  - `sumTotals(entries)` adds kcal and macros.
  - `dayKey(date)` returns the local `YYYY-MM-DD`.
  - `defaultMeal(date)` by local time: before 10:30 breakfast, before 15:00
    lunch, before 20:00 dinner, otherwise snack (UX_FLOWS §2).
  - `formatGrams(g)` and `formatKcal(kcal)` follow DESIGN_SYSTEM §9.
- **Repository `foodLogRepo`:**
  - `create(product, { day, mealType, grams })` copies name and per-100 g values
    from the product.
  - `listByDay(day)`, `findById(id)`, `lastGramsForProduct(productId)`.
  - `update(id, { mealType, grams })` rescales from the entry's own per-100 g
    copies, never from the product.
  - `softDelete(id)` and `restore(id)` for Undo.
- **Log tab (`src/app/(tabs)/log.tsx`):**
  - Today's entries, grouped into Breakfast, Lunch, Dinner and Snack in that
    order. Each group shows its subtotal kcal and an "Add food" action.
  - A day total line: kcal plus P / C / F grams.
  - Loading, error with Retry, and an empty day ("No food logged today").
  - Tapping an entry opens the edit screen. Long-press, or the accessibility
    "Delete" action, deletes the entry and shows an Undo bar for 5 seconds.
- **Pick a product (`src/app/add/index.tsx`):**
  - Searches the library, reusing `useProducts` and `ProductRow`.
  - Tapping a product opens the amount screen and carries the chosen meal.
  - With no products, it shows a button that opens the existing product form.
- **Add to meal (`src/app/add/[productId].tsx`):**
  - Shows the product name and kcal per 100 g, the meal choice and a grams
    input.
  - Default meal: the one carried from the Log tab, else `defaultMeal(now)`.
  - Default grams: the last grams logged for this product, else the product's
    serving grams, else 100 (UX_FLOWS §2).
  - Live preview of kcal and P / C / F.
  - "Add to <Meal>" saves the entry for today and returns to the Log tab.
  - Handles a product that no longer exists, a load error, invalid grams, and a
    save failure that keeps the typed values.
- **Edit entry (`src/app/entry/[id].tsx`):**
  - Edits grams and meal, with the same live preview from the entry's copies.
  - "Save changes" returns to the Log tab.
  - Handles a missing entry, a load error, invalid grams, and a save failure.
- **Tab icons (added mid-feature at the owner's request):** the four tabs show
  Material Symbols icons through the already-installed `expo-symbols`
  `SymbolView`, replacing the labels-only tab bar.

## Out of scope

- Day navigation, the date picker and logging to another day (feature 7). Entries
  go to today; the repository takes the day as an argument so feature 7 can pass
  another one.
- Calorie goal, eaten / goal / remaining, and the Today screen (feature 3).
- Scanner (4), Open Food Facts (5), recents, favorites and quick-add (6).
- Unit choices other than grams (mL, oz, servings), entry notes, and custom meal
  slots (PRD Q1).
- Swipe-to-delete gestures; long-press plus the accessibility action covers delete.

## Build loop

Continuous Mode: steps run in order without review pauses. Each step must keep
`npx tsc --noEmit`, `npx expo lint` and `npx expo-doctor` passing. Checkpoint
commits are disabled; the final feature commit happens at completion.

## Build steps

- [x] **1. Schema, types, calculations and repository.**
  - Add `src/db/migrations/002_food_log.ts` with the exact DDL from Data /
    contracts, and append `{ version: 2, name: "002_food_log" }` to the list.
  - Add `src/modules/nutrition/types/foodLog.ts` (`MealType`, `MEAL_TYPES`,
    `FoodLogEntry`, `Nutrients`).
  - Add `src/modules/nutrition/services/nutritionCalc.ts` (`forGrams`,
    `sumTotals`, `formatGrams`, `formatKcal`) and
    `src/modules/nutrition/services/mealTime.ts` (`dayKey`, `defaultMeal`,
    `MEAL_LABELS`).
  - Add `src/modules/nutrition/repositories/foodLogRepo.ts` with bound
    parameters only.
  - **Done when:** typecheck, lint and expo-doctor pass. A scratch node run of
    `forGrams`, `dayKey` and `defaultMeal` gives the expected values: 165 kcal at
    180 g is 297; 10:29 is breakfast and 10:30 is lunch; 19:59 is dinner and
    20:00 is snack. Delete the scratch file afterwards.
- [x] **2. Log tab.**
  - Add `src/modules/nutrition/hooks/useDayLog.ts`: loads `listByDay(today)` on
    focus, with loading, error and retry, groups by meal, and exposes
    `remove(id)` and `undo()`.
  - Add `src/modules/nutrition/components/EntryRow.tsx` and `MealSection.tsx`.
  - Replace the Log placeholder with the day total, the four meal sections, the
    empty state and the Undo bar.
  - **Done when:** typecheck and lint pass. On the phone, the Log tab shows
    "No food logged today" plus the four meals, each with "Add food".
- [x] **3. Pick a product and add to meal.**
  - Add `src/app/add/index.tsx` and `src/app/add/[productId].tsx`, and register
    them in the root `Stack` with the titles "Add food" and "Add to meal".
  - Add `src/modules/nutrition/hooks/useAddEntry.ts`, which loads the product
    and its last grams and saves.
  - Add `src/modules/nutrition/services/entrySchema.ts`: grams text to a
    positive number, accepting a comma decimal.
  - Add `src/modules/nutrition/components/AmountForm.tsx`: meal choice, grams
    input, live preview and submit. The add and edit screens share it.
  - Save, then `router.dismissTo("/log")`.
  - **Done when:** typecheck and lint pass. On the phone: Log, then Add food
    under Lunch, then a product, then 180 g, then "Add to Lunch" returns to Log,
    showing the entry under Lunch with the right kcal and the day total updated.
    Logging the same product again prefills 180.
- [x] **4. Edit entry, delete and Undo.**
  - Add `src/app/entry/[id].tsx` (title "Edit entry") and
    `src/modules/nutrition/hooks/useEntry.ts`.
  - Saving calls `foodLogRepo.update` and goes back.
  - Wire long-press and the accessibility "Delete" action on `EntryRow` to
    `remove`, with the Undo bar calling `restore`.
  - **Done when:** typecheck and lint pass. On the phone:
    - Changing grams or meal moves or rescales the entry.
    - Long-press deletes the entry, and Undo brings it back.
    - Editing the product's kcal in Products leaves the logged entry's kcal
      unchanged.

## Files / areas

All paths are under `apps/mobile/`.

- New: `src/db/migrations/002_food_log.ts`
- New: `src/modules/nutrition/types/foodLog.ts`
- New: `src/modules/nutrition/services/{nutritionCalc,mealTime,entrySchema}.ts`
- New: `src/modules/nutrition/repositories/foodLogRepo.ts`
- New: `src/modules/nutrition/hooks/{useDayLog,useAddEntry,useEntry}.ts`
- New: `src/modules/nutrition/components/{EntryRow,MealSection,AmountForm}.tsx`
- New: `src/app/add/index.tsx`, `src/app/add/[productId].tsx`, `src/app/entry/[id].tsx`
- Changed: `src/db/migrations/index.ts`, `src/app/_layout.tsx`, `src/app/(tabs)/log.tsx`,
  `src/app/(tabs)/_layout.tsx` (tab icons)

## Data / contracts

Migration `002_food_log` (version 2), executed in the existing runner's transaction:

```sql
CREATE TABLE food_log_entries (
  id                TEXT PRIMARY KEY,
  day               TEXT NOT NULL,
  logged_at         TEXT NOT NULL,
  meal_type         TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  product_id        TEXT REFERENCES products(id),
  product_name      TEXT NOT NULL,
  grams             REAL NOT NULL CHECK (grams > 0),
  kcal_per_100g     REAL NOT NULL,
  protein_per_100g  REAL,
  carbs_per_100g    REAL,
  fat_per_100g      REAL,
  kcal              REAL NOT NULL,
  protein_g         REAL,
  carbs_g           REAL,
  fat_g             REAL,
  notes             TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT
);
CREATE INDEX ix_log_day ON food_log_entries(day) WHERE deleted_at IS NULL;
CREATE INDEX ix_log_product_recent ON food_log_entries(product_id, logged_at);
```

- `id` is `randomUUID()` from `expo-crypto`. `logged_at`, `created_at` and
  `updated_at` are UTC ISO strings from `new Date().toISOString()`. `day` is the
  local `YYYY-MM-DD` at log time and never changes on edit.
- **Copies (ADR-6):** `product_name` and the four per-100 g values are copied
  from the product at create time. `kcal`, `protein_g`, `carbs_g` and `fat_g`
  are `forGrams(copies, grams)`, stored unrounded. `update` recomputes them from
  the row's own copies and sets `updated_at`. It changes only `grams`,
  `meal_type` and the computed columns.
- **Rounding** happens only for display: kcal as a whole number, macros to one
  decimal, grams per DESIGN_SYSTEM §9.
- **Soft delete:** `softDelete` sets `deleted_at` and `updated_at`. `restore`
  clears `deleted_at` and sets `updated_at`. Every read filters
  `deleted_at IS NULL`. Nothing is hard-deleted.
- **Ordering:** `listByDay` returns rows ordered by `logged_at`; grouping by meal
  happens in the hook.
- **Last grams:** `lastGramsForProduct` returns the grams of the newest
  non-deleted entry for that product by `logged_at`, or null.
- **Validation:** grams must be a finite number greater than 0; a comma decimal
  is accepted. The error is "Enter grams above 0". There is no upper limit (none
  is defined in the plans). `meal_type` is one of the four values.
- **Results:** `update`, `softDelete` and `restore` return
  `{ ok: true } | { ok: false, error: "not_found" }`. `create` returns the new id.
  Other SQLite errors reject and surface as a save or load error message. They
  are never swallowed.
- User text (product names) renders only through `<Text>`.

## Testing

No test runner is configured. `nutritionCalc` and `mealTime` stay pure so they
can get Jest tests once `/tests` adds a runner. Evidence for this feature:
typecheck, lint, expo-doctor, a scratch node check of the pure functions in
step 1, and the on-phone Done-when checks.

## Notes for the AI

- Run every command from `apps/mobile/`. Read the versioned Expo SDK 57 docs
  before using an Expo API. No new dependencies.
- Follow feature 1's patterns:
  - The repository takes the `db` from `useSQLiteContext`.
  - Hooks own the loading, error and retry states.
  - Route files only compose.
  - Styles go through `makeStyles(theme)`.
  - Comments only when needed.
- `useFocusEffect` refreshes the Log tab after returning from the add and edit
  screens.
- The Undo bar is local state in the Log screen. A new delete replaces a pending
  Undo, and the bar hides after 5 s.
- Writing style: no em dashes in code comments or copy.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":11965,"specSha256":"ffc84b8096213c3020c164e4b4e2ab9e325d64a2835af2dac9202ddac4464710","branch":"refs/heads/feature/food-log","head":"2a18f7d909421f1094632ef48d83abf68f218dc2","baseRef":"refs/heads/main","baseCommit":"fc26486a11ab31d08974a3b2ea72ff45a01648ef","sourceTree":"a232b259a4b01efc36fbda185cd58b07c20df96d","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 2a18f7d909421f1094632ef48d83abf68f218dc2
**Base commit:** fc26486a11ab31d08974a3b2ea72ff45a01648ef
**Base ref:** main
**Spec hash:** ffc84b8096213c3020c164e4b4e2ab9e325d64a2835af2dac9202ddac4464710
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-20T12:24:27Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T12:26:26Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `fc26486a11ab31d08974a3b2ea72ff45a01648ef..2a18f7d909421f1094632ef48d83abf68f218dc2` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `git rev-parse HEAD` / `git merge-base main HEAD` / `sha256sum blueprint/context/current-feature.md`: pass (target, base and spec hash match the request; only review.md dirty)
- `npx tsc --noEmit` (apps/mobile): pass
- `npx expo lint` (apps/mobile): pass
- `npx expo-doctor` (apps/mobile): pass (21/21 checks)
- `node <scratch>/t.ts` (copies of nutritionCalc, mealTime, entrySchema outside the repo, deleted afterwards): pass
- Test runner: unavailable (none configured)

## Evidence

- All 20 changed files in the delta read in full; spec tracked in Git, hash verified.
- Migration 002 matches the spec DDL exactly and is appended as version 2; every repository query uses bound parameters and filters `deleted_at IS NULL`.
- `update` rescales from the row's own per-100 g copies (ADR-6); `softDelete`/`restore` return `not_found` on zero changes.
- Scratch run: 165 kcal at 180 g = 297; 10:29 breakfast, 10:30 lunch, 19:59 dinner, 20:00 snack; formatGrams 7.25 -> "7.3 g"; schema accepts "180", "7,5", " 12 " and rejects "", "abc", "0", "-5", "Infinity", "1e400", "1,5,3", and an unknown meal.
- Route params: `meal` validated by `isMealType`; ids only reach bound SQL. Product names render only through `<Text>`.
- Queries match indexes `ix_log_day` (partial) and `ix_log_product_recent`; list loads guarded against stale responses.

## Findings

- F-03 [P3] unverified - Log tab can keep showing yesterday after midnight
- F-01, F-02 carried from feature 1, not re-examined (outside this delta)

## Remaining risk

- No unit test runner configured, so `nutritionCalc`, `mealTime` and `entrySchema` have no committed tests (spec acknowledges; evidence was a scratch run only).
- Check not required and not run; on-phone Done-when behavior (add, edit, delete with Undo, product edit leaving the log unchanged, tab icons rendering) was not observed by this reviewer.
- `sumTotals` counts a null macro as 0, so a day where all entries lack carbs shows "C 0" rather than "-"; documented intent, not a finding.

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go (you need at
least one saved product). On the **Log** tab, tap **+ Add food** under **Lunch**,
pick a product, set Amount (g) to `180`, and tap **Add to Lunch**. Then
long-press the new entry.

Expected:

You land back on **Log** with the product under **Lunch**, showing `180 g` and its
kcal (for example 297 for a 165 kcal per 100 g product), and the Lunch subtotal
and day total include it. The long-press removes the row and shows
**Deleted <name>** with **Undo**; tapping **Undo** within 5 seconds brings the
row back.

This proves:

A product is logged to a chosen meal with its values copied onto the entry, the
day groups and totals it, and soft delete with Undo works.
