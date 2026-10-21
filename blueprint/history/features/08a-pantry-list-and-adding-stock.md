# Feature: Pantry list and adding stock

**From build-plan:** feature 8a
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/pantry-list-and-adding-stock`

## Goal

The first slice of the pantry (`1_docs/plan/09_pantry_inventory.md` P1, stories
L1, L2, L6). It covers the pantry tables, a Pantry tab that lists what's at
home, and recording a grocery buy ("How many did you buy?"). Core rule: buying
food never adds to today's calories. Only a food log entry does (ADR-8).

Owner decisions on Oct 21:
- Split feature 8 into 8a, 8b and 8c.
- Follow `pantry.html`'s five-tab bar: Today · Log · Pantry · Progress · More.
- Count stock in grams.
- Show all four filter chips now, even though Cooked and Supplements stay
  empty until features 12 and 10.

## Design reference

`prototypes/pantry.html` frame 1 ("Pantry list, grouped by kind") and frame 3
("After a scan: How many did you buy?"), plus its tab bar. Rules from its CSS:

- **Tab bar:** five equal tabs with a 22 dp icon over an `xs` label. The active
  tab is `accentText` 600, the others `muted`, on `surface` with a 1 dp top
  `border`. The order is Today, Log, Pantry, Progress, More.
- **App bar:** "Pantry" in `xl` 700 with a baseline-aligned "N items" sub in
  `sm` `muted`, and `space[2]` / `space[4]` / `space[3]` padding.
- **Search:** 44 dp, `radius.md`, `surface2`, `md` text with a `faint`
  placeholder, and `space[4]` padding.
- **Chips:** 32 dp pills on `surface2` in `sm` `muted`. The selected chip is
  `accentSoft` with `accentText` 600.
- **Group head:** an uppercase `xs` 600 `muted` section label (letter spacing
  0.06em). The locations sit on the right in `xs` `faint`.
- **Card:** `surface` with a 1 dp `border`, `radius.md`, and `space[3]` /
  `space[4]` padding.
- **Rows:**
  - At least 56 dp tall with `space[2]` vertical padding and a 1 dp bottom
    `border`; the last row has none.
  - The name is `md` 500.
  - The meta is `sm` `muted` with a 2 dp top margin, wrapping a row of small
    items and badges.
  - The amount sits on the right in `md` 600, with a small line under it in
    `xs` `muted`.
- **Badges:** `xs` 600 pills with 1 / 6 dp padding. `est` is `estimate` on
  `estimateSoft`, `over` is `over` on `overSoft`, and `ok` is `ok` on
  `surface2`.
- **"+ Add stock" button:** the same floating button style as Today's "Log
  food": 56 dp, radius 18, `accent`.
- **Frame 3 (add stock):**
  - A "✓ Found in your library" line in `ok` `sm` 600.
  - The product name in `lg` 700, with a meta line of net weight and "in
    your library".
  - A card with the label "Units bought" and a stepper: 48 dp round
    `surface2` − and + around the number in `num` 700.
  - A `result` box (`surface2`, `radius.md`, `space[3]` / `space[4]`, `sm`)
    reading "In stock after this" and the result in `lg` bold.
  - A Location segmented control (Cupboard / Fridge / Freezer): `surface2`
    track with 36 dp segments, and the selected one `surface` 600.
  - An "Expiry date · Optional" field row.
  - The note "Adding stock doesn't count toward today's calories. Only eating
    does." in `xs` `muted`.
  - A two-button row: "Library only" (ghost, with a 1 dp `border`) and "Add N
    to pantry" (primary).

## In scope

- **Tab bar:**
  - The tabs become Today, Log, Pantry (`kitchen`), Progress and More
    (`more_horiz`).
  - Products and Settings stay as routes under `(tabs)` with `href: null`, so
    they keep the tab bar but drop out of it.
  - The new More tab lists "Products" and "Settings" as list-card rows
    (`settings.html` item style) that open them.
  - Every existing `router.navigate("/settings")` or `router.navigate("/products")`
    keeps working.
- **Pantry tab** (`(tabs)/pantry.tsx`, native header hidden, app bar as above):
  - **Header:** "N items" counts pantry items with stock above 0.
  - **Search:** filters by product name, case-insensitive.
  - **Chips:** All, Cooked, Groceries, Supplements, starting on All.
  - **Groups** in the order Cooked, Groceries, Supplements, each shown only
    when it has items. The head shows the group label and the distinct
    locations of its items ("cupboard · fridge").
  - **Rows:**
    - The product name.
    - The meta: "155 g each". When `expires_at` is set, a badge reads "expires
      in N days", "expires today" or "expired". It uses `over` within 3 days
      or past, and `est` otherwise.
    - The amount: whole units ("3", or "2 + 1 open" when a part unit is
      left), with "≈ 465 g left" under it.
  - **Empty states:**
    - With no items: "Nothing in your pantry yet. Tap + Add stock after you
      shop." plus the button.
    - Cooked or Supplements chip: "Cooked batches arrive with recipes."
      or "Supplements arrive soon."
    - A search with no match: "Nothing matches 'x'".
  - Loading shows a spinner. An error shows "Couldn't load your pantry." with
    Retry.
  - Tapping a row has no effect in 8a (the detail screen comes in 8b). The
    rows aren't pressable, so nothing pretends to work.
- **"+ Add stock"** opens `/scan` with `for=pantry`. In pantry mode:
  - A known barcode replaces to `/pantry/add/[productId]`.
  - An unknown barcode goes to `/lookup/[barcode]?for=pantry`. Saving there
    replaces to `/pantry/add/[productId]` with `fresh=1`.
  - "Search products" opens `/add?for=pantry`. Picking a product opens
    `/pantry/add/[productId]`.
  - "Enter manually" opens `/product/new?then=pantry`. Saving replaces to
    `/pantry/add/[productId]` with `fresh=1`.
  - Without `for=pantry`, all of these keep their current logging behaviour.
- **Add stock screen** (`/pantry/add/[productId]`, frame 3):
  - **Top line:** "✓ Found in your library", or "✓ Saved to your library"
    when `fresh=1`.
  - The product name and meta.
  - **Units bought:** a stepper, 1-99, starting at 1.
  - **Net weight per unit:** prefilled from the product's `net_weight_g`, in
    grams, 1-100000. It's required. When the product has none, the field is
    empty with "Enter the weight on the pack". A typed value is saved back to
    the product on Add.
  - **"In stock after this":** the current grams plus units × net weight,
    shown as units and grams.
  - **Location:** starts at the item's current location, or Cupboard.
  - **Expiry date:** optional. It opens a date picker that allows future
    days, and Clear removes it.
  - **"Add N to pantry":**
    - In one exclusive transaction, it finds or creates the product's
      packaged pantry item and adds a `bought` movement (+N units, +N × net
      grams). It sets the location and, when chosen, the expiry, and saves a
      new net weight to the product.
    - Then it goes back to the Pantry tab.
  - **"Library only"** leaves without a pantry change, back to the Pantry
    tab.
  - **Errors:**
    - A missing or invalid net weight is shown inline, and the button stays
      disabled.
    - A failed save shows "Couldn't add to your pantry. Nothing was changed."
      and keeps the values.
- **Backup:** `pantry_items` and `stock_movements` are added to
  `BACKUP_TABLES` in FK order:
  - `pantry_items` after `products` and before `food_log_entries`, which now
    references it;
  - `stock_movements` after `food_log_entries`, because it references both.

  Restore inserts in this order and deletes in reverse. A restore of older
  backups migrates as before.

## Out of scope

- The item detail, eating from the pantry, remove and adjust (8b). "In my
  pantry" on Add food, and log edits restoring stock (8c).
- **Prototype gaps:**
  - The Cooked group and the batch rows (feature 12).
  - The Supplements group, scoops and days left (feature 10).
  - "eaten drained", "1 open" with opened dates and drained grams (feature 9).
  - The "unsettled" and "low" badges.
  - The store name on a buy (Q-N2: not now).
  - The unit noun ("/can"). Products have no unit name, so rows say "each".
  - Frame 3's camera strip, because the scanner stays its own screen.

## Build loop

Continuous Mode: steps run in order without review pauses. Each step keeps
`npx tsc --noEmit` and `npx expo lint` passing; `npx expo-doctor` runs at the
end. Checkpoint commits are disabled.

## Build steps

- [x] **1. Pantry data.**
  - Add migration `007_pantry`: the `pantry_items` and `stock_movements`
    tables, and a nullable `food_log_entries.pantry_item_id`.
  - Add `pantryRepo`: `listStock`, `stockForProduct(productId)` and
    `addStock(...)`.
  - Add a pure `pantryStock.ts` for unit and grams text, expiry badges and
    groups.
  - Add the backup tables.
  - **Done when:** typecheck and lint pass. A scratch run of `pantryStock.ts`
    shows "3", "2 + 1 open", "≈ 465 g left" and the expiry badge texts.
- [x] **2. Five-tab bar and More.**
  - Change `(tabs)/_layout.tsx`, add `(tabs)/more.tsx`, and hide Products and
    Settings from the bar.
  - **Done when:** typecheck and lint pass. The bar shows the five tabs in
    order with the pantry.html styles, and More opens Products and Settings.
- [x] **3. Pantry tab (frame 1).**
  - **Done when:** typecheck and lint pass. The list, chips, groups, rows,
    badges, empty states and "+ Add stock" follow frame 1's rules.
- [x] **4. Add stock (frame 3) and pantry mode in scan, lookup, add and
  product.**
  - **Done when:** typecheck, lint and expo-doctor pass. Each pantry-mode
    path reaches `/pantry/add/[productId]`. "Add N to pantry" records a
    `bought` movement in one transaction. The normal logging paths are
    unchanged.

## Files / areas

All paths are under `apps/mobile/`.

- New: `src/db/migrations/007_pantry.ts`; changed: `src/db/migrations/index.ts`, `src/modules/backup/repositories/backupRepo.ts`
- New: `src/modules/pantry/` (`repositories/pantryRepo.ts`, `services/pantryStock.ts`, `types/pantry.ts`, `hooks/usePantry.ts`, `hooks/useAddStock.ts`, `components/PantryRow.tsx`)
- Changed: `src/app/(tabs)/_layout.tsx`; new: `src/app/(tabs)/pantry.tsx`, `src/app/(tabs)/more.tsx`, `src/app/pantry/add/[productId].tsx`; changed: `src/app/_layout.tsx`
- Changed: `src/app/scan.tsx`, `src/app/lookup/[barcode].tsx`, `src/app/add/index.tsx`, `src/app/product/[id].tsx` (pantry mode)

## Data / contracts

- **Migration 7** (additive):

  ```sql
  CREATE TABLE pantry_items (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('packaged','supplement','batch')),
    product_id TEXT REFERENCES products(id), batch_id TEXT,
    status TEXT NOT NULL DEFAULT 'sealed'
      CHECK (status IN ('sealed','opened','active','finished','discarded','expired')),
    location TEXT NOT NULL DEFAULT 'cupboard' CHECK (location IN ('fridge','freezer','cupboard')),
    opened_at TEXT, expires_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
  );
  CREATE UNIQUE INDEX ux_pantry_packaged_product ON pantry_items(product_id)
    WHERE kind = 'packaged' AND deleted_at IS NULL;
  CREATE TABLE stock_movements (
    id TEXT PRIMARY KEY, pantry_item_id TEXT NOT NULL REFERENCES pantry_items(id),
    occurred_at TEXT NOT NULL, delta_units REAL, delta_grams REAL NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('bought','cooked','eaten','used_in_cooking',
      'shared','discarded','spilled','adjustment')),
    food_log_entry_id TEXT REFERENCES food_log_entries(id), batch_id TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
  );
  CREATE INDEX ix_movements_item ON stock_movements(pantry_item_id) WHERE deleted_at IS NULL;
  ALTER TABLE food_log_entries ADD COLUMN pantry_item_id TEXT REFERENCES pantry_items(id);
  ```

  `batch_id` has no foreign key until feature 12 creates `batches`.
- **Stock is only the ledger** (ADR-7):
  - grams left = SUM(`delta_grams`) of non-deleted movements, and units
    bought = SUM(`delta_units`).
  - Neither is stored on the item.
- **One packaged item per product.** A restock adds a `bought` movement to it,
  even after it reached 0.
- **Display:** for a net weight `w` and grams left `g > 0`:
  - Whole units = floor(g / w), and part = g − whole × w.
  - With part > 0.5 g the amount reads "whole + 1 open" (just "1 open" when
    whole is 0). Otherwise it reads whole.
  - Grams under it are rounded.
  - Items with g ≤ 0.5 are hidden from the list and the count.
- **Expiry days** = local days from today to `expires_at` (YYYY-MM-DD).
- **The buy transaction:** `withExclusiveTransactionAsync` does three things:
  - upserts the product's packaged item (location, expiry);
  - updates `products.net_weight_g` when it changed;
  - inserts a `bought` movement with `occurred_at` set to now.
  It runs `PRAGMA foreign_key_check` before commit, as in restore (expo-sqlite
  transactions use their own connection, where foreign keys are off).
- No food log entry is created when adding stock (ADR-8).

## Testing

No test runner is configured. `pantryStock.ts` gets a scratch run. The UI and
the transaction are checked by typecheck, lint, expo-doctor and reading the
code against the prototype CSS. There is no on-device run.

## Notes for the AI

- Read `prototypes/pantry.html` frames 1 and 3 (markup and CSS) before the UI
  steps, and compare the code with them before ticking a step.
- Theme tokens only, `SymbolView` icons, `makeStyles`, comments only for the
  why, no em dashes.

<!-- blueprint:completion {"schemaVersion":2,"specBytes":13243,"specSha256":"f07b308f17a93ddd688494d609f1fa7815bfb41b6e2e746023dd211bd8a4f4fc","branch":"refs/heads/feature/pantry-list-and-adding-stock","head":"6a428fbd00d99dfbfb6a7fa8398d4d1e0b505b8e","baseRef":"refs/heads/main","baseCommit":"e9afb88fe418b7b2c98ee4b2c94f648db37527c3","sourceTree":"e32aa531e30eb83e8b036ae92a233a897ed1a470","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 6a428fbd00d99dfbfb6a7fa8398d4d1e0b505b8e
**Base commit:** e9afb88fe418b7b2c98ee4b2c94f648db37527c3
**Base ref:** main
**Spec hash:** f07b308f17a93ddd688494d609f1fa7815bfb41b6e2e746023dd211bd8a4f4fc
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-21T10:30:00+08:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** antigravity
**Reviewer model:** unknown (runtime did not expose exact model)
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T13:12:00+08:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `npx tsc --noEmit`: pass
- `npx expo lint`: pass

### Evidence

- Migration `007_pantry.ts`: tables, indexes, and ALTER match the spec's SQL contract exactly, including the partial unique index on `product_id` for packaged items and the `foreign_key_check` PRAGMA guard.
- `pantryRepo.ts`: `STOCK_SELECT` correlated subquery sums `delta_grams` from live movements (ADR-7). All SQL uses positional `?` parameters. `addStock` runs in `withExclusiveTransactionAsync`, upserts the packaged item, conditionally updates `net_weight_g`, inserts a `bought` movement, and checks foreign keys before commit.
- `pantryStock.ts`: pure functions (no React/SQLite); `unitsText`, `gramsLeftText`, `expiryBadge`, `groupOf`, `locationsText` all match spec display rules.
- `pantry.tsx` (frame 1): app bar, search, four filter chips, groups in Cooked→Groceries→Supplements order, `PantryRow` per item, all four empty states, floating "Add stock" FAB. `paddingBottom` used on scroll content to avoid the F-02 margin issue.
- `pantry/add/[productId].tsx` (frame 3): all spec elements present — "✓ Found / Saved" line, stepper, net weight with inline validation, preview, location control, expiry with Clear, ADR-8 note, two-button row.
- `scan.tsx`: pantry mode dispatches through all branches (known product, unknown barcode, search products, enter manually). Non-pantry paths unchanged.
- `lookup/[barcode].tsx`, `add/index.tsx`, `product/[id].tsx`: `for=pantry` / `then=pantry` threaded correctly; redirects to `/pantry/add/[productId]`.
- `(tabs)/_layout.tsx`: five tabs in spec order; Products and Settings use `href: null`.
- `more.tsx`: Products and Settings as list-card rows with `›` chevron.
- `backupRepo.ts`: `pantry_items` and `stock_movements` in correct FK insertion order.

### Findings

- None

### Remaining risk

- No test runner configured; pantry transaction logic not covered by automated unit tests.
- No on-device smoke test; UI layout and date picker edge cases unverified at device level.
