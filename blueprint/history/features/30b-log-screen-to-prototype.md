# Feature: Log screen to prototype

**From build-plan:** feature 30b
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/log-screen-to-prototype`

## Goal

Rebuild the Log tab to match `prototypes/log.html`, and the Edit entry screen
to match the owner's `prototypes/entry-edit.html`. Both screens (features 2
and 7) were built before the prototypes became the build contract.

## Design reference

- **`prototypes/log.html`**, frame "Yesterday, over goal, one row swiped":
  - **Date nav** (replaces the tab's native header):
    - Padding is `space[2]` top and sides, `space[3]` bottom.
    - Two round `tap`-sized arrow buttons, `chevron_left` and
      `chevron_right` at 22 dp in `muted`.
    - The centre is the date as "Mon, Oct 19 ▾" in `lg` 700, with "Yesterday
      · tap for calendar" in `xs` `muted` under it.
  - **Content:** `space[4]` sides and bottom, with a `space[3]` gap. Cards are
    `surface` with a 1 dp `border` and `radius.md`.
  - **Total card:**
    - The top row has `space[3]` vertical and `space[4]` horizontal padding:
      "2,419" in `lg` 700 with " / 2,200 kcal" in `sm` `muted`, and a badge
      on the right.
    - The badge is `sm` 600 with `space[1]` / `space[3]` padding and a pill
      radius. Over shows "219 over" in `over` on `overSoft`.
    - A 4 dp bar on `track` has `space[4]` side margins and `space[3]` below
      it. Its first segment is `accent`, followed by an `over` segment for
      the part above the goal.
  - **Group cards:**
    - The head has `space[3]` top, `space[4]` sides and `space[1]` bottom
      padding, with items on the baseline: the name in `md` 600 and the kcal
      in `sm` `muted`.
    - Each row is at least 52 dp tall, with `space[2]` / `space[4]` padding
      and a 1 dp `border` between rows. It shows the name in `md`, the
      quantity ("60 g") in `sm` `muted`, and kcal in `md` 500.
    - Swiping a row left shows an 88 dp `over` "Delete" action with `bg`
      text in `sm` 700.
- **`prototypes/entry-edit.html`** frames 1-4:
  - **Header:**
    - 56 dp tall with `space[2]` padding.
    - A round `tap` back button (`arrow_back`, `muted`), the title "Edit
      entry" in `lg` 700, and a `delete` button in `over`.
  - **Content:** `space[4]` sides with a `space[4]` gap.
  - **Product:** the name in `lg` 600, with the meta "380 kcal per 100 g ·
    values copied when logged" in `sm` `muted` and `space[1]` above it.
  - **Labels:** `xs` 600 uppercase in `muted`, with `space[2]` below. "When"
    carries a "new" pill in `estimate` on `estimateSoft`.
  - **Meal chips:**
    - Four equal columns with a `space[2]` gap. Each chip is 40 dp tall with
      a pill radius, `surface2` and a 1 dp `border`, in `sm` `muted`.
    - The selected chip is `accentSoft` with an `accent` border and
      `accentText` 600.
  - **When:**
    - A date field and a 120 dp time field, each with a `calendar_today` or
      `schedule` 18 dp icon.
    - A field is at least `tap` tall, `radius.sm`, `surface2`, with a 1 dp
      `border`, `space[3]` padding and `md` text. A changed field gets an
      `accent` border.
    - The hint "Moves from Mon, Oct 19 to today" sits in `sm` `accentText`.
  - **Amount:**
    - The same field style with "g" as the unit.
    - When focused it has an `accent` border and a 3 dp `accentSoft` ring.
      On error it has an `over` border and a 3 dp `overSoft` ring, with the
      hint in `over`.
    - Below it, a chip row (36 dp, `flex: 1`): "−10", "+10", then the serving
      grams and the original grams.
  - **Preview card:**
    - `space[3]` / `space[4]` padding.
    - kcal in `xl` 700 with " kcal" in `sm` `muted`, and a delta pill on the
      right ("+76 kcal", `sm` 600, `accentText` on `accentSoft`).
    - "Was 228 kcal at 60 g" in `sm` `muted`.
    - Three macro columns: grams in `md` 600 `text`, the name in `sm`
      `muted`, and a 3 dp colour line.
    - With no valid amount the values show "—" in `faint`, and the lines use
      `track`.
  - **Footer:**
    - `space[3]` / `space[4]` / `space[4]` padding on `surface`, with a 1 dp
      top `border`.
    - "Save changes" is a full-width primary button. Disabled, it shows in
      `surface2` with `faint` text.
  - **Delete sheet (frame 3):**
    - A scrim, then `surface` with `radius.lg` top corners, `space[3]` /
      `space[4]` / `space[5]` padding and a `space[3]` gap, and a `border`
      grabber.
    - "Delete this entry?" in `lg` 700.
    - A summary box (`surface2`, `radius.sm`, `space[3]`) with the name, "Snacks
      · Mon, Oct 19 · 30 g", and kcal in bold.
    - The text "Your day total drops to 2,249 kcal. The product stays in your
      library." in `md` `muted`.
    - "Delete entry" (`over` fill, `bg` text 700) and "Cancel" (`surface2`
      600).
  - **Discard dialog (frame 4):**
    - A centred card with `space[5]` side margins, a 1 dp `border`,
      `radius.lg` and `space[5]` padding.
    - "Discard changes?" in `lg` 700, then "You changed this entry but didn't
      save:" in `md` `muted`.
    - A bulleted list of the changes in `sm`, with `accentText` bullets.
    - Right-aligned buttons: "Discard" in `over`, and "Keep editing" (`accent`
      fill).

## In scope

- **Log tab:**
  - Hide its native header and render the date nav.
  - The previous and next arrows work as today. Next is disabled on today.
  - Tapping the date opens the existing date picker (the calendar screen,
    `history.html`, isn't built).
  - The sub line is "Today", "Yesterday" or the weekday, followed by " · tap
    for calendar".
- **Total card:**
  - Day kcal / goal.
  - **Badge:**
    - Over: "x over" in `over` on `overSoft`.
    - Under: "x left" in `ok` on `surface2`.
    - Hidden with no goal.
  - **Bar:**
    - Under: `accent` at eaten ÷ goal.
    - Over: `accent` for goal ÷ eaten, then `over` for the rest.
    - Hidden with no goal.
  - The over decision uses `Math.round(eaten) > goal`, as on Today.
- **Group cards:**
  - A card shows only for meals with entries, as in the prototype. The head
    and rows are as above.
  - Tapping a row opens Edit entry.
  - Swiping left reveals "Delete". Tapping Delete removes the entry and shows
    the existing Undo snackbar.
  - Long press and the "Delete" accessibility action keep working.
- **Additions beyond `log.html`** (needed to keep adding to past days, which
  shipped in features 2, 7 and 29):
  - A "+ Add" link (`accentText` `sm` 600) in each group head. It opens
    `/add` with that meal and day.
  - A last card listing the meals with nothing logged as "+ Add to <meal>"
    rows.
  - A "Type or paste a meal list" row.
  - The empty-day message stays ("No food logged today" / "Nothing logged
    this day").
- **Edit entry** (`/entry/[id]`, native header hidden):
  - **Meal:** chips.
  - **When:** the date (date picker, no future days) and the time (time
    picker). A changed field gets an `accent` border, and moving to another
    day shows "Moves from <old day> to <new day>".
  - **Amount:**
    - A grams field with the existing validation. The error message is
      "Enter an amount above 0 g. To remove it, use Delete."
    - The chips: −10 g (not below 1), +10 g, the product's serving grams
      when the product still exists and has them, and the original grams.
  - **Preview:**
    - kcal for the typed grams, from the entry's own copied per-100 g values.
    - A delta pill against the original kcal, hidden when it's 0.
    - "Was x kcal at y g".
    - Macro columns.
  - **Save changes:** disabled while invalid or saving. It updates the meal,
    grams, day and time, rescales the copied values (ADR-6), then goes back.
    "This entry was deleted, so it couldn't be saved." is shown if the entry
    is gone.
  - **Delete (trash icon):**
    - Opens the delete sheet. The day total after deleting is the day's
      total minus this entry's original kcal.
    - "Delete entry" soft-deletes the entry and goes back to Log.
  - **Back (header or Android) with unsaved changes:** opens the discard
    dialog, listing Meal, Date, Time and Amount changes as "old → new".
    "Discard" leaves, and "Keep editing" closes the dialog.

## Out of scope

- **Prototype gaps:**
  - The calendar screen opened from the date (`history.html`). The date
    picker stays.
- **Removed to match `log.html`:** the "Back to today" link that feature 7
  shipped under the date nav. The › arrow and the date picker reach today.
  - Serving units in quantities ("1 medium · 118 g", "250 mL", "1 tbsp").
    Grams are shown.
  - The "est." badge on log rows (no estimate flag on entries yet).
- The add screen (`/add/[productId]`) keeps the shared `AmountForm`. It is
  covered later by `search.html` and `products.html`.

## Build loop

Continuous Mode: steps run in order without review pauses. Each step keeps
`npx tsc --noEmit` and `npx expo lint` passing; `npx expo-doctor` runs at the
end. Checkpoint commits are disabled.

## Build steps

- [x] **1. Log tab (`log.html`).**
  - Wrap the root in `GestureHandlerRootView`.
  - Hide the Log header and rebuild `DayNavigator`, the total card,
    `MealSection` and `EntryRow` with swipe-to-delete
    (`react-native-gesture-handler/ReanimatedSwipeable`, already installed).
  - Add the "+ Add" additions.
  - **Done when:** typecheck and lint pass. The date nav, total card with
    badge and bar, group cards and rows follow the rules above for the under,
    over, no-goal and empty states.
- [x] **2. Edit entry data and screen (`entry-edit.html` frames 1-2).**
  - `foodLogRepo.update` also takes `day` and `loggedAt`.
  - Add a pure `entryEdit.ts` (change list, amount chips, time and date
    text). The day total after a delete is `useEntry`'s day total minus the
    entry's kcal.
  - Rebuild `src/app/entry/[id].tsx` with the header, the product, meal
    chips, When fields, amount, preview and footer.
  - **Done when:** typecheck and lint pass. A scratch run of `entryEdit.ts`
    lists the changes and chips correctly. The screen follows frames 1 and 2.
- [x] **3. Delete sheet and discard dialog (frames 3-4).**
  - **Done when:** typecheck, lint and expo-doctor pass. Delete shows the
    sheet with the right drop-to total. Back with changes shows the dialog
    listing them. Back without changes leaves at once.
- [x] **4. Review repairs (F-23 to F-26).**
  - Remove the "Back to today" link, so the date nav matches `log.html`.
    Today is still reachable with › and the date picker.
  - Give the group-head "+ Add" a 48 dp touch target with `hitSlop`.
  - Delete the unused `dayTotalAfterDelete`.
  - Write "today" in lowercase in the move hint.
  - **Done when:** typecheck, lint and expo-doctor pass, and F-23 to F-26 are
    marked `fixed` for re-review.

## Files / areas

All paths are under `apps/mobile/`.

- Changed: `src/app/_layout.tsx` (`GestureHandlerRootView`), `src/app/(tabs)/_layout.tsx` (Log `headerShown: false`), `src/app/(tabs)/log.tsx`
- Changed: `src/modules/nutrition/components/DayNavigator.tsx`, `MealSection.tsx`, `EntryRow.tsx`
- New: `src/modules/nutrition/components/DayTotalCard.tsx`
- Changed: `src/app/entry/[id].tsx`, `src/modules/nutrition/hooks/useEntry.ts`, `src/modules/nutrition/repositories/foodLogRepo.ts`
- New: `src/modules/nutrition/services/entryEdit.ts`, `src/modules/nutrition/components/EntryEditForm.tsx`, `DeleteEntrySheet.tsx`, `DiscardDialog.tsx`

## Data / contracts

- No schema change.
- **`foodLogRepo.update(db, id, input)`:** `input` is `{ mealType, grams, day,
  loggedAt }`.
  - `day` is YYYY-MM-DD local and can't be in the future (checked with
    `logDay`).
  - `loggedAt` is ISO UTC from the chosen local date and time.
  - The values are rescaled from the entry's copied per-100 g values (ADR-6),
    and `updated_at` is set to now.
  - It returns `not_found` for a deleted entry.
- **The day total after deleting** is the entry's day total minus the entry's
  stored kcal, read with `listByDay` on the entry's original day.
- **Swipe-to-delete** uses the same `useDayLog.remove`, so a delete is a soft
  delete with Undo.

## Testing

No test runner is configured. `entryEdit.ts` gets a scratch run. The UI is
checked by typecheck, lint, expo-doctor and reading the styles against the
prototype CSS. There is no on-device run.

## Notes for the AI

- Read both prototypes' markup and CSS before each UI step, and compare the
  code with them before ticking a step.
- Theme tokens only, `SymbolView` icons, `makeStyles`, comments only for the
  why, no em dashes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":12516,"specSha256":"6428902f73aba631cbcd0ea5d611ee3d42050dcc07cd71ed4a7add03211de3f3","branch":"refs/heads/feature/log-screen-to-prototype","head":"afb968a1c7f55ae12af64bb002e5672b7d7f1384","baseRef":"refs/heads/main","baseCommit":"6fdf011f747c566297c3526147c72d45f73058a3","sourceTree":"19429b10f75c4b8ee9396a3fb9ea95bd197635a8","landing":"local-merge","absentOptional":[]} -->

## Findings

### 30b/F-23 [P1] closed - Log date nav keeps an undocumented "Back to today" link, now below the 48 dp touch target

**File:** apps/mobile/src/modules/nutrition/components/DayNavigator.tsx:72 (style at :91)
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** The spec rebuilds the Log tab "to match `prototypes/log.html`" and lists every deliberate addition beyond it (per-meal "+ Add", the add/paste card, the empty-day message). The log.html frame is exactly the non-today state ("Yesterday ... one row swiped"), and its `.datenav` holds only the two arrows and the date; there is no "Back to today" row. The code still renders a "Back to today" link under the date nav on every past day, which adds a visible extra row that the prototype and the spec's additions list do not have, so it deviates silently from the spec contract. This delta also shrank its `minHeight` from `tap` (48) to 32, below DESIGN_SYSTEM.md's "48 x 48 dp minimum" touch target.
**Suggested fix:** Either remove the link (the date picker and the arrows already reach today), or keep it and record it in the spec's "Additions beyond `log.html`" with its styling, restoring `minHeight: tap`. Both need the owner's call because removing it drops shipped behavior; if removed, the lost requirement is the one-tap return to today.
**Resolution:** Removed the link and its styles, so the date nav matches log.html. This follows the owner's Oct 21 rule for 30a/30b to follow the prototype when shipped extras aren't in it; today stays reachable with the › arrow or the date picker. The spec records the removal. Awaiting re-review. Re-examined 2026-10-21 by independent re-review at afb968a: closed. `DayNavigator.tsx` now renders only the two arrow buttons and the date/sub-line Pressable (lines 38-72), with `wrap` padding `space[2]`/`space[2]`/`space[3]` as in `log.html` `.datenav`; `rg "Back to today" apps/mobile/src` finds nothing, and the spec's Out of scope records the removal. Next stays disabled on today, so the repair introduced no new defect.

### 30b/F-25 [P3] closed - `dayTotalAfterDelete` is exported but never used

**File:** apps/mobile/src/modules/nutrition/services/entryEdit.ts:79
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** Step 2 added this helper for the delete sheet, but the sheet's drop-to total is computed inline as `dayKcal - entry.kcal` (EntryEditForm.tsx:270, with `dayKcal` summed in useEntry.ts:34). Nothing imports it, so it is dead code that can drift from the real calculation.
**Suggested fix:** Delete the function, or have `useEntry` return the day's entries and use it for `totalAfter`. No current requirement is lost.
**Resolution:** Deleted the unused function; the spec now says the drop-to total is `useEntry`'s day total minus the entry's kcal. Awaiting re-review. Re-examined 2026-10-21 by independent re-review at afb968a: closed. `entryEdit.ts` (76 lines) no longer defines it, `rg dayTotalAfterDelete apps/mobile/src` finds nothing, and `totalAfter={dayKcal - entry.kcal}` (EntryEditForm.tsx:271) with `dayKcal` summed from `listByDay(entry.day)` (useEntry.ts:30-34) matches the spec's Data / contracts line.

### 30b/F-26 [P3] closed - Move hint reads "Moves from Today to ..." with a capital T mid-sentence

**File:** apps/mobile/src/modules/nutrition/components/EntryEditForm.tsx:179
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** The destination is lower-cased for today ("to today", as in frame 4), but the origin uses `dayText`, which returns "Today". Moving an entry logged today back to yesterday shows "Moves from Today to Mon, Oct 19".
**Suggested fix:** Use the same lower-case "today" for the origin when `entry.day === today`. No current requirement is lost.
**Resolution:** The origin now reads "today" in lower case when the entry was logged today ("Moves from today to Mon, Oct 19"). Awaiting re-review. Re-examined 2026-10-21 by independent re-review at afb968a: closed. EntryEditForm.tsx:179-180 lower-cases both ends when they are today, matching frame 4's "Moves from Mon, Oct 19 to today"; the discard list keeps "Today" as in frame 4 ("Date: Mon, Oct 19 → Today").

## Independent review

**Status:** passed
**Target commit:** afb968a1c7f55ae12af64bb002e5672b7d7f1384
**Base commit:** 6fdf011f747c566297c3526147c72d45f73058a3
**Base ref:** main
**Spec hash:** 6428902f73aba631cbcd0ea5d611ee3d42050dcc07cd71ed4a7add03211de3f3
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-21T05:30:00+08:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T06:10:00+08:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `6fdf011f747c566297c3526147c72d45f73058a3..afb968a1c7f55ae12af64bb002e5672b7d7f1384` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD`: pass (afb968a1c7f55ae12af64bb002e5672b7d7f1384, equals Target commit)
- `git merge-base main HEAD`: pass (6fdf011f747c566297c3526147c72d45f73058a3, equals Base commit)
- `sha256sum blueprint/context/current-feature.md`: pass (equals Spec hash)
- `git status --porcelain --untracked-files=all`: pass (only blueprint/context/findings.md and blueprint/context/review.md differ)
- `npx tsc --noEmit` (apps/mobile): pass
- `npx expo lint` (apps/mobile): pass
- `npx expo-doctor` (apps/mobile): pass (21/21 checks)
- Test command: unavailable (no test runner configured)

