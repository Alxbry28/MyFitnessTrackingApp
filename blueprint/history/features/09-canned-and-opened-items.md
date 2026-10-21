# Feature: Canned and opened items

**From build-plan:** feature 9
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/canned-and-opened-items`

## Goal

Pantry step P2 (`1_docs/plan/09_pantry_inventory.md`, stories L3 and L5 in
`1_docs/business_analyst/user_story/04_recipes_and_pantry.md` §5 and §8):

- A product can be marked **"I eat this drained"** with drained values per
  100 g and a usual drained weight per unit, so canned tuna counts the fish,
  not the oil or brine (owner decision D4).
- Logging "1 can, drained" from the pantry is one tap: usual drained grams ×
  drained values, and stock goes down by one whole unit.
- Eating part of a unit leaves an **opened** item with grams left and an
  opened date, and the opened unit is used before a sealed one.

## Design reference

`prototypes/pantry.html` with its CSS (lines 60-95):

- **Frame 1 (list row):** the grocery row's meta reads
  `155 g each · eaten drained`; the right side keeps `2 + 1 open` and, for a
  drained product with an opened unit, the small line reads
  `≈ 60 g drained left` (drained grams in the opened unit). A drained product
  with no opened unit shows `≈ N g drained` for all its units.
- **Frame 2 (item detail):**
  - Hero card: `2 sealed 1 opened` and the unit shapes stay as built in 8b.
    The note under them reads `Opened Oct 20 · about 60 g drained left` for a
    drained product, `Opened Oct 20 · about 60 g left` otherwise, followed by
    the existing expiry badge text.
  - Fields card rows, each 48 dp with a 1 dp `border` divider:
    `Net weight per unit`, then for a drained product `Eaten drained` →
    `Yes · drained values` and `Usual drained weight` → `110 g` with an
    `est` badge `avg of N` when N ≥ 2, then `Location`, `Expiry date`.
  - History: a whole-unit eaten movement shows `−1 unit` (unit noun gap from
    8b stays).
- **Frame 3 (add stock):** the sub line under the name adds `eaten drained`
  for a drained product; the result line keeps `N sealed + 1 opened` wording
  from `unitsText`.
- **No frame** covers the product form's drained section or the portion
  screen's whole/part choice. They reuse the existing ProductForm field style
  (`xs` 600 `muted` label, `tap` tall `surface2` input, `radius.sm`) and the
  32 dp `surface2` pill chips used on Add stock, with a 48 dp touch height.

## In scope

- **Product drained fields** (migration 008, additive): `eaten_drained`
  (0/1, default 0), `drained_kcal_per_100g`, `drained_protein_per_100g`,
  `drained_carbs_per_100g`, `drained_fat_per_100g`, `usual_drained_g` (all
  nullable reals).
- **Product form:** an "Eaten drained" section with a switch. When on:
  reference chips **Tuna in oil** and **Tuna in water** that fill the drained
  values (generic USDA references, editable), the four drained value fields,
  and the usual drained weight. A note says the reference values are generic
  estimates to check against the can.
- **Validation** when eaten drained is on: net weight required; usual drained
  weight required, more than 0 and at most the net weight; drained kcal
  required 0-900; drained macros optional 0-100. When off, drained fields are
  kept as typed but not required, and are not used.
- **Logging a drained product anywhere** (Add food, quick add, recents, paste
  log, pantry) copies the drained per-100 g values onto the entry (ADR-6).
  A product not marked drained logs its label values as before.
- **Pantry portion for a drained product:** two chips, **Whole unit** and
  **Part of a unit**.
  - Whole unit: grams default to the usual drained weight; the entry uses the
    typed (weighed) drained grams; stock goes down by exactly one net unit
    (`delta_units = -1`). Disabled when no sealed unit is left.
  - Part: grams default to the opened unit's drained grams left, or the usual
    drained weight when nothing is open. Stock goes down by the net
    equivalent `drained × net ÷ usual drained`. Refused above the drained
    equivalent of all stock left.
  - The default chip is Part when a unit is opened (opened first), otherwise
    Whole unit.
  - A product not eaten drained keeps the plain amount form, and its default
    grams are the opened unit's grams when one is open (opened first), else
    one net unit as before.
  - After a whole-unit log, `usual_drained_g` becomes the mean of the drained
    grams of the product's last 5 live whole-unit pantry entries (1 decimal).
- **Opened state for every packaged item:** after any ledger change, an item
  whose grams leave a part unit gets `status = 'opened'` and `opened_at` =
  today's local `YYYY-MM-DD` when the part is new; with no part unit it goes
  back to `status = 'sealed'`, `opened_at = NULL`. Restocking no longer resets
  an opened item to sealed.
- **Log entry edits** of pantry entries: a whole-unit entry's grams change
  without touching its movement (the unit was eaten whole); a part entry's
  movement scales by the same ratio it was logged with
  (`movement × newGrams ÷ oldGrams`), and the stock check uses that scaled
  extra. Non-drained entries keep their 1:1 behavior.
- Pantry list row, item detail and add stock text per the Design reference.

## Out of scope

- `label_basis` (as packed / per serving) and `track_in_pantry` from `09` §5:
  the form already stores per 100 g, and no current flow needs either field.
- Online or AI lookup of drained values (November, with the API).
- Recomputing the usual drained weight when a whole-unit entry is later
  edited or deleted.
- Converting Remove and Adjust to drained grams: those sheets stay in net
  grams, as built in 8b.
- **Prototype gaps:**
  - Frame 2's "eat within 2 days" freshness window: no freshness rule is
    decided (`04` P9, feature 27 expiry warnings).
  - Frame 2's history meta `opened 1 can` / `1 can drained` and unit nouns
    ("cans"): polish later, products have no unit noun.
  - Frame 2's store name on Bought (Q-N2: not now).
- Open findings F-47 to F-52 are not part of this feature.

## Build loop

Continuous Mode: steps run in order without review pauses. Each step keeps
`npx tsc --noEmit` and `npx expo lint` passing, and `npx expo-doctor` runs at
the end. Checkpoint commits are disabled. No test runner is configured, so
pure logic stays in React-free service files ready for tests.

## Build steps

- [x] 1. **Drained columns on products.** Add `src/db/migrations/008_drained.ts`
  (additive `ALTER TABLE products ADD COLUMN` for the six fields) and register
  it. Extend `Product` / `ProductInput`, `productRepo` row mapping, `create`
  and `update`. Done when typecheck and lint pass and the backup tables pick
  the new columns up through `SELECT *` / `PRAGMA table_info` with no backup
  code change.
- [x] 2. **Logged values seam.** Add `src/modules/nutrition/services/drained.ts`
  with `loggedPer100(product)` (drained values when `eatenDrained`, else label
  values) and the two USDA references. Use it in `foodLogRepo.create`,
  `pantryRepo.logPortion`, the Add food meta and the `add/[productId]`
  preview. Done when typecheck and lint pass and a non-drained product's code
  path is unchanged by inspection.
- [x] 3. **Product form drained section.** Extend `productSchema` (with a
  `superRefine` for the conditional rules), `productToForm` and
  `ProductForm` with the switch, reference chips, four drained fields and
  usual drained weight. Done when typecheck and lint pass and the form shows
  the section only when the switch is on, with errors on the matching field.
- [x] 4. **Opened state.** Add pure helpers in `pantryStock.ts`
  (`openedAfter(before, after, net, openedAt, today)`), and `syncOpened` in
  `pantryRepo` run at the end of every ledger transaction: `logPortion`,
  `removeStock`, `adjustStock`, `addStock` (which stops forcing `sealed`),
  and the pantry paths in `foodLogRepo` (update, delete, undo). Expose
  `openedAt` on `PantryStock`. Done when typecheck and lint pass and every
  `stock_movements` write in the repo is followed by `syncOpened` in the same
  transaction.
- [x] 5. **Drained portions and edits.** Add drained conversions
  (`drainedToNet`, `netToDrained`, opened-unit drained grams) to
  `pantryStock.ts`; `logPortion` takes `wholeUnit` and writes
  `delta_units = -1`, net grams and the usual drained update; the portion
  screen shows the Whole unit / Part chips for drained products (an optional
  `header` slot on `AmountForm`); `foodLogRepo.updateFromPantry` uses the
  whole-unit and ratio rules. Done when typecheck and lint pass and a drained
  whole-unit log, part log and part edit each write the contracted movement.
- [x] 6. **Pantry screens.** Update `PantryRow`, `pantry/[id].tsx` (hero note,
  fields, `−1 unit` history) and `pantry/add/[productId].tsx` sub line per
  frames 1-3. Done when typecheck, lint and `npx expo-doctor` pass and the
  screens match the Design reference text and order.

## Files / areas

- `apps/mobile/src/db/migrations/008_drained.ts`, `migrations/index.ts`
- `apps/mobile/src/modules/nutrition/`: `types/product.ts`,
  `repositories/productRepo.ts`, `repositories/foodLogRepo.ts`,
  `services/productSchema.ts`, `services/drained.ts` (new),
  `components/ProductForm.tsx`, `components/AmountForm.tsx`
- `apps/mobile/src/modules/pantry/`: `types/pantry.ts`,
  `services/pantryStock.ts`, `repositories/pantryRepo.ts`,
  `hooks/useLogPortion.ts`, `components/PantryRow.tsx`
- `apps/mobile/src/app/`: `add/index.tsx`, `add/[productId].tsx`,
  `pantry/[id].tsx`, `pantry/portion/[itemId].tsx`,
  `pantry/add/[productId].tsx`

## Data / contracts

- **Migration 008** (append only): six nullable columns on `products`;
  `eaten_drained INTEGER NOT NULL DEFAULT 0`. Existing rows read as not
  drained. Older backups restore through the existing migrate-in-memory path.
- **References** (USDA SR Legacy, drained solids, per 100 g):
  - Tuna in oil (light, 15119): 198 kcal, protein 29.13, carbs 0, fat 8.21
  - Tuna in water (light, 15121): 116 kcal, protein 25.51, carbs 0, fat 0.82
- **Ledger stays in net grams** (ADR-7). For a drained product:
  `net = drained × netWeightG ÷ usualDrainedG`, `drained = net × usualDrainedG
  ÷ netWeightG`. A whole-unit eaten movement is `delta_units = -1`,
  `delta_grams = -netWeightG`; a part movement has `delta_units = NULL`.
- **Entry copy:** `kcal_per_100g` etc. on the entry are the drained values
  when the product was drained at log time; `grams` are drained grams.
- **Opened:** `pantry_items.status` `opened` / `sealed` and `opened_at`
  (`YYYY-MM-DD`, local day) follow the part-unit rule after each ledger
  change; the new date is set only when a part unit appears or a new unit is
  broken into (sealed count dropped while a part remains).
- **Usual drained average:** mean of the last 5 live whole-unit eaten entries
  (`stock_movements.delta_units = -1`, reason `eaten`, entry not deleted) of
  that product, rounded to 0.1 g, written in the same transaction as the log.
  The detail badge count N uses the same query (capped at 5).
- No change to backup table lists; ADR-8 holds (no stock change adds macros).

## Testing

No test runner is configured (`AGENTS.md` Commands), so tests are not a gate.
Logic for future unit tests lives in React-free files: `drained.ts`
(`loggedPer100`) and `pantryStock.ts` (`drainedToNet`, `netToDrained`,
`openedAfter`, drained-left text). Evidence per step: `npx tsc --noEmit`,
`npx expo lint`, and `npx expo-doctor` at the end. Runtime behavior on the
phone is not claimed; a try guide covers it.

## Notes for the AI

- Every write that touches `stock_movements` and `food_log_entries` stays in
  one exclusive transaction with `checkForeignKeys` (existing pattern).
- `usual_drained_g` and `net_weight_g` can drift (Add stock edits net
  weight); guard divisions so a missing or zero value falls back to 1:1 net
  grams instead of NaN.
- No em dashes in code comments or text.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":11908,"specSha256":"c8b79fa3b64cdde6d09bc20193bf4e97d3abf13af5c079538cdca57aa537219e","branch":"refs/heads/feature/canned-and-opened-items","head":"db03ec52876f2619c573def6e976d02e589b3073","baseRef":"refs/heads/main","baseCommit":"258cc7960d9d7ef76d12af19446d914b82dc1cac","sourceTree":"383b73052ba6261fd812d1f9163901fd0147cc79","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** db03ec52876f2619c573def6e976d02e589b3073
**Base commit:** 258cc7960d9d7ef76d12af19446d914b82dc1cac
**Base ref:** main
**Spec hash:** c8b79fa3b64cdde6d09bc20193bf4e97d3abf13af5c079538cdca57aa537219e
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-21T15:05:33+08:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T15:12:00+08:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `<base>..<target>` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD`, `git merge-base main db03ec5`, SHA-256 of `blueprint/context/current-feature.md`, `git status --porcelain`: pass (HEAD, base and spec hash match; only `blueprint/context/review.md` differs)
- `npx tsc --noEmit` (apps/mobile): pass
- `npx expo lint` (apps/mobile): pass
- `npx expo-doctor` (apps/mobile): pass (21/21 checks)
- Test command: unavailable (no test runner configured)

