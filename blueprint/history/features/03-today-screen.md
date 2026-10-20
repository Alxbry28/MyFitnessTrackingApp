# Feature: Today screen

**From build-plan:** feature 3
**Build attempt:** 1
**Status:** verified
**Branch:** feature/today-screen

## Goal

Set a daily calorie goal in Settings and open the app to a Today screen that shows
eaten, goal and remaining calories plus a subtotal for each meal. Going over the
goal is shown clearly as information, not an error. PRD acceptance: Today's totals
match a hand calculation for a logged day.

## Design reference

- `prototypes/today.html` frame "Mid-day, dinner not logged": the calorie summary
  (remaining, progress bar, eaten and goal captions) and the meal list with
  subtotals. Recents, quick-add, the scan button and day navigation belong to
  later features.
- `prototypes/settings.html`: the "Daily goal" card with the kcal input and the
  "Save goal" button. Macro targets, TDEE suggestion, display, units and data
  rows belong to later features.
- `1_docs/DESIGN_SYSTEM.md` §6 `CalorieSummary`: when over the goal, the bar is
  full in the over color and the text reads "N kcal over". §9 content style:
  whole kcal with thousands separators, for example "1,240".

## In scope

- **Decision (owner, Oct 20):** the goal is stored in the key/value `settings`
  table from `1_docs/DATABASE.md` §3 under the key `calorie_goal_kcal`, not in
  `daily_nutrition_goals`. Changing the goal applies to every day, including past
  days. Update the *Proposed* note in `1_docs/DATABASE.md` §3 to record this.
- **Migration `003_settings`:** the `settings` table, additive only.
- **`settingsRepo`:**
  - `getCalorieGoal()` returns the stored number, or null when unset or when the
    stored value isn't a finite number.
  - `setCalorieGoal(kcal)` upserts the JSON-encoded value with `updated_at`.
- **Goal validation (`goalSchema`):** a whole number from 800 to 6000 (UX_FLOWS
  §7). The error is "Enter a whole number from 800 to 6000".
- **Settings tab:**
  - A "Daily goal" card with a kcal input prefilled from the saved goal and a
    "Save goal" button that shows "Saved" afterwards.
  - Loading, a load error with Retry, and a save error that keeps the typed
    value.
- **Today tab:**
  - A `CalorieSummary` for today:
    - With a goal: remaining kcal ("N kcal left") or "N kcal over" in the over
      color, a progress bar of eaten over goal (capped at full), and "Eaten N"
      and "Goal N" captions.
    - Without a goal: eaten kcal only, plus a "Set your goal" button that opens
      the Settings tab.
  - The four meals with their kcal subtotal, or "-" when empty. Tapping a meal
    opens the Log tab.
  - Loading and error with Retry. The screen refreshes on focus, so a goal or
    log change elsewhere shows when you come back.
- **Display:** `formatKcal` groups thousands ("2,419"), so the Log tab gets the
  same formatting.

## Out of scope

- Macro goals, the TDEE suggestion and first-run setup (feature 13).
- Recents, favorites and quick-add on Today (6); the scan button (4).
- Day navigation (7); goal history per day (the owner chose a single current
  goal).
- Fixing F-03, the Log tab across midnight. Today reuses the same day logic, and
  the finding stays open for a later fix.

## Build loop

Continuous Mode: steps run in order without review pauses. Each step must keep
`npx tsc --noEmit`, `npx expo lint` and `npx expo-doctor` passing. Checkpoint
commits are disabled; the final feature commit happens at completion.

## Build steps

- [x] **1. Settings storage and goal validation.**
  - Add `src/db/migrations/003_settings.ts` and append it as version 3.
  - Add `src/modules/nutrition/repositories/settingsRepo.ts` (goal get and set,
    bound parameters, JSON value).
  - Add `src/modules/nutrition/services/goalSchema.ts`.
  - Change `formatKcal` to group thousands.
  - Update the note in `1_docs/DATABASE.md` §3.
  - **Done when:** typecheck, lint and expo-doctor pass. A scratch node run
    shows that `formatKcal(2419.4)` is "2,419", and that `goalSchema` accepts
    "2200" and rejects "799", "6001", "2200.5" and "abc".
- [x] **2. Calorie goal in Settings.**
  - Add `src/modules/nutrition/hooks/useCalorieGoal.ts`, which loads on focus and
    saves.
  - Replace the Settings placeholder with the Daily goal card.
  - **Done when:** typecheck and lint pass. On the phone, saving 2200 shows
    "Saved", and reopening Settings shows 2200. Saving 500 shows the range error.
- [x] **3. Today screen.**
  - Add `src/modules/nutrition/components/CalorieSummary.tsx`.
  - Replace the Today placeholder with the summary and the meal subtotals. Reuse
    `useDayLog` for today's groups and totals, and `useCalorieGoal` for the
    goal.
  - **Done when:** typecheck and lint pass. On the phone:
    - With goal 2200 and 760 kcal logged, Today shows "1,440 kcal left", "Eaten
      760" and "Goal 2,200", and the meal subtotals match the Log tab.
    - Logging past the goal shows "N kcal over" in the over color.
    - With no goal, Today shows eaten only and "Set your goal".

## Files / areas

All paths are under `apps/mobile/`, except the docs note.

