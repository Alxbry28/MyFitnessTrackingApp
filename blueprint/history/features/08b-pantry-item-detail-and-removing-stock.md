# Feature: Pantry item detail and removing stock

**From build-plan:** feature 8b
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/pantry-item-detail-and-removing-stock`

## Goal

The second slice of the pantry (`1_docs/plan/09_pantry_inventory.md` P1,
stories L4, L7, L8). Tapping a pantry row opens the item. The item screen shows
what's left and the history that adds up to it. From there you can:

- log a portion, which writes a food log entry and takes the grams out of
  stock in one step;
- remove stock without eating it (shared, discarded, spilled);
- adjust the stock to what is really there.

Core rule: only eating counts toward the day (ADR-8). Remove and Adjust never
add calories. Stock is only the sum of the ledger (ADR-7).

## Design reference

`prototypes/pantry.html` frame 2 ("Item detail: amount left = sum of the
history") and frame 4 ("Remove without eating"), with the shared CSS (lines
11-94). Rules from that CSS:

- **Back link:** "‹ Pantry" in `sm` `accentText`, with `space[2]` /
  `space[4]` / 0 padding. The native header is hidden.
- **App bar:** the item name in `lg` 700 (`h1.sm`), with `space[2]` /
  `space[4]` / `space[3]` padding.
- **Content:** `space[4]` side padding and `space[3]` gaps.
- **Hero card:** a `card` (`surface`, 1 dp `border`, `radius.md`, `space[3]` /
  `space[4]` padding) holding:
  - a baseline row of numbers in `num` 700 (letter spacing -0.03em, line
    height 1), each followed by a word in `sm` `muted`, with `space[2]` gaps;
  - a row of unit shapes (`space[3]` top margin, `space[2]` gaps): 34 x 44 dp,
    radius 6, 2 dp `accent` border on `accentSoft`. An opened unit has a
    dashed border and is filled only on its lower 45%;
  - a `note` line (`xs` `muted`, line height 1.45, `space[3]` top margin).
- **Fields card:** a `card` with `space[1]` vertical padding holding `.field`
  rows: label left in `sm` `muted`, value right in `sm`, at least 48 dp, 1 dp
  bottom `border`, none on the last.
- **Action row:** three buttons in a 1.4 : 1 : 1 grid with `space[2]` gaps.
  Each is `tap` tall, `radius.md`, `sm` 600 on `surface2`. "Log a portion" is
  primary (`accent` with `accentInk`).
- **History:** an uppercase `xs` 600 `muted` "History" section label (letter
  spacing 0.06em), then a `card` with no vertical padding holding `.row`
  rows (56 dp, `space[2]` vertical padding, 1 dp bottom border, none on the
  last). Each row has a name in `md` 500, a meta line in `sm` `muted`, and on
  the right the change in tabular 600: `ok` for additions, `text` for eating,
  `over` for removals.
- **Sheet (frame 4):**
  - A `scrim` over the screen and a bottom sheet on `surface`: top corners
    `radius.lg`, 1 dp top `border`, `space[2]` / `space[4]` / `space[5]`
    padding, `space[3]` gaps, with a 36 x 4 grabber in `faint`.
  - A two-part segmented control, "Remove" and "Adjust to actual": a
    `surface2` track with 3 dp padding and `radius.md`; 36 dp segments in `sm`
    `muted`, radius 9; the selected one is `surface` with `text` 600.
  - A "Reason" section label, then chips (32 dp pills on `surface2` in `sm`
    `muted`; the selected one is `accentSoft` with `accentText` 600).
  - An "Amount" field row with the input on the right (`surface2`,
    `radius.sm`, `space[2]` / `space[3]` padding, at least 88 dp, `md` 600,
    right-aligned).
  - A `result` box (`surface2`, `radius.md`, `space[3]` / `space[4]`, `sm`):
    the item name on the left and "550 → 350 g" on the right in `lg` bold.
  - A `note` line, then a two-button row: "Cancel" (ghost, 1 dp `border`) and
    the primary action.

## In scope

- **Pantry rows open the item.** A `PantryRow` becomes a pressable row (role
  button) that opens `/pantry/[id]`.
- **Item screen** (`/pantry/[id]`, frame 2):
  - **Hero:**
    - The whole units and the part unit, from the same split as the list
      (8a's display rule): "2 sealed 1 opened", "3 sealed" or "1 opened".
    - Unit shapes: one per whole unit, plus one opened shape for a part unit,
      up to 12 in total. More than that adds a "+N" text in `sm` `muted`.
    - The note: "About 465 g left", plus " · expires in 3 days" (the 8a
      badge text) when the item has an expiry.
    - At 0 g the hero reads "0 left" with no shapes, and the note says "Used
      up. Restock from + Add stock."
  - **Fields:** "Net weight per unit" ("155 g"), "Location" ("Cupboard"), and
    "Expiry date" ("Fri, Oct 24", or "None").
  - **Actions:**
    - "Log a portion" opens `/pantry/portion/[itemId]`.
    - "Remove" and "Adjust" open the sheet on that tab.
    - With 0 g left, "Log a portion" and "Remove" are disabled. Adjust still
      works, so stock that was really there can be put back.
  - **History:** live movements, newest first, at most 50. Each row shows:
    - **Name:** "Bought", "Eaten · Lunch" (the meal of the linked log entry,
      or "Eaten" when there's none), "Shared", "Discarded", "Spilled" or
      "Adjusted".
    - **Meta:** the local date and time, "Oct 20, 12:35".
    - **Change:**
      - "+3 units" (or "+1 unit") for a buy with units;
      - otherwise signed grams: "−50 g", "+20 g".
      - Tones: `ok` for additions, `text` for eaten, `over` for shared,
        discarded, spilled and negative adjustments.
  - The screen reloads on focus, so a logged portion shows when you come
    back.
  - **Loading and errors:**
    - Loading shows a spinner.
    - An error shows "Couldn't load this item." with Retry.
    - A missing or deleted item shows "This item isn't in your pantry
      anymore." with "Back to pantry".
- **Log a portion** (`/pantry/portion/[itemId]`, a stack screen titled "Log a
  portion"):
  - It uses the shared `AmountForm` (meal chips, grams, live preview), the
    product's name and its current per-100 g values.
  - **Defaults:** the meal from `defaultMeal(now)`. The grams are one unit's
    net weight, or all grams left when less than one unit is left.
  - **"Add to <Meal>"** runs one exclusive transaction that:
    - inserts a food log entry for today with copied per-100 g values (ADR-6)
      and `pantry_item_id` set;
    - inserts an `eaten` movement of −grams with `food_log_entry_id` set to
      that entry.
    - It then goes back to the item.
  - **More grams than are left** are refused before saving with "Only 465 g
    left. Use Adjust if there's more." The form keeps the values.
  - **Errors:**
    - A missing product or item shows the same not-found message as the
      item screen.
    - A failed save shows the AmountForm's existing error, and nothing is
      written.
- **Remove / Adjust sheet** (frame 4, a `Modal` like `DeleteEntrySheet`):
  - **Remove:**
    - Reason chips Shared, Discarded and Spilled, starting on Shared.
    - **Amount:** grams, empty at the start, from more than 0 up to the
      grams left.
    - **Result:** "465 → 265 g".
    - **Note:** "Not counted as eaten, so no calories are added."
    - The primary button reads "Remove 200 g". It inserts one movement of
      −grams with the chosen reason.
  - **Adjust to actual:**
    - No reason chips.
    - **Amount:** the actual grams there now, from 0 to 100,000, starting
      empty.
    - **Result:** "465 → 400 g".
    - **Note:** "Sets the amount to what's really there. The difference is
      saved as an adjustment, not as eaten."
    - The primary button reads "Set to 400 g". It inserts one `adjustment`
      movement of actual − current grams. When that difference is under
      0.5 g, it is disabled.
  - **Validation:** a bad amount shows inline errors ("Enter an amount",
    "Only 465 g left", "Enter 0 to 100,000 g"), and the primary button stays
    disabled.
  - **Saving:**
    - A `useRef` flag blocks double submits.
    - A failed save shows "Couldn't save. Nothing was changed." and keeps
      the values.
    - On success the sheet closes and the item reloads.
  - Cancel, the scrim and Back close the sheet without changes.
- **Removed and adjusted stock never writes a food log entry.**

## Out of scope

- 8c:
  - "In my pantry" on Add food.
  - Editing or deleting a log entry to restore its stock. Until 8c, a log
    entry deleted from the Log tab keeps its `eaten` movement.
- **Prototype gaps:**
  - Frame 2's "Eaten drained" and "Usual drained weight" fields, opened
    dates, drained grams and "eat within" (feature 9).
  - Batch titles with a date, the "unsettled" badge, and the batch settling
    note in frame 4 (feature 12).
  - The store name on "Bought" (Q-N2: not now).
  - Unit nouns ("cans"), because products have no unit name, so the app
    says "units".
- Moving an item to another location, editing its expiry from the detail
  screen, and deleting movements. A restock from + Add stock still updates
  the location and expiry.

## Build loop

Continuous Mode: the steps run in order without review pauses. Each step
keeps `npx tsc --noEmit` and `npx expo lint` passing, and `npx expo-doctor`
runs at the end. Checkpoint commits are disabled.

## Build steps

- [x] **1. Pantry data for detail, eating and removing.**
  - Add to `pantryRepo`:
    - `findItem(id)`: the item with its stock;
    - `listMovements(itemId)`: newest first, limit 50, with the linked
      entry's meal;
    - `logPortion(...)`;
    - `removeStock(...)`;
    - `adjustStock(...)`.
  - Add pure helpers to `pantryStock.ts`: the hero split, movement name,
    change text and tone, and the remove and adjust amount validation.
  - Extend `types/pantry.ts`.
  - **Done when:** typecheck and lint pass. A scratch run of the helpers
    shows "2 sealed 1 opened", "+3 units", "−50 g", "465 → 265 g", and
    the validation messages. `logPortion` writes the entry and the `eaten`
    movement in one transaction with `PRAGMA foreign_key_check`.
- [x] **2. Item screen (frame 2) and pressable rows.**
  - Add `app/pantry/[id].tsx` and `hooks/usePantryItem.ts`. Make `PantryRow`
    pressable. Register the screen in `app/_layout.tsx` with the header
    hidden.
  - **Done when:** typecheck and lint pass. The hero, fields, actions and
    history follow frame 2's rules, and loading, error, not-found and 0 g
    states exist.
- [x] **3. Log a portion.**
  - Add `app/pantry/portion/[itemId].tsx` with `AmountForm`.
  - **Done when:** typecheck and lint pass. Saving writes one entry and one
    `eaten` movement for today, too many grams are refused with the message,
    and it returns to the item.
- [x] **4. Remove / Adjust sheet (frame 4).**
  - Add `components/StockChangeSheet.tsx` and wire it to the item screen.
  - **Done when:** typecheck, lint and expo-doctor pass. Remove and Adjust
    write one movement each with the right reason and sign, validation and
    errors behave as specified, and no food log entry is written.

## Files / areas

All paths are under `apps/mobile/`.

- Changed: `src/modules/pantry/repositories/pantryRepo.ts`, `src/modules/pantry/services/pantryStock.ts`, `src/modules/pantry/types/pantry.ts`, `src/modules/pantry/components/PantryRow.tsx`, `src/app/(tabs)/pantry.tsx`, `src/app/_layout.tsx`
- New: `src/app/pantry/[id].tsx`, `src/app/pantry/portion/[itemId].tsx`, `src/modules/pantry/hooks/usePantryItem.ts`, `src/modules/pantry/hooks/useLogPortion.ts`, `src/modules/pantry/components/StockChangeSheet.tsx`

## Data / contracts

- **No migration.** It uses migration 7's tables and
  `food_log_entries.pantry_item_id`.
- **Movement signs:**

  | Action | `reason` | `delta_grams` | `delta_units` |
  |---|---|---|---|
  | Eat | `eaten` | −grams | null |
  | Remove | `shared`, `discarded` or `spilled` | −grams | null |
  | Adjust | `adjustment` | actual − current | null |

  Every movement has `occurred_at` and `created_at` / `updated_at` set to
  now.
- **`logPortion`:** one `withExclusiveTransactionAsync` that:
  - re-reads the item's grams left inside the transaction and throws
    `not_enough` when the grams are more than the grams left plus 0.5;
  - inserts the food log entry, with the same columns as
    `foodLogRepo.create` plus `pantry_item_id`;
  - inserts the `eaten` movement with `food_log_entry_id`;
  - runs `PRAGMA foreign_key_check` before commit.
- **`removeStock` and `adjustStock`** use the same transaction pattern. They
  re-read the grams left, so a remove can't take out more than is there, and
  an adjustment is computed from the stored ledger rather than a stale screen
  value.
- **The item** is a live `pantry_items` row (deleted_at null) joined to its
  product. If the product row is gone, the name falls back to "Unknown item",
  as in 8a. Log a portion then shows not-found, because there are no per-100 g
  values to copy.
- **Dates and times:** history meta is "Oct 20, 12:35": the local month, day
  and 24 h time, as in the prototype. Field dates use `formatDayShort`.

## Testing

No test runner is configured. The new `pantryStock.ts` helpers get a scratch
run. The UI and the transactions are checked by typecheck, lint, expo-doctor,
and reading the code against the prototype CSS. There is no on-device run.

## Notes for the AI

- Read `prototypes/pantry.html` frames 2 and 4 (markup and CSS) before the UI
  steps, and compare the code with them before ticking a step.
- Theme tokens only, `SymbolView` icons, `makeStyles`, comments only for the
  why, no em dashes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":13293,"specSha256":"ae58cef7bb7ea81b687ba540164184bc92bff510209d3f00603073b6bdf3e724","branch":"refs/heads/feature/pantry-item-detail-and-removing-stock","head":"b613716a3448e69fb27f9e97631eb9a104f00605","baseRef":"refs/heads/main","baseCommit":"0c24690b5c975178a035d990130cb78afd036d4e","sourceTree":"dc6f0fe057b884b9bd1d2cf63c8af7e4e259f0a4","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** b613716a3448e69fb27f9e97631eb9a104f00605
**Base commit:** 0c24690b5c975178a035d990130cb78afd036d4e
**Base ref:** main
**Spec hash:** ae58cef7bb7ea81b687ba540164184bc92bff510209d3f00603073b6bdf3e724
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-21T14:22:44+08:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T14:28:08+08:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `0c24690b5c975178a035d990130cb78afd036d4e..b613716a3448e69fb27f9e97631eb9a104f00605` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`: pass (target, base and spec hash match; only review.md was dirty)
- `npx tsc --noEmit` (apps/mobile): pass
- `npx expo lint` (apps/mobile): pass
- `npx expo-doctor` (apps/mobile): pass (21/21 checks)

