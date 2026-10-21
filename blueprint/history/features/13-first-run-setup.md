# Feature: First-run setup

**From build-plan:** feature 13
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/first-run-setup`

## Goal

A short setup suggests a daily calorie target from a formula TDEE
(Mifflin-St Jeor) that I accept or change later. Personal values (sex, birth
date, height, weight, activity, goal, BMI scale, units) are saved as settings,
not hard-coded (`1_docs/plan/11` §4, `10` §2, stories J5, J13).

Owner decisions on Oct 20:
- **Paces:** use the prototype's paces. Lose fat: Gentle −250, Steady −400,
  Fast −600 kcal. Maintain: TDEE. Build muscle: +250 kcal with no pace choice.
- **Units:** imperial units apply to setup inputs only. The choice is saved;
  the rest of the app stays in kg.
- **Who sees it:** setup opens automatically only on a phone with no calorie
  goal. Everyone else reaches it from "Recalculate" on the Settings goal card.
- **Size:** one feature, not split.

## Design reference

`prototypes/onboarding.html` frames 1-5 are the contract. Rules carried from
its CSS (tokens are already in `src/lib/theme/tokens.ts`):

- **Screen:** no native header. Content padding is `space[2]` top and
  `space[4]` sides and bottom, with a `space[4]` gap. A flexible spacer pushes
  the primary button to the bottom.
- **Buttons:**
  - Primary: `tap` height, `radius.md`, `accent` fill, `accentInk` `md` 700,
    full width.
  - Link: 40 dp tall, `muted` `sm` 600.
- **Step header (frames 2-4):**
  - A 40 dp back icon (`arrow_back`, muted). Frame 2 shows it too, and it
    returns to the welcome screen, or closes setup when opened from
    Recalculate.
  - Three 4 dp bars with a `space[1]` gap: `accent` when reached, `track`
    otherwise.
  - "N of 3" in `xs` `muted`.
- **Titles:**
  - `h1`: `xl` 700, line height 1.15.
  - Subtitle: `sm` `muted`, `space[2]` above.
- **Fields:**
  - Label: `xs` 600 `muted`, `space[1]` below.
  - Input: 56 dp tall, `radius.sm`, `surface2`, `space[4]` horizontal
    padding, value in `lg` 600, unit on the right in `sm` `muted`.
  - Focused input: `accent` border with a 3 dp `accentSoft` ring.
  - Helper: `xs` `muted`.
  - Height and weight sit in a two-column row with a `space[3]` gap.
- **Segmented control:**
  - The track is `surface2`, `radius.sm`, 3 dp padding.
  - Segments are 42 dp tall in `sm` `muted`. The selected one is
    `surface` with `text` 600 and a light shadow.
  - The small variant has 30 dp segments in `xs`.
- **Option rows (frames 3 and 4):**
  - Each row is at least 64 dp tall, `space[3]` padding, `radius.sm`, 1 dp
    `border`, on `surface`, with a `space[2]` gap between rows.
  - Selected rows have an `accent` border, an `accentSoft` fill and a 6 dp
    `accent` radio. Others have a 2 dp `faint` radio.
  - Name `md` 600, meta `sm` `muted`. The right side is `sm` 600, with a
    sub line in `xs` `muted`.
- **Welcome (frame 1):**
  - A vertically centred hero.
  - Logo tile: 64 dp, radius 18, `accent`, with an `accentInk` icon.
  - `xl` 700 headline, then a `md` `muted` paragraph.
  - Three points in `sm`, each with an `accentText` icon.
  - "Set up my goal" (primary), then the "Skip, I'll enter a calorie goal
    myself" link.
- **Results (frame 5):**
  - **Hero card:** centred. The label is `sm` `muted` with an "est." badge,
    the number is 48 dp 700 `accentText`, and the sub line is `sm` `muted`
    with a `text` bold date.
  - **Metrics row:** three tiles (BMR, TDEE, and Deficit or Surplus) on
    `surface` with a 1 dp border and `radius.sm`. Each has an `xs` `muted`
    key and an `lg` 700 value with an `xs` unit.
  - **BMI card:**
    - The head shows "BMI x" in `md` with the category in `estimate` `sm`
      600, and a small Asia-Pac / WHO segmented control.
    - An 8 dp scale bar has four segments: `protein`, `ok`, `estimate` and
      `over`. For Asia-Pacific they are 18.5, 4.5, 2 and 5 parts wide. A
      4 × 18 dp `text` pin marks the value.
    - Scale labels are `xs` `faint`. The helper reads "BMI doesn't account
      for muscle. Your weight trend tells you more."
  - **Macro split:** three `surface2` tiles, each with a 24 × 3 dp colour
    bar, grams in `md` 700, and "Protein 30%" in `xs` `muted`.
  - **Footer:** the disclaimer in `xs` `faint`, centred: "Estimates from
    the Mifflin-St Jeor formula, not medical advice. Change any of this in
    Settings." Then "Start tracking".

## In scope

- **Welcome:**
  - The headline is "Track food your way. Offline, on your phone." The
    paragraph and the three points are as in the prototype.
  - Point icons are `barcode_scanner`, `smartphone` and `download`.
  - "Set up my goal" goes to step 1.
  - "Skip, I'll enter a calorie goal myself" marks setup done and opens the
    Settings tab.
- **Step 1, About you:**
  - Units: kg · cm / lb · ft.
  - Sex: Male / Female, with the helper "The calorie formula differs by sex."
  - Birth date: opens the Android date picker. The input shows "Mar 14, 1999"
    with the age on the right ("27 yrs").
  - Height: cm, or ft and in as two fields.
  - Current weight: kg or lb.
  - Then "Next".
  - **Errors** (inline, under the field):
    - "Pick your birth date"
    - "You need to be 18 or older"
    - "Enter a height from 100 to 250 cm" (or "from 3 ft 4 in to 8 ft 2 in")
    - "Enter a weight from 20 to 300 kg" (or "from 45 to 661 lb"; 44 lb is just under 20 kg)
- **Step 2, How active are you?:** five options as in the prototype
  (Sedentary ×1.2, Lightly ×1.375, Moderately ×1.55, Very ×1.725, Extra ×1.9).
  Moderately active is selected by default. Then "Next".
- **Step 3, What's your goal?:**
  - Segmented: Lose fat / Maintain / Build muscle.
  - **Lose fat:**
    - A Target weight field, with "−x kg" (or lb) from the current weight
      in the unit slot. It must be lower than the current weight and inside
      the weight range.
    - Pace options Gentle, Steady (the default) and Fast. Each shows "≈ x
      kg / week" and its kcal / day. Fast adds "· harder to keep".
  - **Build muscle:** the Target weight field must be above the current
    weight. There is no pace.
  - **Maintain:** no target weight and no pace.
  - Then "See my plan".
- **Results (frame 5):**
  - The calorie target with "est.".
  - **Sub line:**
    - Lose fat or Build muscle: "<target> kg around <early|mid|late Month
      YYYY>".
    - Maintain: "Keep around <current> kg".
  - **Metrics:** BMR, TDEE, and Deficit "−400" or Surplus "+250" (hidden for
    Maintain).
  - **BMI card:** BMI from height and current weight, with the category from
    the existing `bmiCategory`. The scale toggle changes the category, the
    segment widths and the labels (Asia-Pacific: under 18.5 / 23 / 25 / 30+;
    WHO: under 18.5 / 25 / 30 / 35+).
  - The macro split.
  - The disclaimer.
  - **"Start tracking":**
    - Saves the profile, the units, the calorie goal and today's weight, and
      marks setup done.
    - Then it goes to Today, or back to Settings when opened from
      Recalculate.
    - If saving fails it shows "Couldn't save your setup. Try again." and
      stays on the screen.
    - If only the weight fails it shows "Saved your goal, but couldn't save
      your weight. Log it on Progress." and continues.
- **When setup opens:**
  - Today opens `/setup` once when both the calorie goal and the setup-done
    setting are missing.
  - The Settings goal card adds a "Recalculate" link (accentText, as in
    `settings.html`). It opens `/setup?from=settings` at step 1, prefilled
    from the saved profile and the latest weight.
- **Back:** hardware back and the step back icon go to the previous step.
  On the welcome screen or step 1 (from Recalculate), back leaves setup
  without saving.

## Out of scope

- Imperial display anywhere except the setup inputs (owner decision).
- Storing the target weight or pace. They are not in the plan's data list,
  so they are used only to compute the suggestion.
- Macro targets as saved goals (story C5). The split is shown only.
- Learned TDEE (feature 21).
- Editing the profile outside setup. The existing body profile screen keeps
  height and BMI scale.
- **Prototype gaps:**
  - The BMI category wording stays the shipped feature 11 labels ("Obese",
    "At risk"). The prototype's "Obese I" would change shipped Progress text.
  - Pace "≈ kg / week" is rounded to 0.05 kg, so Gentle shows "≈ 0.25" where
    the prototype shows "≈ 0.2" (0.227 rounds to 0.25).

## Build loop

Continuous Mode: steps run in order without review pauses. Each step keeps
`npx tsc --noEmit` and `npx expo lint` passing; `npx expo-doctor` runs at the
end. Checkpoint commits are disabled.

## Build steps

- [x] **1. Setup calculations.**
  - Add `src/modules/body/services/setupCalc.ts` with:
    - `ageOn`, `bmr`, `tdee`
    - `goalOffset(goal, pace)`, `targetKcal` (rounded to 10 and clamped to
      800-6000), `kgPerWeek`
    - `etaLabel(today, currentKg, targetKg, kgWeek)`
    - the macro split, which after the rebase onto feature 30a is the shared
      `macroTargets(kcal)` in `nutritionCalc.ts` (same 30 / 40 / 30 rule, used
      by Today too)
    - unit conversions (`lbToKg`, `kgToLb`, `ftInToCm`, `cmToFtIn`)
  - **Done when:** typecheck and lint pass. A scratch run reproduces the
    prototype: 74.5 kg, 170 cm, 27 years, male, moderate gives BMR 1,678,
    TDEE 2,600, Steady 2,200, Gentle 2,350, Fast 2,000, and macros 165 / 220
    / 73 g. It also shows a female BMR, the clamp at 800, the ETA labels and
    the conversions.
- [x] **2. Profile fields and setup storage.**
  - Add migration `006_body_profile_setup`: nullable `sex`, `birth_date`,
    `activity_level` and `goal` on `body_profile`, with CHECK lists.
  - Extend `bodyProfileRepo` with `getSetup` and `saveSetup`. The existing
    `get` and `save` keep their behavior.
  - Add settings keys `units` and `setup_done` in `settingsRepo`.
  - Add `finishSetup` to a `setupRepo`: one exclusive transaction for the
    profile, units, goal and done flag, then `weightRepo.saveManual` for
    today.
  - **Done when:** typecheck and lint pass. The migration only adds columns.
- [x] **3. Welcome and steps 1-3 (frames 1-4).**
  - Add the `src/app/setup.tsx` route (headerless) and its components in
    `src/modules/body/components/setup/`.
  - **Done when:** typecheck and lint pass. Each screen's layout follows its
    frame's rules above, and the validation messages show.
- [x] **4. Results, saving and entry points (frame 5).**
  - Add the results screen and "Start tracking".
  - Add the first-launch redirect on Today and the Recalculate link in
    Settings.
  - **Done when:** typecheck, lint and expo-doctor pass. On a phone with no
    goal, setup opens. Finishing it sets the Today goal and adds today's
    weight on Progress. Recalculate opens step 1 prefilled.

- [x] **5. Review repairs (F-29 to F-33).**
  - Continue after a weight-only failure only if the saved answers are
    unchanged; otherwise save again.
  - The imperial weight range message is 45-661 lb.
  - Errors show under their own field.
  - The results "est." badge is a View pill.
  - Skip catches a failed flag write.
  - **Done when:** typecheck, lint and expo-doctor pass, and F-29 to F-33
    are marked `fixed` for re-review.

## Files / areas

All paths are under `apps/mobile/`.

- New: `src/modules/body/services/setupCalc.ts`, `src/modules/body/services/setupSchema.ts`
- New: `src/db/migrations/006_body_profile_setup.ts`; changed: `src/db/migrations/index.ts`
- Changed: `src/modules/body/repositories/bodyProfileRepo.ts`, `src/modules/body/types/body.ts`, `src/modules/nutrition/repositories/settingsRepo.ts`
- New: `src/modules/body/repositories/setupRepo.ts`
- New: `src/app/setup.tsx`, and in `src/modules/body/components/setup/`:
  - `SetupParts.tsx`: step header, segmented, inputs, option row and buttons
  - `SetupSteps.tsx`: welcome and steps 1-3
  - `SetupResults.tsx`: frame 5
- New: `src/modules/body/hooks/useSetup.ts` (prefill and save) and `src/modules/body/hooks/useFirstRun.ts` (first-launch redirect)
- Changed: `src/app/_layout.tsx`, `src/app/(tabs)/index.tsx` (first-launch redirect), `src/app/(tabs)/settings.tsx` (Recalculate)
- Each step validates with the zod-based helpers in `setupSchema.ts` when you
  tap Next, not with react-hook-form, because the values carry across
  screens. The messages and ranges match the existing weight and height
  schemas.

## Data / contracts

- **Migration 6** (additive):

  ```sql
  ALTER TABLE body_profile ADD COLUMN sex TEXT CHECK (sex IN ('male','female'));
  ALTER TABLE body_profile ADD COLUMN birth_date TEXT;            -- YYYY-MM-DD (local)
  ALTER TABLE body_profile ADD COLUMN activity_level TEXT
    CHECK (activity_level IN ('sedentary','light','moderate','very','extra'));
  ALTER TABLE body_profile ADD COLUMN goal TEXT CHECK (goal IN ('cut','maintain','bulk'));
  ```

- **Settings rows** (key / JSON value):
  - `units`: `"metric"` or `"imperial"`
  - `setup_done`: `true`
  - `calorie_goal_kcal`: the existing goal number
- **Formulas** (`10_body_progress.md` §2):
  - BMR = 10·kg + 6.25·cm − 5·age + (male +5 / female −161)
  - TDEE = BMR × the activity factor
  - Offsets: cut Gentle −250, Steady −400, Fast −600; maintain 0; bulk +250
  - Target = round(TDEE + offset, nearest 10), clamped to 800-6000 (the
    `goalSchema` range)
  - kg/week = |offset| × 7 ÷ 7700, rounded to 0.05
  - ETA = today + (|current − target| ÷ kg/week) weeks. The label uses
    "early" for days 1-10, "mid" for 11-20 and "late" for 21 or later, then
    the month name and year.
  - Macros: protein 30% ÷ 4, carbs 40% ÷ 4, fat 30% ÷ 9, rounded grams.
  - Age: full years on today's local date.
- **Conversions:** 1 lb = 0.45359237 kg; 1 in = 2.54 cm. Values are stored in
  kg and cm, with one decimal for weight.
- **Saving:**
  - `finishSetup` writes the profile row (upsert id 1), `units`,
    `calorie_goal_kcal` and `setup_done` in one exclusive transaction.
  - Today's weight then goes through `saveManual`, which replaces today's
    typed weight per the feature 11 rule.
- **Backup:** `body_profile` and `settings` are already exported. Restore
  migrates older backups through migration 6.

## Testing

No test runner is configured. Step 1 gets a scratch run against the
prototype's numbers. The other steps rely on typecheck, lint, expo-doctor and
reading the code against the frames. `setupCalc` is the first unit-test
target once `/tests` adds a runner.

## Notes for the AI

- Read the frames and CSS above before each UI step, and compare the code to
  them before checking the step off.
- Follow the existing patterns:
  - `makeStyles(theme)`
  - `DateTimePickerAndroid.open` (as in `WeightForm`)
  - `SymbolView` icons (`expo-symbols`)
  - the zod form schemas
  - comments only for the why
  - no em dashes
- Theme tokens only.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":14842,"specSha256":"c095280c35c67c0de74c7767c5c7873011186f5dad2d91f3459720a6460a939c","branch":"refs/heads/feature/first-run-setup","head":"e9bd83b57485f26772bbbfd8ba79199d8ecafce4","baseRef":"refs/heads/main","baseCommit":"4d9208df128c5391dd4a98b680735190e2402a3e","sourceTree":"d9c9066d75685a0c30733b0b59cf161e77a00686","landing":"local-merge","absentOptional":[]} -->

## Findings

### 13/F-29 [P2] closed - After a weight-only save failure, a second "Start tracking" leaves without saving edited answers

**File:** apps/mobile/src/app/setup.tsx:160
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** When `finishSetup` saves the goal but `saveManual` fails, `goalSaved` becomes true (line 171) and is never reset. If the user then backs to step 3 or earlier, changes the goal, pace, activity or weight, and returns to results, the screen shows the new target but "Start tracking" calls `done()` without saving it, so Settings and Today keep the earlier goal with no message. The spec's "shows the message and continues" also reads as continuing after the message, while this path needs a second tap.
**Suggested fix:** Clear `goalSaved` (and the message) whenever an answer changes or the user leaves the results step, or continue right after showing the message. No new machinery; no current requirement is lost.
**Resolution:** `start` now remembers the exact answers it saved when only the weight failed (`savedAnswers`). A second tap continues only if those answers are unchanged; any edit saves again. Closed (2026-10-21 independent review of e9bd83b (fresh subagent, claude-opus-5-5)): setup.tsx:158-182 serializes the full finish input (about, activity, goal, bmiScale, units, calorieGoal) and calls `done()` without saving only when it equals `savedAnswers`; any changed answer re-runs `finish`, as spec step 5 requires. No new defect found in the repair.

### 13/F-30 [P2] closed - Imperial weight of 44 lb is rejected with "Enter a weight from 44 to 661 lb"

**File:** apps/mobile/src/modules/body/services/setupSchema.ts:45
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** `parseWeight` checks the unrounded kg against 20-300, and 44 lb is 19.958 kg (scratch run of `lbToKg(44)`), so typing the lower bound the message names shows that same message. This applies to current and target weight. The spec states the imperial range as 44 to 661 lb.
**Suggested fix:** Compare the rounded kg (the value that is saved) against the range, or check imperial input against 44-661 lb before converting. No current requirement is lost.
**Resolution:** The imperial message now says "from 45 to 661 lb" (44 lb is 19.96 kg, below the shared 20 kg floor), and the spec states the same range. Closed (2026-10-21 independent review of e9bd83b (fresh subagent, claude-opus-5-5)): setupSchema.ts:37 says 45-661 lb; 45 lb = 20.41 kg and 661 lb = 299.82 kg pass `parseWeight`, 44 lb (19.96 kg) and 662 lb (300.28 kg) fail, so the message bounds are both accepted. Target weight uses the same check and message.

### 13/F-31 [P3] closed - Height and weight errors show under the two-column row, not under their field

**File:** apps/mobile/src/modules/body/components/setup/SetupSteps.tsx:159
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** The spec asks for inline errors under the field. Both messages render after the row, full width, so a weight error appears under the height column too and the two stack when both fail.
**Suggested fix:** Render `errors.height` inside the height column and `errors.weight` inside the weight column. No current requirement is lost.
**Resolution:** Each error now renders inside its own column, under the height or weight field. Closed (2026-10-21 independent review of e9bd83b (fresh subagent, claude-opus-5-5)): SetupSteps.tsx:147 renders the height error inside the height column and :158 the weight error inside the weight column.

### 13/F-32 [P3] closed - "est." on the results hero is a tinted text run, not the prototype's pill badge

**File:** apps/mobile/src/modules/body/components/setup/SetupResults.tsx:48
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** Prototype `.est` is a pill (`padding: 1px 6px; border-radius: 999px; margin-left: var(--space-1)`). A nested `Text` cannot take padding or radius, so the code pads with spaces and shows a square-edged highlight. Small visual drift from frame 5.
**Suggested fix:** Put the label and a small `View` badge (estimateSoft, radius.pill, 6 dp horizontal padding) in a centred row, matching any existing `est.` badge in the app. No current requirement is lost.
**Resolution:** The label and badge are a row; the badge is a View pill (1/6 dp padding, pill radius, estimateSoft) like Today's. Closed (2026-10-21 independent review of e9bd83b (fresh subagent, claude-opus-5-5)): SetupResults.tsx:48-53 is a centred row with a `gap: space[1]` and a View badge (padding 1/6, radius 999, estimateSoft, xs 600 estimate), matching prototype `.est`.

### 13/F-33 [P3] closed - Skip leaves an unhandled promise rejection when marking setup done fails

**File:** apps/mobile/src/app/setup.tsx:187
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** `void skip().finally(...)` still navigates, but `.finally` passes the rejection through, so a failed `markSetupDone` becomes an unhandled rejection (a dev warning) instead of the silent fallback the rest of setup uses.
**Suggested fix:** Add `.catch(() => {})` (setup simply opens again next run) before or after the `finally`. No current requirement is lost.
**Resolution:** Skip now catches a failed `markSetupDone` before navigating, so there is no unhandled rejection; setup simply opens again next run. Closed (2026-10-21 independent review of e9bd83b (fresh subagent, claude-opus-5-5)): setup.tsx:191-193 chains `.catch(() => undefined)` before `.finally`, so no rejection escapes. The navigation call in the same handler has a separate defect, recorded as F-36.

## Independent review

**Status:** passed
**Target commit:** e9bd83b57485f26772bbbfd8ba79199d8ecafce4
**Base commit:** 4d9208df128c5391dd4a98b680735190e2402a3e
**Base ref:** main
**Spec hash:** c095280c35c67c0de74c7767c5c7873011186f5dad2d91f3459720a6460a939c
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-21T09:30:00+08:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T09:13:53+08:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD` / `git merge-base main HEAD` / `sha256sum blueprint/context/current-feature.md` / `git status --porcelain --untracked-files=all`: pass (HEAD, merge base and spec hash match the request; only review.md and findings.md differ)
- `npx tsc --noEmit` (apps/mobile): pass (generated router types already list `/setup`; not regenerated)
- `npx expo lint` (apps/mobile): pass
- `npx expo-doctor` (apps/mobile): pass (21/21 checks)
- Test command: unavailable (no test runner configured)

