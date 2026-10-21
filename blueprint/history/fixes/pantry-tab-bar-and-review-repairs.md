# Fix: Pantry tab bar and review repairs

**Type:** Fix
**Status:** verified
**Branch:** `fix/pantry-tab-bar-and-review-repairs`
**Fixes:** F-40, F-41, F-42, F-43, F-44, F-45, F-46

## The problem

Feature 8a (Pantry list and adding stock) reached local `main` as `fc646c9`
through another tool's `/complete`. Its archive carries a review receipt that
fails the review contract: adapter `antigravity` and an unknown model, where
`claude` / `claude-opus-5-5` was requested. The owner chose on Oct 21 to keep
`main` and re-review the original checkpoint `6a428fb`.

That `claude` review returned changes-requested:

- **F-40 [P1]** `src/app/(tabs)/_layout.tsx`: `tabBarStyle.height: 64` replaces
  the default height, but the bar still adds the bottom inset as padding.
  With Android three-button navigation (SDK 57 is edge to edge), the tabs are
  clipped.
- **F-41 [P1]** `src/app/(tabs)/_layout.tsx`: every label is 600 and the icons
  are 25 dp. The 8a spec and `pantry.html` `.tab` use 22 dp icons, 400
  labels, and 600 only on the active tab.
- **F-42 [P3]** `src/app/(tabs)/pantry.tsx`: the list cards keep 12 dp of
  vertical padding. Frame 1 sets `padding-block: 0` on list cards, so rows
  supply their own padding.
- **F-43 [P3]** `src/app/pantry/add/[productId].tsx`: "Units bought" and
  "Location" use uppercase section labels.
  - Frame 3 uses `.field` rows: a `.lbl` on the left in `sm` `muted`, and the
    control on the right.
  - Location there is a row of chips, not a segmented control.
- **F-44 [P3]** `src/modules/pantry/repositories/pantryRepo.ts`: a restock
  with no date picked keeps the old expiry (`COALESCE`). The form never shows
  that date, so Clear can't remove it.
- **F-45 [P3]** `src/modules/pantry/services/pantryStock.ts`: "expires
  tomorrow" isn't in the 8a spec's badge list.
- **F-46 [P3, unverified]** `src/app/pantry/add/[productId].tsx`: a fast
  double tap can pass the state-based guard and record two `bought`
  movements.

## The fix

- **F-40:** the tab bar height is `64 + insets.bottom` (`useSafeAreaInsets`),
  so 64 dp of tabs always sit above the system bar. The top border is 1 dp.
- **F-41:**
  - Tab icons render at a fixed 22 dp.
  - The label is a custom `tabBarLabel` in `xs`: 600 and `accentText` when
    focused, 400 and `muted` otherwise.
- **F-42:** the Pantry list cards use `paddingVertical: 0`, keeping
  `space[4]` horizontal padding.
- **F-43:** the add-stock screen follows frame 3's sheet layout as a screen:
  - **Header:** the name in `lg` 700, then the sub line in `sm` `muted`.
  - **"Units bought":** a field row with the stepper on the right. The row
    has no border and no minimum height, as in the frame's inline style.
  - **Net weight per unit:** a field row with the input on the right. It
    stays as the 8a addition, because the net weight can be missing.
  - **"In stock after this":** the result box.
  - **Location:** a field row with three 32 dp chips (Cupboard, Fridge,
    Freezer). The selected chip is `accentSoft` with `accentText` 600.
  - **Expiry date:** a field row with the input on the right.
  - Then the note and the two-button row.
  - Field rows are at least 48 dp tall with a 1 dp bottom `border`; the last
    row has none.
- **F-44** (owner decision on Oct 21: show it and allow changing it):
  - The form starts the expiry from the pantry item's stored `expires_at`
    and shows it.
  - Picking a date replaces it, and Clear empties it.
  - `addStock` writes exactly the form's value, null included (no
    `COALESCE`).
- **F-45:** "expires tomorrow" stays, for one day out. This spec adds it to
  the badge list: expired, expires today, expires tomorrow, expires in N days.
