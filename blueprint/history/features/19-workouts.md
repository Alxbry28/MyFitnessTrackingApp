# Feature: Workouts

**From build-plan:** feature 19
**Build attempt:** 1
**Status:** completed
**Branch:** `feature/workouts`

## Goal

Epic H in `1_docs/business_analyst/user_story/01_user_story.md` (§3, H1-H4, H8):
1. **Exercise library (H3):** Built-in catalog of strength and bodyweight exercises categorized by muscle group and equipment, plus user-created custom exercises with search and filtering.
2. **Start / in-progress workout session (H1, Acceptance criteria):** Start a workout session. An unfinished workout is never lost (saved in SQLite after every set).
3. **Previous performance hints (H2):** When logging an exercise, show what was lifted last time (e.g. "Last: 60 kg × 8, 8, 7") from user's own history.
4. **Fast set logging (Acceptance criteria):** Adding a set pre-fills weight and reps from the previous set so logging takes 2 taps or fewer. Support bodyweight exercises with reps only or added weight (H8).
5. **Workout history (H4):** View past sessions by date with exercises, sets, volume, and notes.
6. **Integration:** Accessible from More tab, with today's workout status on Today screen.

## Shipped scope

- **Migration 012 (`012_workouts.ts`):**
  - Table `exercises`: `id`, `name`, `muscle_group`, `equipment`, `is_bodyweight`, `guide_id`, `created_at`, `updated_at`, `deleted_at`. Seeds 17 standard exercises across chest, back, legs, shoulders, arms, and core.
  - Table `workout_sessions`: `id`, `name`, `started_at`, `ended_at`, `notes`, `created_at`, `updated_at`, `deleted_at`.
  - Table `workout_sets`: `id`, `session_id`, `exercise_id`, `set_number`, `reps`, `weight_kg`, `duration_sec`, `rpe`, `is_warmup`, `is_completed`, `created_at`, `updated_at`, `deleted_at`.
- **Pure domain logic in `workoutCalc.ts`:**
  - Formatter for previous performance (e.g. "60 kg × 8, 8, 7" or "BW × 10, 10").
  - Session stats calculation (duration in minutes, total volume in kg, total sets, total reps).
  - Format helpers for duration and volume (kg / metric tons).
- **Repositories & hooks (`modules/workouts/`):**
  - `exerciseRepo.ts`: list, search, create custom exercise, get previous performance for an exercise.
  - `workoutRepo.ts`: start session, get active session, add set, update set, delete set, finish session, delete session, update name, update notes, list history, get today's session.
  - Hooks `useActiveWorkout.ts`, `useWorkoutHistory.ts`, `useExerciseLibrary.ts`.
- **Screens & UI Integration:**
  - `apps/mobile/src/app/workouts/index.tsx`: Workouts hub with Active Workout card (resume / discard), start empty workout button, and history list.
  - `apps/mobile/src/app/workouts/[id].tsx`: Active session logger with exercise cards, set rows (set number, previous hint, kg, reps, checkmark), add set, add exercise picker sheet, workout notes, and finish workout prompt.
  - `apps/mobile/src/app/workouts/exercises.tsx`: Exercise library browser with search bar, muscle group chips (All, Chest, Back, Legs, Shoulders, Arms, Core), and custom exercise creation modal.
  - `apps/mobile/src/app/(tabs)/more.tsx`: Added "Workouts" menu item.
  - `apps/mobile/src/app/(tabs)/index.tsx`: Added today's workout widget under calorie summary to indicate in-progress or completed session.

## Verification

- `npm run typecheck`: passed clean (0 errors)
- `npx expo lint`: passed clean (0 warnings, 0 errors)
- `npx expo-doctor`: passed clean (21/21 checks passed)