### Evidence

- Reviewed the full 0c24690..b613716 delta: pantryRepo.ts, pantryStock.ts, types/pantry.ts, PantryRow.tsx, StockChangeSheet.tsx, usePantryItem.ts, useLogPortion.ts, app/pantry/[id].tsx, app/pantry/portion/[itemId].tsx, app/_layout.tsx, and the spec
- ADR-7: grams left come only from SUM(stock_movements.delta_grams) over live rows (STOCK_SELECT, gramsLeftIn); nothing is cached on the item
- ADR-8: removeStock and adjustStock insert one movement with a null food_log_entry_id and write no food_log_entries row; only logPortion writes an entry
- ADR-6: logPortion copies the product's per-100 g values and computed totals into the same columns as foodLogRepo.create, plus pantry_item_id
- logPortion, removeStock and adjustStock each run one withExclusiveTransactionAsync that re-reads the ledger, refuses more than left + 0.5 g (NotEnoughStockError), and runs PRAGMA foreign_key_check before commit; movement signs match the spec table
- Backup order (products, pantry_items, food_log_entries, stock_movements) already supports the new two-way links; Log tab deletes are soft, so the foreign keys hold
- All SQL is parameterized; the only interpolation is the HISTORY_LIMIT constant; the history query can use the partial ix_movements_item index
- The UI follows the prototypes/pantry.html frame 2 and 4 CSS (back link, h1.sm, card, hero, can and opened can, field, btn-row.three, section-label, row and move tones, seg, chips, input, result, note, sheet and grabber) using theme tokens

### Findings

- F-48 [P3] open: closing the Remove/Adjust sheet during a save hides a failed write
- F-49 [P2] unverified: the keyboard may cover the sheet's amount field and buttons
- F-50 [P3] open: location labels and month names are copied again

### Remaining risk

- No test runner is configured, so the pantryStock.ts helpers and the repository transactions have no automated tests
- No on-device or emulator run: layout, keyboard behaviour (F-49), the dashed opened unit on Android, and navigation (dismissTo, back after Log a portion) were checked only by reading the code
- Check was not required and was not run

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go. Add 3 units of a
155 g product to the pantry, then open **Pantry** and tap its row. Tap **Log a portion**,
keep 155 g and tap **Add to <meal>**. Then tap **Remove**, choose **Shared**, enter 100 and
tap **Remove 100 g**.

Expected:

The item screen matches `prototypes/pantry.html` frame 2: it starts at "3 sealed" with three
unit shapes, then shows "2 sealed" after the portion and "1 sealed 1 opened" (about 210 g)
after the removal. History lists Shared −100 g, Eaten · <meal> −155 g and Bought +3 units.
Today counts only the 155 g portion.

This proves:

Eating from the pantry logs the food and lowers stock together, and removing stock never adds calories.
