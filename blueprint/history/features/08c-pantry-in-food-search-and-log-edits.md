# Feature: Pantry in food search and log edits

**From build-plan:** feature 8c
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/pantry-in-food-search-and-log-edits`

## Goal

The last slice of the pantry (`1_docs/plan/09_pantry_inventory.md` P1, stories
L9 and S13):

- Add food shows "In my pantry" first, so eating from home stock is one tap
  from the normal logging path.
- Editing or deleting a log entry that came from the pantry puts its grams
  back into stock, and Undo takes them out again. The day and the ledger never
  disagree.

Owner decision on Oct 21: rebuild Add food to `prototypes/search.html` frame 1
as part of this feature, then add "In my pantry" in the same style.

## Design reference

`prototypes/search.html` frame 1 ("Search your library"), with its CSS (lines
11-52):

- **Search bar:**
  - A row with `space[2]` / `space[4]` / `space[3]` padding and `space[2]`
    gaps.
  - **Back:** a 40 dp button with a `muted` back arrow and a −`space[2]` left
    margin.
  - **Search field:** `flex: 1` and `tap` tall, `radius.md`, `surface2` with a
    1 dp `accent` border, a 22 dp `muted` search icon, `md` text and
    `space[3]` side padding. The prototype's 3 dp `accentSoft` glow is not
    reproducible in React Native without a shadow hack, so it is dropped.
  - **Scan:** a `tap` square on `surface2`, `radius.md`, with a 22 dp
    `accentText` barcode icon.
- **Content:** `space[4]` side and bottom padding, `space[3]` gaps.
- **Meal chips:** Breakfast, Lunch, Dinner, Snacks as 32 dp pills on
  `surface2` in `sm` `muted`. The selected chip is `accentSoft` with
  `accentText` 600.
- **Section labels:** uppercase `xs` 600 `muted`, letter spacing 0.06em:
  "Your library · 4 results", "Not here?" and, new here, "In my pantry".
- **Cards:** `surface` with a 1 dp `border` and `radius.md`, no padding.
- **Product rows (`.prod`):**
  - At least 60 dp, with `space[2]` / `space[4]` padding and `space[3]`
    gaps, and a 1 dp top `border` between rows.
  - The name is `md` 500. The part matching the query is `accentText` 700.
  - The meta is `sm` `muted`: "165 kcal / 100 g · last 250 g", with the brand
    first when there is one.
  - A 36 dp round `accentSoft` "+" in `lg` 600 `accentText` sits on the right.
- **"Not here?" rows (`.more`):**
  - At least 56 dp, with `space[2]` / `space[4]` padding and a 1 dp top
    `border` between rows.
  - A 22 dp `accentText` icon, the name in `md` 600, and the meta in `xs`
    `muted`.
  - "Search Open Food Facts · Packaged products · needs internet".
  - "Create "chick…" product · Enter values from a label".

## In scope

- **Log edits keep the pantry right** (`foodLogRepo`). An entry with a
  `pantry_item_id` has one live `eaten` movement linked by
  `food_log_entry_id`. Each change runs in one exclusive transaction with
  `PRAGMA foreign_key_check`:
  - **Edit grams:** the movement becomes −new grams. A bigger amount is
    refused when the extra is more than the grams left plus 0.5, with "Only
    X g left in your pantry." The form keeps the values. Meal, day and time
    edits leave the movement alone.
  - **Delete:** the entry and its movement are soft-deleted together, so the
    grams return to stock.
  - **Undo** restores both.
  - Entries without a pantry link behave exactly as before.
- **The delete sheet** adds " Its N g go back to your pantry." after "The
  product stays in your library." for a pantry entry. `FoodLogEntry` gains
  `pantryItemId`.
- **Add food, rebuilt** (`/add`, native header hidden, search.html frame 1):
  - **Search bar:**
    - Back returns.
    - The field autofocuses, with the placeholder "Search foods".
    - Scan opens `/scan` with the selected meal, or `for=pantry` in pantry
      mode.
  - **Meal chips** start at the `meal` param, or `defaultMeal(now)`. The
    choice is passed to whatever is picked next. They are hidden in pantry
    mode (`for=pantry`).
  - **"In my pantry":**
    - In-stock pantry items whose name matches the query, all of them when
      the query is empty. Not shown in pantry mode, or when nothing matches.
    - Rows use `.prod`. The meta is the 8a amount text: "2 + 1 open · ≈ 465 g
      left".
    - Tapping a row opens `/pantry/portion/[itemId]` with the meal, the day
      and `from=add`.
  - **"Your library · N results"** (just "Your library" with an empty query):
    - The current search results as `.prod` rows, with "last 250 g" from the
      newest live log entry of that product.
    - Tapping opens `/add/[productId]` with the meal and day as before, or
      `/pantry/add/[productId]` in pantry mode.
  - **"Not here?"** shows when the query isn't empty:
    - "Search Open Food Facts" opens `/add/online` with the query, meal, day
      and `for`.
    - "Create "<query>" product" opens `/product/new` with `name` set to the
      query. It uses `then=log` with the meal and day, or `then=pantry` in
      pantry mode.
  - **States:**
    - Loading shows a spinner. An error shows "Couldn't load your foods." with
      Retry.
    - An empty library with no pantry shows "Your library is empty. Add a
      product first." with "Add product".
    - A query with no library match shows "No products match 'x'" in place of
      the library card, with "Not here?" still shown.
- **Search Open Food Facts** (`/add/online`, stack title "Open Food Facts"):
  - It searches by name with the existing `searchOffProducts`.
  - It shows the same states as the text log: searching, offline or error,
    nothing found, and results as `.prod`-style rows.
  - Choosing a result shows the existing `ProductForm`, prefilled, with the
    Open Food Facts note.
  - Saving creates the product (source `open_food_facts` when found) and
    replaces to `/add/[productId]` with the meal and day, or
    `/pantry/add/[productId]?fresh=1` in pantry mode. "Back" returns to the
    results.
- **The product form** (`/product/[id]`):
  - accepts `name` to prefill a new product;
  - passes `meal` and `day` through on `then=log`.
- **Log a portion:**
  - accepts `meal` and `day` (checked by `logDay`) and `from=add`;
  - starts on that meal and logs to that day;
  - with `from=add`, it dismisses to `/log` after saving, like `/add/[productId]`.
    Otherwise it goes back to the item.

## Out of scope

- **search.html frame 2:** the amount bottom sheet with the unit switch,
  steppers and day-after bar. The shared `AmountForm` screen stays.
- **search.html frame 3:** liquids in mL or fl oz.
- Batches and opened cans in "In my pantry" (features 9 and 12).
- **F-47, F-48 and F-49** from earlier reviews are not part of this feature.

## Build loop

Continuous Mode: steps run in order without review pauses. Each step keeps
`npx tsc --noEmit` and `npx expo lint` passing, and `npx expo-doctor` runs at
the end. Checkpoint commits are disabled.

## Build steps

- [x] **1. Log edits restore stock.**
  - Change `foodLogRepo` (`update`, `softDelete`, `restore`, and
    `pantryItemId` on reads), the `FoodLogEntry` type, `useEntry`'s message,
    and `DeleteEntrySheet`'s copy.
  - **Done when:** typecheck and lint pass. For a pantry entry:
    - an edit moves the linked movement to −new grams in the same
      transaction, and a too-large increase is refused;
    - delete and Undo flip both rows;
    - non-pantry entries use the same SQL as before.
- [x] **2. Add food data and pass-through params.**
  - Add `productRepo.lastGramsByProduct` (one query) and an Add food hook
    that loads products, last grams and in-stock pantry items for the query.
  - Change `/product/[id]` (`name`, meal and day pass-through) and
    `/pantry/portion/[itemId]` (`meal`, `day`, `from`).
  - **Done when:** typecheck and lint pass, and each param is used as
    specified.
- [x] **3. Add food screen (search.html frame 1).**
  - Rebuild `app/add/index.tsx` with the search bar, meal chips, the three
    sections and the states. Register it with the header hidden.
  - **Done when:** typecheck and lint pass. The layout, sizes and copy follow
    frame 1's CSS, pantry mode hides the meal chips and the pantry section,
    and the normal and pantry paths still reach their screens.
- [x] **4. Search Open Food Facts screen.**
  - Add `app/add/online.tsx`.
  - **Done when:** typecheck, lint and expo-doctor pass. Results, offline,
    error and empty states show, and saving continues to logging or to adding
    stock.

## Files / areas

All paths are under `apps/mobile/`.

- Changed: `src/modules/nutrition/repositories/foodLogRepo.ts`, `src/modules/nutrition/types/foodLog.ts`, `src/modules/nutrition/hooks/useEntry.ts`, `src/modules/nutrition/components/DeleteEntrySheet.tsx`, `src/modules/nutrition/repositories/productRepo.ts`
- Changed: `src/app/add/index.tsx`, `src/app/product/[id].tsx`, `src/app/pantry/portion/[itemId].tsx`, `src/modules/pantry/hooks/useLogPortion.ts`, `src/app/_layout.tsx`
- New: `src/app/add/online.tsx`, `src/modules/nutrition/hooks/useFoodSearch.ts`, `src/modules/nutrition/components/FoodRow.tsx`

## Data / contracts

- **No migration.**
- **Linked movement:** the one row in `stock_movements` with
  `food_log_entry_id = entry.id` and `reason = 'eaten'`. If it's missing (for
  example, rows restored from an inconsistent backup), the entry change still
  applies, and the stock is left alone.
- **Edit check:** `extra = newGrams − oldGrams`. The change is refused when
  `extra > gramsLeft + 0.5`. A smaller amount is always allowed.
- **Undo** restores the movement even if stock has since gone lower. The
  ledger can then dip below zero, and the item is hidden from the list until
  restocked or adjusted. That mirrors what really happened.
- **`lastGramsByProduct`:**

  ```sql
  SELECT product_id, grams FROM food_log_entries e
  WHERE deleted_at IS NULL AND product_id IS NOT NULL
    AND logged_at = (SELECT MAX(logged_at) FROM food_log_entries
                     WHERE product_id = e.product_id AND deleted_at IS NULL)
  ```

## Testing

No test runner is configured. Typecheck, lint, expo-doctor, and reading the
code against `search.html` and the ledger rules. There is no on-device run.

## Notes for the AI

- Read `prototypes/search.html` frame 1 (markup and CSS) before step 3, and
  compare the code with it before ticking the step.
- Theme tokens only, `SymbolView` icons, `makeStyles`, comments only for the
  why, no em dashes.
- `.gitignore` ignores folders named `log/`, so don't create one.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10450,"specSha256":"a8f8276fcd0be65c79069a4b6d8850ca996459198bc8aa0fceab43ada5a3a134","branch":"refs/heads/feature/pantry-in-food-search-and-log-edits","head":"c60a14e4d5a24ac1b8b1d925ba2d084735224cfd","baseRef":"refs/heads/main","baseCommit":"81b9b66dd37a38b8ecd3cfa3d75a5596d359e072","sourceTree":"2fb14f1dd500e9bf5049032d0b2ab16bcd9adcab","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** c60a14e4d5a24ac1b8b1d925ba2d084735224cfd
**Base commit:** 81b9b66dd37a38b8ecd3cfa3d75a5596d359e072
**Base ref:** main
**Spec hash:** a8f8276fcd0be65c79069a4b6d8850ca996459198bc8aa0fceab43ada5a3a134
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-21T14:38:30+08:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T06:41:10.048Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `81b9b66dd37a38b8ecd3cfa3d75a5596d359e072..c60a14e4d5a24ac1b8b1d925ba2d084735224cfd` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `npx tsc --noEmit` (apps/mobile): pass
- `npx expo lint` (apps/mobile): pass
- `npx expo-doctor` (apps/mobile): pass (21/21 checks)
- Unit tests: unavailable (no test runner configured)

### Evidence

- Request validated: HEAD equals Target commit, `git merge-base main HEAD` equals Base commit, spec SHA-256 matches, only review.md was dirty.
- Reviewed the full 81b9b66..c60a14e delta (15 files) against the active spec.
- Ledger: `foodLogRepo.update` routes linked entries to `updateFromPantry`, which re-reads grams, checks `extra > gramsLeft + 0.5` via `fitsStock`, updates the entry and its `eaten` movement, and runs `PRAGMA foreign_key_check` inside one exclusive transaction. `softDelete`/`restore` flip the entry and its `eaten` movement together in one exclusive transaction. Entries with no pantry link run the unchanged SQL. A missing movement or a gone item still lets the entry change, as the spec says.
- Add food matches search.html frame 1 CSS (search bar, chips, section labels, `.prod` and `.more` rows, cards). Letter spacing 0.7 approximates 0.06em at 11 sp. The glow is dropped as the spec allows.
- Params: meal/day/for/then/name/from flow through Add food, /add/online, /product/[id], /pantry/portion/[itemId] (validated with `isMealType` and `logDay`) and /scan (meal or for=pantry, as specified).
- `lastGramsByProduct` is one query, supported by `ix_log_product_recent(product_id, logged_at)`. Raw SQL uses bound parameters only.

### Findings

- F-51 [P3] open: Scan from Add food drops `day`
- F-52 [P3] open: Add food renders the library in a non-virtualized ScrollView

### Remaining risk

- No unit test runner is configured, so ledger edit/delete/undo paths are verified by reading the code only.
- No on-device run. Visual fidelity to search.html and keyboard/scroll behavior were not observed.

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go. With a product in
the pantry, open Today's **Log food** sheet and tap **Search**. Type part of the product's
name, then tap its row under **In my pantry** and tap **Add to <meal>**. On the Log tab, edit
that entry's grams up past what's left, then delete it and tap **Undo**.

Expected:

Add food matches `prototypes/search.html` frame 1, with "In my pantry" above "Your library".
The portion lowers the item's stock. The too-large edit is refused with "Only X g left in
your pantry." Deleting puts the grams back on the pantry item, and Undo takes them out again.

This proves:

Eating from home stock is one tap from Add food, and log edits keep the pantry right.