- **F-46:** a `useRef` flag blocks a second submit while one is saving, as in
  `usePasteLog.confirm`.
- **Archive correction:** in `blueprint/history/features/08a-pantry-list-and-adding-stock.md`,
  the invalid receipt under "## Independent review" is replaced. The new
  text:
  - says the original `antigravity` receipt failed the contract (wrong
    adapter, unknown model);
  - holds the `claude` re-review receipt of `6a428fb` (changes-requested, F-40
    to F-46);
  - points to this fix's archive for the repairs and the passing review.

  The archived spec bytes and the completion annotation stay unchanged.
- Nothing else changes: no data model change, and the normal and pantry
  navigation paths stay the same.

## Build steps

- [x] **1. Tab bar (F-40, F-41).**
  - **Done when:** typecheck and lint pass. The tab bar height is 64 plus the
    bottom inset, icons are 22 dp, and only the focused label is 600 in
    `accentText`.
- [x] **2. Pantry list padding and add-stock layout (F-42, F-43, F-44,
  F-46).**
  - **Done when:** typecheck and lint pass. List cards have 0 vertical
    padding. Add stock uses field rows with a Location chip row and shows a
    stored expiry with Clear. `addStock` stores the form's expiry as given.
    A ref blocks double submits.
- [x] **3. Archive correction and findings.**
  - **Done when:** the 8a archive's review section is replaced as described.
    F-40 to F-46 are marked `fixed`, and expo-doctor passes.

## Verify

- Run `npx tsc --noEmit`, `npx expo lint` and `npx expo-doctor`.
- An independent `claude` review of this fix checkpoint must pass before
  landing. It re-reviews F-40 to F-46.
- **On the phone (owner):**
  - The five tabs are fully visible above three-button navigation.
  - Only the active tab label is bold.
  - Add stock looks like frame 3, and a restocked item shows and keeps its
    expiry.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5566,"specSha256":"9cb245ef88b40efc0a7da42b7b7e0ccfbad325382743c167f8ee924b0a566372","branch":"refs/heads/fix/pantry-tab-bar-and-review-repairs","head":"2df60b69e43506dd134daf78609586e93872f6ed","baseRef":"refs/heads/main","baseCommit":"fc646c96c9e2458ae0c55f81baee092fcd5b4c05","sourceTree":"6d6b253ae9f70784a5710e482b348cb0f6dba4d3","landing":"local-merge","absentOptional":[]} -->

## Findings

### pantry-tab-bar-and-review-repairs/F-40 [P1] closed - Fixed 64 dp tab bar height leaves almost no room above the Android navigation bar

**File:** apps/mobile/src/app/(tabs)/_layout.tsx:25
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** `tabBarStyle` now sets `height: 64`. In the bundled bottom-tabs (expo-router/build/react-navigation/bottom-tabs/views/BottomTabBar.js:100-106) a numeric style height replaces the default `49 + insets.bottom`, while the bar still applies `paddingBottom: insets.bottom` (:251-252). React Native 0.86 / SDK 57 always draws edge to edge on Android, so `insets.bottom` is the system navigation bar: about 48 dp with three-button navigation, which leaves about 16 dp for the 25 dp icon plus the label, so every tab is clipped. With gesture navigation (about 16-24 dp) the content gets 40-48 dp, still smaller than before this change. The prototype's 64 dp is the bar itself, drawn without a system navigation bar, and the tab bar is the app's main navigation (spec Done when for step 2: "The bar shows the five tabs in order with the pantry.html styles").
**Suggested fix:** Add the inset back, for example `height: 64 + insets.bottom` using `useSafeAreaInsets()` in `TabLayout`, or drop the custom height and keep the default. No new dependency; no current requirement is lost.
**Resolution:** The tab bar height is `64 + insets.bottom` from `useSafeAreaInsets()`, so the 64 dp of tabs sit above the system bar, with a 1 dp top border. Awaiting re-review. Closed 2026-10-21 by independent re-review of 2df60b6: `tabBarStyle.height` is `64 + insets.bottom`; bundled BottomTabBar.js:100-106 takes the numeric height and :251-252 still pads by `insets.bottom`, so 64 dp of tabs remain above the system bar. No new defect.

