# Feature: Today screen to prototype

**From build-plan:** feature 30a
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/today-screen-to-prototype`

## Goal

Rebuild the Today tab to match `prototypes/today.html`. Today was built
(features 3 and 6) before the prototypes became the build contract, and the
owner found it looks different on the phone.

Owner decisions on Oct 21:
- Do Today and Log first, before feature 13. Feature 13 is parked on its branch.
- Install `react-native-svg` for the calorie ring.
- Follow the prototype: "Log weight" and the Favorites chips leave Today.
  "+ Log weight" stays on Progress, and favorites still sort first in search.
- Use "Snacks" as the meal label everywhere.

## Design reference

`prototypes/today.html`. Frame 1 is "Mid-day, dinner not logged" and frame 2
is "Quick-add sheet (tap 1 of 3)". Rules from its CSS:

- **App bar** (replaces the tab's native header):
  - "Today" in `xl` 700 with -0.02em letter spacing. The date ("Tue,
    Oct 20") sits on the same baseline in `sm` `muted`, right-aligned.
  - Padding is `space[2]` top, `space[4]` sides and `space[3]` bottom.
- **Content:** `space[4]` side and bottom padding with a `space[3]` gap between
  cards. Cards are `surface` with a 1 dp `border`, `radius.md` and `space[4]`
  padding.
- **Summary card:**
  - **Ring:** 128 dp, track `track`, fill `accent`, stroke 12 on an r=54
    circle, round cap, starting at the top. The centre number is `num` (34)
    700 in `ok`, with "kcal left" in `xs` `muted` under it.
  - **Stats** sit to the right with `space[4]` between, as rows with
    `space[2]` gaps: "Eaten", "Goal", "Remaining" (value in `ok`) and "Burned"
    with an "est." badge and "—". Each row is `sm` `muted`, with the value in
    `text` 600 on the right.
  - **Macros:** three columns with a `space[3]` gap, below a 1 dp top border,
    with `space[4]` margin and padding. Each shows its name (`xs` `muted`),
    the value in `sm` 600 with " / target g" in `faint`, then a 4 dp bar in
    `track` filled with `protein`, `carbs` or `fat`.
- **Meal cards:**
  - At least 64 dp tall, with `space[3]` vertical and `space[4]` horizontal
    padding.
  - Title in `md` 600. Below it, the foods in `sm` `muted` on one line,
    cut off with "…".
  - kcal in `md` 600 with " kcal" in `xs` `muted`.
  - An empty meal shows "Nothing logged yet" in `faint` and a "+ Add" pill:
    36 dp, a 1 dp `border`, `accentText` `sm` 600.
- **Log food button:**
  - Floats at the bottom right, `space[4]` from the right edge and from the
    tab bar.
  - 56 dp tall, radius 18, `space[5]` horizontal padding, `accent` fill.
  - A 22 dp `add` icon and "Log food" in `accentInk` `md` 700, with a
    shadow.
- **Quick-add sheet:**
  - The scrim is `scrim`. The sheet is `surface` with `radius.lg` top
    corners, a 1 dp top `border`, and padding of `space[2]` top, `space[4]`
    sides and `space[5]` bottom, with a `space[3]` gap.
  - It has a grabber, then "Add to" in `lg` 700.
  - **Meal chips:** 32 dp tall, `surface2` in `sm` `muted`. The selected chip
    is `accentSoft` with `accentText` 600.
  - **Actions:** a two-column grid with a `space[2]` gap. Each action is `tap`
    tall with `radius.md`, `surface2` and `sm` 600 text, plus a 20 dp icon:
    - "Scan barcode": primary, `accent` with `accentInk`
    - "Search library"
    - "Type or paste a meal list": spans both columns
  - **"RECENT":** a section label in `xs` 600 uppercase `muted`.
  - **Recent rows:** at least 56 dp tall, with a 1 dp `border` between rows.
    The name is `md` 500 and the meta (`sm` `muted`) reads "Brand · 170 g ·
    97 kcal". A 36 dp round `accentSoft` "+" in `accentText` `lg` 600 sits on
    the right.

## In scope

- Hide the native header for the Today tab and render the app bar above.
- **Summary card:**
  - Eaten is the day's kcal and Goal is the calorie goal. Remaining is goal
    minus eaten. Burned shows "—", because no burn data exists (estimate
    label as in the prototype).
  - The ring fill is eaten ÷ goal, capped at 100%.
  - **Over the goal:** the ring fills in `over`. The centre shows "x kcal
    over" in `over`, and the stat row reads "Over" with an `over` value.
  - **No goal:** the ring stays empty and the centre shows eaten with "kcal
    eaten". The Goal row shows a "Set goal" link to Settings.
  - **Macros:** the day's protein, carbs and fat against the targets from
    the calorie goal (30 / 40 / 30 split, `macroSplit`). With no goal it shows
    only the eaten grams, and the bars stay empty.
- **Meal cards** for Breakfast, Lunch, Dinner and Snacks:
  - A card with food lists its product names in log order, joined by ", ",
    with its kcal. Tapping it opens the Log tab.
  - An empty card shows "Nothing logged yet" and "+ Add". "+ Add" opens
    `/add` with that meal and today.
- **Log food** opens the quick-add sheet:
  - The meal chips start at the time-of-day meal (`defaultMeal`).
  - "Scan barcode" opens `/scan`.
  - "Search library" opens `/add` with the chosen meal.
  - "Type or paste a meal list" opens `/paste-log` for today.
  - **RECENT:** up to 4 products logged in the last 7 days, newest first.
    "+" or a tap on the row opens `/add/[productId]` with the chosen meal.
  - With nothing recent it shows "Foods you log appear here."
  - A load error shows "Couldn't load recent foods." with Retry.
  - The scrim, Android back and the grabber area close the sheet.
- **Removed from Today:** the Scan button, the "Log weight" button, the
  "Type or paste" button (now in the sheet), and the Recent and Favorites
  chips.
- `MEAL_LABELS.snack` becomes "Snacks", which changes the label everywhere.
- The loading and error states stay: the spinner, and "Couldn't load today."
  with Retry.

## Out of scope

- **Prototype gaps** (data from later features):
  - Burned calories, which need workouts (19) or scale sync (22). The row
    shows "—".
  - Saved macro targets (story C5). The targets are derived from the calorie
    goal only.
  - Serving units in recent meta ("1 bar"). Grams are shown.
- The Log tab (30b), and the add, scan and paste screens themselves.
- The tab bar icons and labels. They already follow the prototype's four-tab
  layout, plus Progress from feature 11.

## Build loop

Continuous Mode: steps run in order without review pauses. Each step keeps
`npx tsc --noEmit` and `npx expo lint` passing; `npx expo-doctor` runs at the
end. Checkpoint commits are disabled.

## Build steps

- [x] **1. Summary card.**
  - Add `react-native-svg` (done with `npx expo install`).
  - Add `src/modules/nutrition/components/TodaySummary.tsx` with the ring,
    the stats and the macro bars.
  - Add `formatDayShort` ("Tue, Oct 20") to `mealTime.ts`, and change
    `MEAL_LABELS.snack` to "Snacks".
  - **Done when:** typecheck and lint pass. The card's ring size, stroke,
    colours, stat rows and macro columns follow frame 1's rules above, for the
    under, over and no-goal states.
- [x] **2. App bar and meal cards.**
  - Rebuild `src/app/(tabs)/index.tsx` with the app bar, the summary card and
    `MealCard` rows (foods, kcal, empty "+ Add").
  - Remove the old buttons and `QuickAdd`/`CalorieSummary`.
  - **Done when:** typecheck and lint pass. The layout order and the card
    styles follow frame 1.
- [x] **3. Log food button and quick-add sheet.**
  - Add `src/modules/nutrition/components/QuickAddSheet.tsx` and the
    floating button.
  - Trim `useQuickAdd` to recent products with their last grams and kcal.
    Remove `productRepo.favorites` if nothing else uses it.
  - **Done when:** typecheck, lint and expo-doctor pass. The sheet follows
    frame 2: chips, the three actions in two columns with the wide one, and
    the RECENT rows with "+". Every action opens its screen with the chosen
    meal.
- [x] **4. Review repairs (F-20, F-21).**
  - Scan barcode now passes the chosen meal to `/scan`, which forwards it to
    the amount form.
  - The Burned "est." badge is a `View` pill (1 / 6 dp padding, pill radius),
    as in the prototype.
  - **Done when:** typecheck, lint and expo-doctor pass, and F-20 and F-21
    are marked `fixed` for re-review.

## Files / areas

All paths are under `apps/mobile/`.

- Changed: `package.json`, `package-lock.json` (`react-native-svg` 15.15.4, approved by the owner)
- Changed: `src/app/(tabs)/index.tsx`, `src/app/(tabs)/_layout.tsx` (Today `headerShown: false`)
- New: `src/modules/nutrition/components/TodaySummary.tsx`, `MealCard.tsx`, `QuickAddSheet.tsx`
- Removed: `src/modules/nutrition/components/CalorieSummary.tsx`, `QuickAdd.tsx`
- Changed: `src/modules/nutrition/hooks/useQuickAdd.ts`, `src/modules/nutrition/repositories/productRepo.ts`, `src/modules/nutrition/services/mealTime.ts`

## Data / contracts

- No schema change.
- **Recent with last grams:** this is the existing recents query (feature 6)
  plus each product's newest non-deleted `grams`. The kcal in the meta is
  `forGrams(product, grams)`. The list is limited to 4.
- **Macro targets:** feature 13's `macroSplit` isn't on `main` yet, so a small
  pure `macroTargets(kcal)` in `nutritionCalc.ts` holds the same 30 / 40 / 30
  at 4 / 4 / 9 rule. When feature 13 is rebased, its results screen switches
  to this helper so there's one rule.
- Ring maths: circumference 2π·54 ≈ 339.3, and dash = fraction × 339.3.

## Testing

No test runner is configured. `macroTargets` and `formatDayShort` are small
pure helpers covered by a scratch run. The UI is checked by typecheck, lint,
expo-doctor and reading each style against the CSS rules above.

## Notes for the AI

- Read `prototypes/today.html` (markup and CSS) before each UI step, and
  compare the code with it before ticking the step.
- Theme tokens only.
- Follow the existing patterns: `makeStyles`, focus reloads, `SymbolView`
  icons, comments only for the why, no em dashes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9876,"specSha256":"f9a3c5c189c6d9b04898c23a66192663ac72a00da90efd84d8512da0b899936a","branch":"refs/heads/feature/today-screen-to-prototype","head":"158111b087d804ca4a404749cb3e9f6e3ec3a4f9","baseRef":"refs/heads/main","baseCommit":"837de25b812a3c6887b42b2f9b80446862da4cee","sourceTree":"f695147e72c695fbc91f1330601645ea65e0ec9d","landing":"local-merge","absentOptional":[]} -->

## Findings

### 30a/F-04 [P3] closed - Today can show "0 kcal over" or "0 kcal left" at the goal boundary

**File:** apps/mobile/src/modules/nutrition/components/CalorieSummary.tsx:24
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** `over` is decided on unrounded totals (`eaten > goal`) while the headline rounds the difference. Logged kcal are scaled by grams, so fractional totals are normal: eating 2200.3 kcal against a 2200 goal shows "0 kcal over" in the over color with "Eaten 2,200" and "Goal 2,200" captions, which reads as a contradiction. This follows the spec's formulas, so it is a display polish item, not a contract break.
**Suggested fix:** Compare on the rounded values for the over/left decision and headline (for example `Math.round(eaten) > goal`), keeping the bar fraction unrounded. No current requirement is lost.
**Resolution:** Closed 2026-10-21 by independent review of feature 30a at 84ffd3c. `CalorieSummary.tsx` was deleted and its replacement `apps/mobile/src/modules/nutrition/components/TodaySummary.tsx:24` decides over on `Math.round(eaten) > goal`, with the ring fraction unrounded (:26). Checked by hand: 2200.4 against 2200 shows "0 kcal left" / Remaining 0 in `ok` (never "-0" or "0 kcal over"), and 2200.6 shows "1 kcal over". The original defect is gone and no new one was introduced.

### 30a/F-20 [P1] closed - Scan barcode in the quick-add sheet drops the chosen meal

**File:** apps/mobile/src/modules/nutrition/components/QuickAddSheet.tsx:109 (meal param read in apps/mobile/src/app/scan.tsx:18 and passed on at :38-41; fallback in apps/mobile/src/app/add/[productId].tsx:48)
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** Step 3's Done when says "Every action opens its screen with the chosen meal." The sheet passes `meal` to Search library and to the Recent rows, but Scan barcode calls `router.push("/scan")` with no params. The scanner already accepts a `meal` param and forwards it to `/add/[productId]`, so the gap is only in the sheet: at 13:00 a user who picks the "Dinner" chip and scans a known product lands on the amount form preset to Lunch (`defaultMeal(new Date())`), and one tap on Save logs it to the wrong meal. The sheet's primary action silently ignores the chip the user just chose.
**Suggested fix:** `router.push({ pathname: "/scan", params: { meal } })` in the Scan action (optionally also `day`, which `/add/[productId]` accepts, if scan.tsx is taught to forward it). No new machinery; no current requirement is lost.
**Resolution:** The Scan action now pushes `{ pathname: "/scan", params: { meal } }`; scan.tsx forwards it to the amount form. Day is not forwarded because the sheet only opens for today, which is also the add screen's default. Typecheck, lint and expo-doctor pass; awaiting re-review. Closed 2026-10-21 by independent review of feature 30a at 158111b: `QuickAddSheet.tsx:109` now pushes `{ pathname: "/scan", params: { meal } }`, and `scan.tsx:18` reads `meal` and forwards it to `/add/[productId]` (:38-41), where `isMealType` validates it (add/[productId].tsx:48). Every sheet action now opens its screen with the chosen chip. The original defect is gone and the repair introduced no new defect; the pre-existing scanner paths that still drop the meal downstream are tracked separately as F-22.

### 30a/F-21 [P3] closed - Burned "est." badge is a flat text highlight, not the prototype's pill

**File:** apps/mobile/src/modules/nutrition/components/TodaySummary.tsx:93 (style at :194)
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** `prototypes/today.html` styles `.est` as a pill: `padding: 1px 6px; border-radius: 999px; margin-left: var(--space-1)`. The code renders it as a nested `<Text>` with only `backgroundColor`, using spaces (" est. ") for padding. Nested Text on Android ignores padding and border radius, so the badge shows as a square-cornered highlighted run of text with a double space after "Burned", visibly different from frame 1. The spec asks for the "est." badge as in the prototype, but this is a small visual drift, not a behavior break.
**Suggested fix:** Render the label as a row `View` holding "Burned" and a small `View` badge (`paddingHorizontal: 6`, `paddingVertical: 1`, `borderRadius: radius.pill`, `marginLeft: space[1]`, `backgroundColor: colors.estimateSoft`) wrapping the "est." Text. No new dependency; no current requirement is lost.
**Resolution:** "Burned" and the badge are now a row `View` with a `space[1]` gap; the badge is a `View` with 1/6 dp padding, pill radius and `estimateSoft`, holding the `estimate` "est." text. Awaiting re-review. Closed 2026-10-21 by independent review of feature 30a at 158111b: `TodaySummary.tsx:93-98` renders "Burned" and a `View` badge in a row with a `space[1]` gap (prototype `margin-left: var(--space-1)`), and the badge style at :200-201 is `paddingVertical: 1`, `paddingHorizontal: 6`, `radius.pill`, `estimateSoft`, with `xs` 600 `estimate` text, matching `prototypes/today.html:43`. The original defect is gone and no new one was introduced.

## Independent review

**Status:** passed
**Target commit:** 158111b087d804ca4a404749cb3e9f6e3ec3a4f9
**Base commit:** 837de25b812a3c6887b42b2f9b80446862da4cee
**Base ref:** main
**Spec hash:** f9a3c5c189c6d9b04898c23a66192663ac72a00da90efd84d8512da0b899936a
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-21T02:45:00+08:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T03:30:00+08:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `837de25b812a3c6887b42b2f9b80446862da4cee..158111b087d804ca4a404749cb3e9f6e3ec3a4f9` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`: pass (HEAD = target, merge base = base, spec hash matches, only review.md and findings.md differ)
- `npx tsc --noEmit` (apps/mobile): pass (router.d.ts not regenerated)
- `npx expo lint` (apps/mobile): pass
- `npx expo-doctor` (apps/mobile): pass, 21/21 checks
- Test command: unavailable (no test runner configured)

