# Feature: Supplements

**From build-plan:** feature 10
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/supplements`

## Goal

Pantry step P3 (`1_docs/plan/09_pantry_inventory.md`; Epic K in
`1_docs/business_analyst/user_story/01_user_story.md` §3 and R8;
`02_workflow_diagrams.md` §5): a supplement (whey, creatine, pre-workout) is a
normal library product with a pantry item of kind `supplement`, counted in
grams. Logging a scoop takes the same grams out of the tub, and the pantry shows
how much is left and roughly how many days it will last.

Exit check from `09`: the whey tub goes down 30 g per scoop logged.

## Design reference

`prototypes/pantry.html` frame 1 (CSS lines 60-95), Supplements group:

- Group head `SUPPLEMENTS` with the locations on the right, like the other
  groups.
- Row: name in `md` 500; meta in `sm` `muted`: `2 kg container · 30 g/day`
  (daily use when known, else `9 g/scoop` when a scoop is set); right side the
  amount in grams (`1.24 kg`, `45 g`) in `md` 600 tabular, with the small
  `xs` `muted` line `~41 days`.
- A supplement under 7 days left shows the `over` badge `low · ~5 days` in the
  meta row instead of the small line, as the prototype's Wake row does.

There is no supplement frame for the item screen or Add stock; both reuse
frame 2 and frame 3 parts (hero, fields card, chips, result box) with grams
instead of unit shapes.

## In scope

- **Kind on Add stock:** a `Kind` chip row, `Grocery` | `Supplement`
  (radiogroup, 32 dp pills with a 48 dp touch height), defaulting to the
  existing item's kind or Grocery. Saving sets the item's kind. With
  Supplement, the labels read `Containers bought` and `Container size`, and the
  result box shows grams (`1.24 kg`) instead of units.
- **One item per product** across groceries and supplements: restocking adds a
  `bought` movement to the same item (8a rule), whatever its kind. The
  movement history keeps earlier containers (K5).
- **Supplement amounts in grams:** 1,000 g and up read as kg with up to two
  decimals (`1.24 kg`), below that as whole grams.
- **Daily use and days left** (K3): daily use = grams eaten from the item in the
  last 14 days ÷ the days in that window the item existed (from its first
  movement, 1 to 14). Days left = grams left ÷ daily use, rounded down. No
  eaten grams in the window means no estimate yet.
- **Low stock** (K4): under 7 days left shows the low badge on the row and the
  item screen.
- **Item screen for a supplement:** hero `1.24 kg left` (no unit shapes); note
  `About 41 days left at 30 g a day` or `Log it to see how long it lasts.`;
  fields `Container size`, `Scoop` (the product's serving grams or `Not set`),
  `Daily use` (`30 g a day`, or `Not enough history`), `Location`,
  `Expiry date`.
- **Logging a scoop:** the portion screen's default for a supplement is the
  product's serving grams (the scoop) when set and in stock, else what's left.
  Add food's "In my pantry" meta uses the gram amount for supplements.
- **Supplement units (grams, tabs, caps):** Add stock has a Unit chip row for supplements (Grams, Tabs, Caps); pantry stock, items screen, log portion, and stock change sheet format amounts and daily use with the chosen unit.
- Pantry list empty text for the Supplements filter points to Add stock.

## Out of scope

- Separate container rows per tub and an "active container" switch: one item
  per product keeps the 8a rule; history shows each bought container.
- A stored daily dose fallback (K3 "my set daily dose"): no field exists in the
  plans; the estimate waits for logged history.
- Low-stock warning on Today (T4): `today.html` has no slot for it (polish
  later, or feature 27 alongside expiry warnings).
- Price and cost per serving (K7, owner decision: no price tracking).
- **Prototype gaps:** the `shelf` location label in frame 1 (locations stay
  cupboard, fridge, freezer); the `tub` / `scoop` unit nouns beyond the text
  above.
- Open findings F-47 to F-55 are not part of this feature.

## Build loop

Continuous Mode: steps run in order without review pauses. Each step keeps
`npx tsc --noEmit` and `npx expo lint` passing, and `npx expo-doctor` runs at
the end. Checkpoint commits are disabled. No test runner is configured, so
pure logic stays in React-free service files.

## Build steps

- [x] 1. **One item per product, any kind.** Migration
  `009_pantry_product_unique.ts` adds a partial unique index on
  `pantry_items(product_id)` for kinds `packaged` and `supplement` (live rows).
  `stockForProduct` and `addStock` match either kind; `AddStockInput` takes
  `kind` and `addStock` writes it on create and restock. Done when typecheck
  and lint pass and no query in `pantryRepo` still filters on `kind = 'packaged'`
  alone.
- [x] 2. **Supplement math.** `pantryStock.ts` gains `weightText`,
  `dailyUseG`, `daysLeft`, `lowStock` and a supplement branch of
  `portionDefault`; `STOCK_SELECT` adds eaten grams in the last 14 days, the
  first movement time and the product's serving grams to `PantryStock`. Done
  when typecheck and lint pass.
- [x] 3. **Add stock kind choice.** The Kind chips, supplement labels and gram
  result on `pantry/add/[productId].tsx`. Done when typecheck and lint pass and
  the screen shows the chips above the units stepper with the existing item's
  kind selected.
- [x] 4. **Pantry list and Add food.** Supplement rows per the Design
  reference, the empty Supplements text, and Add food's pantry meta. Done when
  typecheck and lint pass and a supplement row shows grams, daily use and the
  low badge rules.
- [x] 5. **Item screen and portion default.** Supplement hero, note and fields
  on `pantry/[id].tsx`; the scoop default on the portion screen. Done when
  typecheck, lint and `npx expo-doctor` pass.
- [x] 6. **Supplement units (grams, tabs, caps).** Migration
  `010_supplement_units.ts` adds unit column to `pantry_items`. Add stock has
  Unit chips for supplements; pantry stock, items screen, log portion and stock
  change sheet format amounts and daily use with the selected unit. Done when
  typecheck and lint pass.

## Files / areas

- `apps/mobile/src/db/migrations/009_pantry_product_unique.ts`, `010_supplement_units.ts`, `index.ts`
- `apps/mobile/src/modules/pantry/`: `types/pantry.ts`,
  `services/pantryStock.ts`, `repositories/pantryRepo.ts`,
  `components/PantryRow.tsx`
- `apps/mobile/src/app/`: `(tabs)/pantry.tsx`, `pantry/[id].tsx`,
  `pantry/add/[productId].tsx`, `pantry/portion/[itemId].tsx`, `add/index.tsx`

## Data / contracts

- **Migration 009** (append only): `CREATE UNIQUE INDEX
  ux_pantry_stock_product ON pantry_items(product_id) WHERE kind IN
  ('packaged','supplement') AND deleted_at IS NULL`. Existing rows are all
  `packaged` with one live item per product (8a index), so it can't fail on
  real data. The 8a index stays.
- `pantry_items.kind` is `packaged` or `supplement` for product items; batches
  stay feature 12. Changing the kind on restock updates the row's `kind` and
  `updated_at`.
- Stock stays the ledger sum in grams (ADR-7); supplements use the same
  `eaten`, remove and adjust movements. No new movement reasons.
- **Window:** "last 14 days" means `occurred_at` within 14 × 24 h of now;
  eaten grams are `-SUM(delta_grams)` of live `eaten` movements in it.
- ADR-8 holds: buying a supplement never adds to the day.

## Testing

No test runner is configured (`AGENTS.md` Commands). Pure logic for future
tests: `weightText`, `dailyUseG`, `daysLeft`, `lowStock`, `portionDefault` in
`pantryStock.ts`. Evidence per step: `npx tsc --noEmit`, `npx expo lint`, and
`npx expo-doctor` at the end. Runtime behavior on the phone is not claimed.

## Notes for the AI

- Defaults taken where the plans are silent (record them in the final report):
  kind chosen on Add stock, one item per product, daily use from logged history
  only, 7-day low threshold (K4's example).
- No em dashes in code comments or text.

## Try it now

Open the app on your phone via Expo Go:
1. Tap the **Pantry** tab -> tap **+ Add stock**.
2. Pick a product from your library (e.g. Creatine or Amino Tabs).
3. On the **Add Stock** screen, tap **Supplement** under Kind.
4. Under **Unit**, choose **Grams**, **Tabs**, or **Caps**:
   - For **Tabs**: enter the count per bottle (e.g. 300) and number of bottles bought.
   - For **Grams**: enter container weight in grams (e.g. 300 g).
5. Tap **Add to pantry**.
6. On the Pantry list, under **Supplements**, verify the card displays with the proper unit (e.g. `300 tabs`).
7. Tap the card to open its detail view to check the hero (`300 tabs left`) and fields.
8. Tap **Log portion** (or remove/adjust) to verify deduction in tabs/caps.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8699,"specSha256":"14a2801e44c4fa1ad53e354abcf3beb628a87125147051d256357cefe8c2bf26","branch":"refs/heads/feature/supplements","head":"39f051d53140222adeffaed7bb98d7647ee7fb52","baseRef":"refs/heads/main","baseCommit":"b0b4a4245ae61ac3923f90da7520b5cad8f1a31d","sourceTree":"09199cb1617f7dae9344dc7ef9ab186f2a14c9d8","landing":"local-merge","absentOptional":[]} -->