### Evidence

- Reviewed the whole 6fdf011..afb968a delta (14 app files plus the spec) against current-feature.md and coding-standards.md across quality, security, performance and tests.
- Log tab compared rule by rule with prototypes/log.html (.datenav, .content, .total, .badge, .progress, .group-head, .row, .delete): padding, sizes, tokens, type and copy match; the listed additions ("+ Add", add/paste card, empty-day message) are present and the removed "Back to today" link is gone.
- Edit entry compared with prototypes/entry-edit.html frames 1-4 (.header, .label/.new, .chips, .when/.field states, .amount-row, .card preview and empty state, .footer and disabled button, .sheet, .dialog): no visible mismatch found.
- foodLogRepo.update now writes day and logged_at, rescales via forGrams from the entry's own copied per-100 g values (ADR-6), sets updated_at, and returns not_found for a soft-deleted row (WHERE deleted_at IS NULL). The only caller (useEntry.save) clamps the day with logDay, and the date picker caps at today.
- Soft-delete paths: swipe, long press and the accessibility action use useDayLog.remove (softDelete plus Undo); the edit-screen sheet uses foodLogRepo.softDelete and reports an already-deleted entry. The drop-to total is listByDay(entry.day) minus the entry's kcal.
- Security: all SQL is parameterized; no new trust boundary, secrets or network calls.
- Ledger: F-23, F-25, F-26 closed; F-24 reopened as P2 open; F-27 and F-28 added as P3 open.