### Evidence

- Whole delta `837de25..158111b` read: `(tabs)/index.tsx`, `(tabs)/_layout.tsx`, `TodaySummary.tsx`, `MealCard.tsx`, `QuickAddSheet.tsx`, `useQuickAdd.ts`, `productRepo.ts`, `mealTime.ts`, `nutritionCalc.ts`, `package.json`; deleted `CalorieSummary.tsx`/`QuickAdd.tsx` have no remaining references (typecheck). Plan/overview and prototype-only commits read as context.
- Compared every component with `prototypes/today.html` frames 1 and 2 (CSS lines 21-83) and the spec's Design reference: app bar (xl 700, -0.5 dp ~ -0.02em of 28, sm muted date, baseline, 8/16/12 padding), content (16 sides/bottom, 12 gap), card (surface, 1 dp border, radius.md, 16 padding), ring (128, r 54, stroke 12, track/accent, round cap, -90deg, num 34 700 ok, xs muted label with space[1]), stats (flex 1, gap 8, sm muted label, sm 600 text value, Remaining ok, Burned margin-top 4 with est pill), macros (3 columns, gap 12, 1 dp top border, 16 margin and padding, xs muted name, sm 600 value with faint 400 target, 4 dp track bar radius 2), meal cards (min 64, 12/16 padding, md 600 title, one-line sm muted foods, md 600 kcal with xs muted unit, faint empty text, 36 dp pill + Add with border and accentText sm 600), FAB (16 from right and tab bar, 56 tall, radius 18, 24 padding, accent, 22 dp add icon, accentInk md 700, elevation), sheet (scrim, surface, radius.lg top, 1 dp top border, 8/16/24 padding, 12 gap, 36x4 faint grabber, lg 700 "Add to"), chips (32, surface2 sm muted, on accentSoft accentText 600), actions (two equal columns with gap 8, tap height, radius.md, surface2 sm 600, 20 dp icon, primary accent/accentInk, wide spans), RECENT label (xs 600 uppercase muted), recent rows (min 56, 1 dp divider, md 500 name, sm muted "Brand · g · kcal", 36 round accentSoft + in accentText lg 600). No layout, size, token or copy mismatch found.
- States: over decided on `Math.round(eaten) > goal` with `over` ring, "kcal over" centre and "Over" row; no goal leaves the ring empty, shows "kcal eaten" and a "Set goal" link to Settings, and macros show grams only with empty bars; loading spinner and "Couldn't load today." with Retry kept; sheet loading, empty ("Foods you log appear here.") and error ("Couldn't load recent foods." with Retry) states present; scrim, Android back and grabber close it.
- Navigation: meal card opens `/log`; + Add pushes `/add` with meal and today; Scan passes `meal` to `/scan`; Search library passes meal and day to `/add`; Type or paste opens `/paste-log` with day; recent rows open `/add/[productId]` with product, meal and day; `add/[productId].tsx:48` validates `meal`.
- Data: `recentlyLogged` keeps the parameterised 7-day distinct-products query, adds a correlated newest-`grams` subquery backed by `ix_log_product_recent`, `grams` is `NOT NULL`, limit 4 bound as a parameter; no schema change, no SQL injection surface, no new trust boundary.
- "Snacks": `MEAL_LABELS.snack` change reaches AmountForm, MealSection, PasteLogPreview and `textFromEntries`; the paste parser already maps both "snack" and "snacks" headings, so Copy yesterday still round-trips.
- F-20 and F-21 re-examined against the repaired code and closed; F-22 recorded.