### pantry-tab-bar-and-review-repairs/F-41 [P1] closed - Tab icons are 25 dp and inactive tab labels are bold, against the spec's tab bar rule

**File:** apps/mobile/src/app/(tabs)/_layout.tsx:26 (icon size at :9)
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** The spec's Design reference requires "a 22 dp icon over an `xs` label. The active tab is `accentText` 600, the others `muted`" (pantry.html `.tab` has no weight, `.tab.on` 600, `.tab svg` 22px). `tabLabelStyle` sets `fontWeight: "600"` for every tab, so all five labels are bold and only colour marks the active one. `tabIcon` uses the navigator's `size`, which TabBarIcon.js:15-23 sets to 25 (round, non-compact) on Android, not 22. Both are visible on every tabbed screen and are stated rules in the approved spec.
**Suggested fix:** Pass `size={22}` in `tabIcon` (ignore the navigator size) and set the label weight per state, for example a `tabBarLabel` render function that applies `fontWeight: "600"` only when `focused`. No new dependency; no current requirement is lost.
**Resolution:** `tabIcon` renders at a fixed 22 dp, and a `tabBarLabel` function sets `xs` with 600 only when focused (400 otherwise), coloured by the navigator's active/inactive tint. Awaiting re-review. Closed 2026-10-21 by independent re-review of 2df60b6: `tabIcon` ignores the navigator size and renders 22 dp; `tabBarLabel` renders `xs` with 600 only when `focused`, coloured by the active/inactive tint (accentText/muted), matching pantry.html `.tab`/`.tab.on`/`.tab svg`. On Android the tab accessibilityLabel was already undefined for string labels (BottomTabBar.js), so TalkBack output is unchanged. No new defect.

### pantry-tab-bar-and-review-repairs/F-42 [P3] closed - Pantry list cards add 12 dp of vertical padding that frame 1 removes

**File:** apps/mobile/src/app/(tabs)/pantry.tsx:164
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** In `prototypes/pantry.html` frame 1 every list card is `<div class="card" style="padding-block: 0">` (lines 114, 120, 126), so the rows' own 8 dp padding sits against the card edge. The code keeps `.card`'s base `space[3]` vertical padding, which adds 12 dp above the first row and below the last in each group. The spec's Design reference transcribed only the base `.card` rule, so the code follows the spec text but not the frame it names.
**Suggested fix:** Use `paddingVertical: 0` for the pantry list card (keep `paddingHorizontal: space[4]`), and correct the spec's Card line. No current requirement is lost.
**Resolution:** The Pantry list card style drops the vertical padding and keeps `space[4]` horizontal, as in frame 1. Awaiting re-review. Closed 2026-10-21 by independent re-review of 2df60b6: the Pantry list `card` style has no vertical padding and keeps `space[4]` horizontal, matching frame 1's `padding-block: 0`.

### pantry-tab-bar-and-review-repairs/F-43 [P3] closed - Add stock labels use uppercase section labels instead of frame 3's field labels

**File:** apps/mobile/src/app/pantry/add/[productId].tsx:107 (Location label at :162, style at :245)
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** Frame 3 puts "Cans bought" as a `.field .lbl` (`sm` `muted`, sentence case) on the same row as the stepper, and "Location" as a `.field .lbl` beside its control (pantry.html:189-197). The screen renders both as uppercase `xs` 600 section labels above the control, a visibly different hierarchy from the frame, while "Net weight per unit" and "Expiry date" on the same screen use the field label style. The spec does not state the label style, so this is design drift, not a broken rule.
**Suggested fix:** Use the existing `fieldLbl` style for "Units bought" (in a row with the stepper) and "Location". No current requirement is lost.
**Resolution:** Add stock now uses frame 3 `.field` rows: label left in `sm` `muted`, control right, 48 dp minimum with a 1 dp bottom border (none on the last row). "Units bought" is a bare row with the stepper; Location is a row of three 32 dp chips (`accentSoft`/`accentText` 600 when selected). Awaiting re-review. Closed 2026-10-21 by independent re-review of 2df60b6: add stock now matches frame 3's sheet order and `.field` rows (sm muted `.lbl` left, control right, 48 dp minimum, bottom border, none on the last row; bare stepper row; result box; Location as three 32 dp `.chip` with accentSoft/accentText 600 when on; Expiry row). The 32 dp chip touch height is tracked separately as F-47.