### Evidence

- Full `258cc79..db03ec5` delta reviewed (20 app files plus the spec): migration 008, migrations index, product types/repo/schema/form, `drained.ts`, `foodLogRepo`, `pantryStock.ts`, `pantryRepo`, pantry hooks, PantryRow, Add food, add/[productId], pantry item, portion and add stock screens.
- Migration 008 is six `ALTER TABLE products ADD COLUMN` statements (one `NOT NULL DEFAULT 0` with a CHECK the default satisfies); the runner wraps each migration and `user_version` in one transaction. Additive and safe on existing rows.
- Ledger math: `stockGramsFor` takes exactly `netWeightG` for a whole unit and `drained x net / usual` for a part, falling back to 1:1 when either weight is missing or zero; the hook pre-check and `logPortion` use the same rule; whole units write `delta_units = -1`.
- `updateFromPantry`: whole-unit movements keep their grams; part movements scale by `newGrams / oldGrams`, the stock check uses the scaled extra, and non-drained entries stay 1:1.
- Every `stock_movements` write (`addStock`, `logPortion`, `removeStock`, `adjustStock`, `updateFromPantry`, `setDeletedWithPantry`) is followed by `syncOpened` and `checkForeignKeys` inside the same exclusive transaction; `addStock` no longer forces `sealed`.
- Every `food_log_entries` insert (`foodLogRepo.create`, `pantryRepo.logPortion`) copies `loggedPer100(product)`.
- Product schema: drained rules apply only when the switch is on (net weight required, drained kcal required 0-900, macros 0-100, usual drained more than 0 and at most net weight); output type is checked against `ProductInput` at compile time.
- Security: local-only data, parameterized SQL, the only interpolation is a numeric constant. Performance: two extra small queries per ledger write and one capped count per item load.
- `openedAfter` float behavior checked with a scratch Node simulation (outside the repo) of whole-unit logs after drained part logs.