### Findings

- F-20 [P1] closed: Scan barcode now passes the chosen meal.
- F-21 [P3] closed: Burned "est." badge is a View pill matching the prototype.
- F-22 [P3] open: unknown-barcode and "Search products" paths from the scanner still drop the chosen meal (scan/add screens are out of scope; not blocking).
- No P0 or P1 finding is open or fixed.

### Remaining risk

- No test runner is configured, so `macroTargets` and `formatDayShort` have no automated tests (spec relies on a scratch run).
- No on-device or screenshot evidence was inspected in this review; visual fidelity was judged from code against the prototype CSS. Unverified on a phone: `alignItems: "baseline"` in the app bar, the rotated `Svg` ring start point, the FAB elevation shadow, the slide animation also moving the scrim, and the sheet's bottom inset inside the edge-to-edge `Modal`.
- Check was not required and was not run.
- Day rollover while Today stays open uses the render-time `dayKey(new Date())`, the same pattern as F-03.

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go on the
**Today** tab. Open `prototypes/today.html` in a browser next to it.

Expected:

Today matches frame 1: "Today" with the date on the right, a card with the
calorie ring ("kcal left" in green), Eaten / Goal / Remaining / Burned "est." —,
macro bars with "/ target g", then Breakfast, Lunch, Dinner and Snacks cards
(foods and kcal, or "Nothing logged yet" with "+ Add"). Tap **Log food**: the
sheet matches frame 2 with the meal chips, Scan barcode, Search library, Type or
paste a meal list, and RECENT foods with "+". Pick **Dinner**, tap a recent
food, and the amount form opens set to Dinner.

This proves:

The Today tab follows its prototype, and every quick-add path keeps the meal
you picked.