### Evidence

- Whole delta `4d9208d..e9bd83b` read: setup route, SetupParts/Steps/Results, useSetup, useFirstRun, setupCalc, setupSchema, migration 006 and index, bodyProfileRepo, setupRepo, settingsRepo, body types, Today, Settings and root layout changes.
- Formulas checked by hand against `10_body_progress.md` §2 and the spec: 74.5 kg, 170 cm, 27 y, male, moderate gives BMR 1677.5 (1,678), TDEE 2600.1 (2,600), Steady 2,200, Gentle 2,350, Fast 2,000, macros 165/220/73 g; kg/week 0.25/0.35/0.55; clamp 800-6000 matches `goalSchema`.
- Persisted data: migration 6 only adds the four nullable columns with the spec's CHECK lists; `saveSetup` upserts id 1; `units`/`setup_done` keys JSON-encoded through the shared upsert; `finishSetup` runs profile, units, goal and done flag in one exclusive transaction, then `saveManual` outside it with the weight-only fallback; backup export/restore are column-generic, so the new columns round-trip.
- Validation: ranges and messages match the spec (100-250 cm, 3 ft 4 in to 8 ft 2 in, 20-300 kg, 45-661 lb, 18+); errors render under their own field.
- Navigation: first-launch redirect requires both no goal and no done flag, once per run; Recalculate pushes `/setup?from=settings` at step 1 prefilled; hardware and icon back walk the steps; Skip's `router.replace` traced through expo-router 57 `findDivergentState` and the stack `REPLACE` case (F-36).
- Design: frames 1-5 compared rule by rule against `prototypes/onboarding.html` CSS (content padding/gap, step header, h1/sub, fields and focus ring, segmented, option rows, welcome hero, results hero, metrics, BMI card and scale, macro split, disclaimer); no layout, size, token or copy mismatch beyond the spec's listed gaps.
- Re-examined F-29 to F-33 (closed), F-34 (still open), F-35 (still unverified).