### Findings

- F-53 [P3] open: opened date can reset to today on a whole-unit log (float noise) and misses a new unit broken by a part of one unit or more
- F-54 [P3] open: quick add, paste log and match sheet previews show label kcal for a drained product
- F-55 [P3] open: refused pantry entry edit reports net grams for a drained entry
- No P0 or P1 findings.

### Remaining risk

- No test runner is configured, so the pure ledger helpers (`drainedToNet`, `netToDrained`, `stockGramsFor`, `openedAfter`, `loggedPer100`, `productSchema`) have no automated tests.
- Check was not required and not run; runtime behavior on the phone (portion chips, form errors, opened note) is unverified.
- Usual drained average is not recomputed when a whole-unit entry is later edited or deleted (out of scope by the spec).

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go. Edit a canned
product with a 155 g net weight, turn on **I eat this drained**, tap **Tuna in oil**, set
**Usual drained weight g** to 110 and save. Add 3 of it to the pantry. Open it on the Pantry
tab, tap **Log a portion**, keep **Whole unit** (110 g) and tap **Add to Lunch**. Log a second
portion with **Part of a unit** at 50 g, then open **Log a portion** once more.

Expected:

The whole unit adds about 218 kcal to Lunch (110 g of the drained values, not the label's).
The pantry row then reads `155 g each · eaten drained` and `2`, and after the 50 g part
`1 + 1 open` with `≈ 60 g drained left`. The item screen shows `Opened <today> · about 60 g
drained left`, the **Eaten drained** and **Usual drained weight** rows, and `−1 unit` in
History. The third portion opens on **Part of a unit** with 60 g.

This proves:

Drained products log what is eaten, stock still counts whole cans, and an opened can is
tracked with its date and used first.