### Findings

- F-24 [P2] open (reopened): group-head "+ Add" hit area still below 48 dp
- F-27 [P3] open: moving an entry to today can save a future logged_at
- F-28 [P3] open: unknown macro shows "- g" in the edit preview
- Closed this pass: F-23, F-25, F-26

### Remaining risk

- No test runner is configured, so entryEdit.ts and the update contract have no automated tests; the spec's scratch run was not repeated here.
- No on-device or emulator run: swipe-to-delete with ReanimatedSwipeable, the Android date/time pickers, hardware back with the dialog, and the F-24 hit area were reviewed from code and documented React Native behaviour only.
- Check was not required and did not run.
- Every save rewrites logged_at from the shown day and minute (per spec), dropping seconds and moving a back-filled entry's logged_at from its creation time to its day; the effect on the recent-products window was not exercised.

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go on the **Log**
tab, with `prototypes/log.html` and `prototypes/entry-edit.html` open in a browser.
Tap ‹ to go to yesterday, swipe a food row left, then tap another row.

Expected:

The date nav shows "Mon, Oct 19 ▾" with "Yesterday · tap for calendar". The total
card shows kcal / goal with an "over" or "left" badge and the split bar. Swiping a
row reveals the red Delete (Undo appears after it). The tapped row opens Edit
entry like frame 1: meal chips, When date and time, amount with −10 / +10 chips,
and the kcal preview with its delta. Change the date to today: "Moves from Mon,
Oct 19 to today" appears; press back to see the Discard changes dialog.

This proves:

The Log tab and Edit entry follow their prototypes, and entries can be moved,
edited and deleted safely.