### Findings

- New: F-36 [P2] open, F-37 [P3] open, F-38 [P3] open (needs owner decision), F-39 [P3] open
- Closed: F-29, F-30, F-31, F-32, F-33
- Still open/unverified: F-34 [P3] open, F-35 [P3] unverified
- No P0 or P1 finding is open or fixed

### Remaining risk

- Unit tests unavailable: no test runner is configured, so `setupCalc` and `setupSchema` have no automated coverage.
- Check not run (not required): no on-device evidence of the flow, the first-launch redirect, the Skip navigation, keyboard overlap on step 3, or F-35 input widths.
- Metric tiles ("2,600 kcal" in a third-width tile at 360 dp) may wrap; not verified on a device.
- A hand-edited backup with a malformed `birth_date` would bypass the age check (`ageOn` returns NaN); only reachable through a crafted restore file.

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go. In **Settings**,
tap **Recalculate** under the calorie goal. Enter Male, a birth date about 27 years ago,
170 cm and 74.5 kg, pick **Moderately active**, then **Lose fat** with a 70 kg target and
**Steady**, and tap **See my plan**.

Expected:

The screens follow `prototypes/onboarding.html` frames 2-5. Results show **2,200** kcal
with "est.", "70 kg around" a month about three months away, BMR 1,678, TDEE 2,600,
Deficit −400, a BMI card with the Asia-Pac / WHO toggle, and macros 165 / 220 / 73 g.
**Start tracking** returns to Settings with the goal set to 2,200, and Progress shows
today's 74.5 kg weigh-in.

This proves:

Setup turns your answers into a formula calorie target and saves it with your profile.