- New: `src/db/migrations/003_settings.ts`
- New: `src/modules/nutrition/repositories/settingsRepo.ts`
- New: `src/modules/nutrition/services/goalSchema.ts`
- New: `src/modules/nutrition/hooks/useCalorieGoal.ts`
- New: `src/modules/nutrition/components/CalorieSummary.tsx`
- Changed: `src/db/migrations/index.ts`
- Changed: `src/modules/nutrition/services/nutritionCalc.ts`
- Changed: `src/app/(tabs)/index.tsx`, `src/app/(tabs)/settings.tsx`
- Changed: `1_docs/DATABASE.md` (decision note)
- Removed: `src/components/Placeholder.tsx` (unused once Today and Settings are real screens)

## Data / contracts

Migration `003_settings` (version 3):

```sql
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
```

- **Key:** `calorie_goal_kcal`. The value is `JSON.stringify(kcal)` (a whole
  number), and `updated_at` is a UTC ISO string.
- **Write:** `INSERT ... ON CONFLICT(key) DO UPDATE SET value = excluded.value,
  updated_at = excluded.updated_at`.
- **Read:** parse the value with `JSON.parse` inside a try. A missing row, a
  parse failure or a non-finite number returns null, which means "no goal".
  SQLite errors reject and surface as the screen's error state.
- **Calculations:**
  - remaining = goal - eaten.
  - over = eaten - goal, when eaten > goal.
  - bar fraction = min(eaten / goal, 1).
  - All use unrounded totals from `sumTotals`, rounded only for display.
  - "Eaten" is the sum of today's non-deleted entries (ADR-8: only log entries
    count).
- The goal is a single current value. Past days use the current goal, as the
  owner decided.

## Testing

No test runner is configured. `goalSchema` and `formatKcal` are checked with a
scratch node run in step 1. Everything else rests on typecheck, lint,
expo-doctor and the on-phone Done-when checks.

## Notes for the AI

- Run every command from `apps/mobile/`. No new dependencies.
- Follow the feature 1-2 patterns:
  - `makeStyles(theme)` for styles.
  - Hooks own the loading, error and retry states.
  - Route files only compose.
  - Comments only when needed.
- Navigate to tabs with `router.navigate("/settings")` and `router.navigate("/log")`.
- No em dashes in comments or copy.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7272,"specSha256":"097cfaa4bbbeab01eff9ae5fd873cbd00740813645a6cf5ab5ac2587c0c0df47","branch":"refs/heads/feature/today-screen","head":"990c3abbbff80bf4f8c01b7fd6a057a383a2a8d9","baseRef":"refs/heads/main","baseCommit":"13656ce86eafae537e76e840f2a2bcf4d12b327c","sourceTree":"2869aaf7a29bc8c9a96a5a1a308591d2ad2ff557","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 990c3abbbff80bf4f8c01b7fd6a057a383a2a8d9
**Base commit:** 13656ce86eafae537e76e840f2a2bcf4d12b327c
**Base ref:** main
**Spec hash:** 097cfaa4bbbeab01eff9ae5fd873cbd00740813645a6cf5ab5ac2587c0c0df47
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-20T12:32:50Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T12:34:29Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `13656ce86eafae537e76e840f2a2bcf4d12b327c..990c3abbbff80bf4f8c01b7fd6a057a383a2a8d9` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`: pass (HEAD, merge base and spec hash match the request; only review.md differs; spec is tracked)
- `npx tsc --noEmit` (apps/mobile): pass
- `npx expo lint` (apps/mobile): pass
- `npx expo-doctor` (apps/mobile): pass (21/21 checks)
- Scratch `node` run of `formatKcal` and `goalSchema` outside the repo: pass (`formatKcal(2419.4)` is "2,419"; schema accepts "2200", " 2200 ", "800", "6000"; rejects "799", "6001", "2200.5", "abc", "", "Infinity" with the spec message)

## Evidence

- Reviewed all 12 changed files in the delta: migration 003 and registry, settingsRepo, goalSchema, useCalorieGoal, CalorieSummary, Today and Settings routes, formatKcal change, Placeholder removal, DATABASE.md note, spec.
- Security: settings SQL uses bound parameters and a constant key; stored value parsed with JSON.parse in a try with a finite-number guard; no external input or secrets in scope.
- Performance: one keyed SELECT per focus, no loading flicker on refocus (load does not reset status); no unbounded work.
- Quality: Placeholder has no remaining references; hooks own loading/error/retry with stale-request guards matching useDayLog; calculations match the spec (remaining, over, capped bar fraction on unrounded totals).
- Tests: no test runner configured (spec-acknowledged); pure logic exercised by the scratch node run above.

## Findings

- F-04 [P3] open - Today can show "0 kcal over" or "0 kcal left" at the goal boundary

## Remaining risk

- No unit test runner configured; Today and Settings behavior not verified on a device in this review (Check not required).
- Today now uses the same render-time `dayKey(new Date())` as the Log tab, so the midnight staleness in F-03 (explicitly out of scope) now also applies to the landing screen.
- `1_docs/DESIGN_SYSTEM.md` says over-goal uses a `warning` tone, while the spec, prototypes and token palette use `over`; the code follows the spec. Doc drift only.

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go. Open
**Settings**, type `2200` under **Daily goal**, and tap **Save goal**. Then open
**Today**.

Expected:

Settings shows **Saved**. Today shows "N kcal left", where N is 2,200 minus
the kcal logged today (2,200 if nothing is logged), a progress bar, the captions
**Eaten** and **Goal 2,200**, and the four meals with the same subtotals as the
Log tab.

This proves:

The calorie goal persists in settings and Today computes remaining calories and
per-meal subtotals from today's log.