### pantry-tab-bar-and-review-repairs/F-44 [P3] closed - A restock keeps the old expiry date, so fresh stock can show "expired"

**File:** apps/mobile/src/modules/pantry/repositories/pantryRepo.ts:74 (form starts empty at apps/mobile/src/app/pantry/add/[productId].tsx:64)
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** One packaged item is reused per product, and the update keeps `expires_at` when no date is picked (`COALESCE(?, expires_at)`). The add screen starts the expiry empty and never shows the stored date. So after yogurt that expired last week is used up, buying a new pack without picking a date shows the new stock with a red "expired" badge, and Clear on the screen cannot remove the stored date. The spec says the expiry is set "when chosen", so this follows the contract but gives a misleading badge.
**Suggested fix:** Prefill the form with the item's current `expiresAt` (so Clear really clears it and saving writes the shown value), or clear the stored expiry when the item's stock was 0 before the buy. Needs an owner call on which; no new machinery.
**Resolution:** Owner decision 2026-10-21: show and allow changing. The form starts the expiry from the item's stored `expiresAt` and shows it; picking replaces it and Clear empties it. `addStock` writes `expires_at = ?` with the form's value, null included. Awaiting re-review. Closed 2026-10-21 by independent re-review of 2df60b6: the form initialises `expiresAt` from `stockForProduct(...).expiresAt`, Clear sets null, and `addStock` writes `expires_at = ?` with the form value (no COALESCE), per the owner decision recorded in the fix spec.

### pantry-tab-bar-and-review-repairs/F-45 [P3] closed - Expiry badge says "expires tomorrow", a copy the spec does not list

**File:** apps/mobile/src/modules/pantry/services/pantryStock.ts:41
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** The spec's badge copy is "expires in N days", "expires today" or "expired". One day out shows "expires tomorrow" instead of "expires in 1 day". It reads well, but it is undocumented copy drift from the approved contract.
**Suggested fix:** Either record "expires tomorrow" in the spec or use "expires in 1 day". No current requirement is lost.
**Resolution:** Kept by the fix spec: "expires tomorrow" is now part of the documented badge list (expired, expires today, expires tomorrow, expires in N days). Awaiting re-review. Closed 2026-10-21 by independent re-review of 2df60b6: the fix spec now lists "expires tomorrow" in the badge copy, matching `expiryBadge` in pantryStock.ts (unchanged).

### pantry-tab-bar-and-review-repairs/F-46 [P3] closed - A fast double tap on "Add N to pantry" may record the buy twice

**File:** apps/mobile/src/app/pantry/add/[productId].tsx:80
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** The double-submit guard is the `saving` state read through the render's `disabled` value. Two presses delivered before React re-renders both see `disabled === false`, and each call runs its own exclusive transaction; the second finds the item the first created and adds a second `bought` movement, doubling the stock in the ledger. Not reproduced on a device.
**Suggested fix:** Guard with a `useRef` flag set synchronously at the start of `add` (as `scan.tsx` does with `busy`). No new machinery; no current requirement is lost.
**Resolution:** `add()` sets a `savingRef` flag synchronously and returns early while it is set; the flag resets only on failure. Awaiting re-review. Closed 2026-10-21 by independent re-review of 2df60b6: `add()` checks and sets `savingRef` synchronously before any await, so a second tap before re-render returns early; the ref resets only on failure and the screen leaves on success.

## Independent review

