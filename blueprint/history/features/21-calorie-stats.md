# Feature: Calorie stats

**From build-plan:** feature 21
**Build attempt:** 1
**Status:** completed
**Branch:** `feature/calorie-stats`

## Goal

Step B3 in `1_docs/plan/10_body_progress.md` (§2, §7 Stories J4, J11–J13):
1. **Weekly & 30-day averages (J11):** Calculate 7-day and 30-day average daily intake (calories, protein, carbs, fat) and count days on target.
2. **Learned TDEE (J12):** Calculate estimated maintenance (TDEE). If >= 12 of the last 14 days have food logged and >= 4 weigh-ins exist, use learned TDEE from actual food intake and weight trend (`intake - (deltaWeightKg * 7700 / days)`) labeled "from your data"; otherwise fall back to formula TDEE labeled "estimate".
3. **Suggested target (J13):** Suggest calorie and protein targets tailored to the user's goal (cut / maintain / bulk) and latest weight in g/kg. The suggestion never replaces the current goal without a confirmation tap.
4. **30-day intake chart:** Visual representation of daily calories over the past 30 days against the goal line.
5. **Integration:** Accessible from Progress tab, More tab, and Today summary.

## Shipped scope

- **Pure logic in `calorieStatsCalc.ts`:**
  - 7-day and 30-day daily calorie & macro averages (calories, protein, carbs, fat).
  - Learned TDEE vs Formula TDEE logic: checks criteria (≥12 days of food and ≥4 weigh-ins over 14 days). Calculates daily deficit/surplus and computes actual learned maintenance.
  - Suggested calorie and protein targets tailored to cut, maintain, or bulk goals with user-friendly explanations.
  - Days-on-target adherence calculation (goal-aware thresholds).
- **Repository & hooks (`modules/nutrition/`):**
  - `calorieStatsRepo.ts`: loads 30-day aggregated food logs, 14-day weight entries, body profile, and current goal from settings; provides `updateCalorieGoal`.
  - Hook `useCalorieStats.ts`: provides computed stats, chart data, and `acceptSuggestion` mutation.
- **Screens & UI Integration:**
  - `apps/mobile/src/app/calorie-stats.tsx`: dedicated screen with TDEE maintenance card, suggested target with accept button, 7-day and 30-day macro averages, days-on-target progress bar, and 30-day visual daily intake bar chart.
  - `apps/mobile/src/app/(tabs)/progress.tsx`: added Calorie Stats & TDEE card with maintenance and 7-day intake preview.
  - `apps/mobile/src/app/(tabs)/more.tsx`: added "Calorie Stats" navigation item.

## Verification

- `npm run typecheck`: passed clean (0 errors)
- `npx expo lint`: passed clean (0 warnings, 0 errors)
- `npx expo-doctor`: passed clean (21/21 checks passed)
