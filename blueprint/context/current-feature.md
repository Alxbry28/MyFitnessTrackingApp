# Feature: Workouts

**From build-plan:** feature 19
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/workouts`

## Goal

Epic H in `1_docs/business_analyst/user_story/01_user_story.md` (§3, H1-H4, H8):
1. **Exercise library (H3):** Built-in catalog of strength and bodyweight exercises categorized by muscle group and equipment, plus user-created custom exercises with search and filtering.
2. **Start / in-progress workout session (H1, Acceptance criteria):** Start a workout session. An unfinished workout is never lost (saved in SQLite after every set).
3. **Previous performance hints (H2):** When logging an exercise, show what was lifted last time (e.g. "Last: 60 kg × 8, 8, 7") from user's own history.
4. **Fast set logging (Acceptance criteria):** Adding a set pre-fills weight and reps from the previous set so logging takes 2 taps or fewer. Support bodyweight exercises with reps only or added weight (H8).
5. **Workout history (H4):** View past sessions by date with exercises, sets, volume, and notes.
6. **Integration:** Accessible from More tab, with today's workout status on Today screen.

## In scope

- **Migration 012 (`012_workouts.ts`):**
  - Table `exercises`: `id`, `name`, `muscle_group`, `equipment`, `is_bodyweight`, `guide_id`, `created_at`, `updated_at`, `deleted_at`. Seeds standard exercises.
  - Table `workout_sessions`: `id`, `name`, `started_at`, `ended_at`, `notes`, `created_at`, `updated_at`, `deleted_at`.
  - Table `workout_sets`: `id`, `session_id`, `exercise_id`, `set_number`, `reps`, `weight_kg`, `duration_sec`, `rpe`, `is_warmup`, `is_completed`, `created_at`, `updated_at`, `deleted_at`.
- **Pure domain logic in `workoutCalc.ts`:**
  - Formatter for previous performance (e.g. "60 kg × 8, 8, 7" or "BW × 10, 10").
  - Session stats calculation (duration, total volume in kg, total sets, total reps).
  - Personal record (PR) calculation against previous history.
- **Repositories & hooks (`modules/workouts/`):**
  - `exerciseRepo.ts`: list, search, create custom exercise, get previous performance for an exercise.
  - `workoutRepo.ts`: start, get active session, add set, update set, delete set, finish session, list history.
  - Hooks `useActiveWorkout.ts`, `useWorkoutHistory.ts`, `useExerciseLibrary.ts`.
- **Screens:**
  - `apps/mobile/src/app/workouts/index.tsx`: Workouts hub with Active Workout card, Start Workout action, and past history.
  - `apps/mobile/src/app/workouts/[id].tsx`: Active session logger with exercise cards, set rows, previous hints, and finish button.
  - `apps/mobile/src/app/workouts/exercises.tsx`: Exercise library browser with search, muscle group chips, and add custom exercise.
  - `apps/mobile/src/app/(tabs)/more.tsx`: Add "Workouts" navigation item.
  - `apps/mobile/src/app/(tabs)/index.tsx`: Show today's workout card on Today screen.

## Out of scope

- Rest timer audio alerts (Should, H7).
- Exercise video streaming (art is local reference).
- Cloud sync (feature 17).

## Build loop

Continuous Mode: steps run in order without review pauses. Each step keeps
`npx tsc --noEmit` and `npx expo lint` passing, and `npx expo-doctor` runs at
the end. Checkpoint commits are disabled.

## Build steps

- [x] 1. **Database migration & seeded exercise library.** Migration `012_workouts.ts` creating tables `exercises`, `workout_sessions`, `workout_sets` and seeding standard exercises across chest, back, legs, shoulders, arms, and core. Types in `modules/workouts/types/workouts.ts`. Pure logic in `modules/workouts/services/workoutCalc.ts`. Done when migration registered, typecheck and lint pass.
- [x] 2. **Workout & exercise repositories and hooks.** `exerciseRepo.ts` (list, search, custom, previous performance) and `workoutRepo.ts` (active session, start, log set, finish, history). Hooks `useActiveWorkout.ts`, `useWorkoutHistory.ts`, `useExerciseLibrary.ts`. Done when typecheck and lint pass.
- [x] 3. **Exercise library screen & picker.** Screen `apps/mobile/src/app/workouts/exercises.tsx` with search, muscle group chips, and custom exercise modal. Done when typecheck and lint pass.
- [x] 4. **Active workout session logger.** Screen `apps/mobile/src/app/workouts/[id].tsx` with exercise cards, previous performance hints, set rows, pre-filled new sets, add exercise, and finish workout. Done when typecheck and lint pass.
- [x] 5. **Workouts hub & history.** Screen `apps/mobile/src/app/workouts/index.tsx` showing active session card, start workout, and history list. Link in `(tabs)/more.tsx` and Today screen widget in `(tabs)/index.tsx`. Done when typecheck, lint, and `npx expo-doctor` pass.

## Testing

Evidence per step: `npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor`
at the end.