**Status:** passed
**Target commit:** 2df60b69e43506dd134daf78609586e93872f6ed
**Base commit:** fc646c96c9e2458ae0c55f81baee092fcd5b4c05
**Base ref:** main
**Spec hash:** 9cb245ef88b40efc0a7da42b7b7e0ccfbad325382743c167f8ee924b0a566372
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-21T15:30:00+08:00
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T14:06:11+08:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `fc646c96c9e2458ae0c55f81baee092fcd5b4c05..2df60b69e43506dd134daf78609586e93872f6ed` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`: pass (HEAD = target, merge base = base, spec hash matches, only `blueprint/context/review.md` differed)
- `npx tsc --noEmit` (apps/mobile): pass
- `npx expo lint` (apps/mobile): pass
- `npx expo-doctor` (apps/mobile): pass (21/21 checks)

### Evidence

- Reviewed every file in `fc646c9..2df60b6`: `(tabs)/_layout.tsx`, `(tabs)/pantry.tsx`, `pantry/add/[productId].tsx`, `pantryRepo.ts`, the fix spec, and the 08a archive; plus the callers and data they rely on (`useAddStock.ts`, `stockForProduct`/`STOCK_SELECT`, `pantryStock.ts` `expiryBadge`).
- F-40: `tabBarStyle.height` is `64 + insets.bottom`; bundled BottomTabBar.js:100-106 uses the numeric height and :251-252 pads by `insets.bottom`, so 64 dp of tabs sit above the system bar.
- F-41: icons fixed at 22 dp; `tabBarLabel` renders `xs` with 600 only when focused, tinted accentText/muted. BottomTabItem.js:54-59 passes `focused`, `color` and `children`; Android accessibilityLabel was already undefined, so TalkBack output is unchanged.
- F-42: Pantry list card has no vertical padding, `space[4]` horizontal (frame 1 `padding-block: 0`).
- F-43: add stock matches frame 3 order and `.field`/`.lbl`/`.chip`/`.chip.on`/`.result` CSS (pantry.html lines 31-63, 176-201); net weight row kept as the documented 8a addition.
- F-44: form initialises expiry from the stored `expires_at`, Clear sets null, `addStock` writes `expires_at = ?` (parameterised, no COALESCE), per the owner decision in the spec.
- F-45: spec badge list now includes "expires tomorrow", matching `expiryBadge`.
- F-46: `savingRef` checked and set synchronously before the first await; reset only on failure.
- Archive: diff touches only the "Independent review" section of `08a-pantry-list-and-adding-stock.md`; the archived spec body is unchanged. The correction states why the `antigravity` receipt was withdrawn and records the `claude` changes-requested re-review of `6a428fb` with F-40 to F-46.
- Security: SQL stays parameterised; no new input or trust boundary. Performance: no new queries or unbounded work.

### Findings

- F-40 [P1] closed
- F-41 [P1] closed
- F-42 [P3] closed
- F-43 [P3] closed
- F-44 [P3] closed
- F-45 [P3] closed
- F-46 [P3] closed
- F-47 [P3] open: add-stock Location chips are 32 dp tall with no hitSlop, under the 48 dp tap size (non-blocking)

### Remaining risk

- No unit test runner is configured, so `addStock` and `expiryBadge` have no automated tests.
- No on-device or emulator run: tab bar fit above three-button navigation, the frame 3 layout, and the prefilled expiry were reviewed from code and library source only.
- Check was not required and was not run.
- The 08a archive correction points to a fix archive under `blueprint/history/fixes/` that exists only after `/complete`.
- The request's `Requested at` (15:30 +08:00) is later than this review's clock time (14:06 +08:00); the request timestamp appears to be an estimate.

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go on a phone set to
three-button navigation. Open **Pantry**, tap **Add stock**, scan or search a product
already in the pantry with an expiry date, and look at the add stock screen.

Expected:

All five tabs sit fully above the system buttons, with only the active label bold. The
add stock screen matches `prototypes/pantry.html` frame 3: "Units bought" with the
stepper on the right, Location as three chips, and the item's stored expiry shown with
**Clear**. Saving without touching the date keeps it; Clear then save removes it.

This proves:

The tab bar no longer clips, and a restock shows and keeps the expiry you see.
