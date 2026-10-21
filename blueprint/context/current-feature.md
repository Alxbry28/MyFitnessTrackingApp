# Feature: Calorie stats

**From build-plan:** feature 21
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/calorie-stats`

## Goal

Step B3 in `1_docs/plan/10_body_progress.md` (§2, §7 Stories J4, J11–J13):
1. **Weekly & 30-day averages (J11):** Calculate 7-day and 30-day average daily intake (calories, protein, carbs, fat) and count days on target.
2. **Learned TDEE (J12):** Calculate estimated maintenance (TDEE). If >= 12 of the last 14 days have food logged and >= 4 weigh-ins exist, use learned TDEE from actual food intake and weight trend (`intake - (deltaWeightKg * 7700 / days)`) labeled "from your data"; otherwise fall back to formula TDEE labeled "estimate".
3. **Suggested target (J13):** Suggest calorie and protein targets tailored to the user's goal (cut / maintain / bulk) and latest weight in g/kg. The suggestion never replaces the current goal without a confirmation tap.
4. **30-day intake chart:** Visual representation of daily calories over the past 30 days against the goal line.
5. **Integration:** Accessible from Progress tab, More tab, and Today summary.

## In scope

- **Pure logic in `calorieStatsCalc.ts`:**
  - 7-day and 30-day daily calorie & macro averages.
  - Learned TDEE vs Formula TDEE resolution and labeling.
  - Suggested calorie and protein targets with explanation.
  - Days-on-target adherence calculation.
- **Repository & hooks (`modules/nutrition/`):**
  - `calorieStatsRepo.ts`: loads 30-day food log daily totals, 14-day weight entries, body profile, and current goal.
  - Hook `useCalorieStats.ts`: provides computed stats, chart data, and `acceptSuggestion` mutation.
- **Screens & UI Integration:**
  - `apps/mobile/src/app/calorie-stats.tsx`: dedicated Calorie Stats & TDEE screen with TDEE card, accept suggestion button, macro averages, days on target, and 30-day chart.
  - `apps/mobile/src/app/(tabs)/progress.tsx`: Calorie Stats summary card with TDEE and 7-day average.
  - `apps/mobile/src/app/(tabs)/more.tsx`: Navigation link to Calorie Stats.

## Out of scope

- Smartwatch automatic burned calorie sync (Could, J3).
- Training/rest day alternating calorie cycling (Could, J3).

## Build steps

- [x] 1. **Pure domain logic & calculations.** `apps/mobile/src/modules/nutrition/services/calorieStatsCalc.ts` with 7/30-day averages, learned TDEE formula, fallback logic, suggested targets, and days on target. Done when typecheck and lint pass.
- [x] 2. **Repository & query hook.** `apps/mobile/src/modules/nutrition/repositories/calorieStatsRepo.ts` and `apps/mobile/src/modules/nutrition/hooks/useCalorieStats.ts` loading food log totals, weight history, profile, and current goal with goal update handler. Done when typecheck and lint pass.
- [x] 3. **Calorie stats screen.** Screen `apps/mobile/src/app/calorie-stats.tsx` featuring TDEE badge & explanation, suggested target confirmation action, weekly/monthly macro breakdown, days on target adherence, and 30-day bar chart. Done when typecheck and lint pass.
- [x] 4. **Progress & navigation integration.** Add Calorie Stats card to `(tabs)/progress.tsx` and menu entry to `(tabs)/more.tsx`. Done when typecheck, lint, and `npx expo-doctor` pass.

## Testing

Evidence per step: `npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor` at the end.
