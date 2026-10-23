# Feature: 30c Workouts Screen to Prototype

**From build-plan:** feature 30c
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/workouts-prototype`

## Goal

Match the Workouts mobile experience to the approved prototype contract in `prototypes/workouts.html`:
1. **Frame 1 - Workouts Hub:** Header with weekly count and direct Exercise library link; active resume banner with pulsing dot timer and next set info; quick action buttons; recent session cards with 3-metric stats and exercise preview with best sets & PR badges.
2. **Frame 2 - Active Logger:** Top bar with live timer pill and green Finish button; floating/docked rest timer bar with -15s/+15s/skip; exercise cards with anatomical art thumbnails (`@bryllim/workout-guide` style), previous performance hints, set table (warmup 'W', previous, kg, reps, checkmark), 2-tap set completion with prefill.
3. **Frame 3 - Exercise Library & Picker:** Art thumbnails, search with clear button, muscle group filter chips, exercise metadata with last performance, custom exercise creation, and CC BY-SA 4.0 attribution.
4. **Frame 4 - Workout Summary & PR Breakdown:** Completed workout view with 4-box hero stats (Duration, Volume, Sets, PRs), session notes, exercise-by-exercise breakdown with Est. 1RM and PR badges (Weight PR / Volume PR), and "Repeat this workout" button.

## Steps

- [x] **Step 1: Theme tokens & exercise art thumbnail component**
  - Add workout-specific tokens (`pr`, `prSoft`, `timer`, `timerSoft`, `warmup`, `warmupSoft`, `rpe`, `rpeSoft`, `artBg`, `artInk`, `artMuscle`, `artSecondary`) to `apps/mobile/src/lib/theme/tokens.ts`.
  - Create `apps/mobile/src/modules/workouts/components/ExerciseArtThumb.tsx` with SVG anatomical illustrations per exercise/category.
- [x] **Step 2: PR calculation, 1RM estimates & session helpers in domain logic**
  - Add PR detection (Weight PR, Volume PR), 1RM estimation (Epley formula), workouts-this-week count, and session repetition in `workoutCalc.ts` and `workoutRepo.ts`.
- [x] **Step 3: Rebuild Workouts Hub (Frame 1)**
  - Update `apps/mobile/src/app/workouts/index.tsx` to match Frame 1: active workout banner with timer and discard/resume, quick actions, and recent session cards with 3-stat metrics and exercise preview.
- [x] **Step 4: Rebuild Active Workout Logger with Rest Timer (Frame 2)**
  - Update `apps/mobile/src/app/workouts/[id].tsx` to match Frame 2: timer pill, floating rest timer strip with countdown and adjustments, set table with previous hints, 2-tap set logging, prefilled sets.
- [x] **Step 5: Rebuild Exercise Library & Picker (Frame 3)**
  - Update `apps/mobile/src/app/workouts/exercises.tsx` to match Frame 3: art thumbnails, search with clear, muscle group chips, last performance hints, and CC BY-SA 4.0 attribution.
- [x] **Step 6: Implement Workout Summary Screen (Frame 4)**
  - Create/route the completed workout summary screen to match Frame 4: hero metric boxes, notes, PR badges, and "Repeat this workout".
- [x] **Step 7: Verification & Typecheck**
  - Run typecheck and linting across the mobile app.

## Done when

- Workouts Hub displays active workout banner (if running) and recent sessions with stats and exercise previews matching Frame 1.
- Active logger has floating rest timer with +/-15s and skip controls, and sets can be logged in 2 taps matching Frame 2.
- Exercise library displays anatomical art thumbnails and CC BY-SA 4.0 attribution matching Frame 3.
- Completed workout displays the Summary screen with 4 hero boxes and PR breakdown matching Frame 4, with "Repeat this workout" working.
- `npm run typecheck` and `npx expo lint` pass with 0 errors.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3646,"specSha256":"0ffeac2e7d976729ffb2c50bf305c89ba3066606fdc87a54846f7115cbf962fc","branch":"refs/heads/feature/workouts-prototype","head":"2ffa2847f5b43c8e7706781729a674aff8a169c9","baseRef":"refs/heads/main","baseCommit":"2ffa2847f5b43c8e7706781729a674aff8a169c9","sourceTree":"d38e4ef5948112b95afbbd6ced1510500808dee9","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go on Android.
Navigate to **More** -> **Workouts**:
1. Verify the Workouts Hub: weekly workout count header, active workout banner (if running), Quick actions ("New Empty Workout", "From Routine"), and Recent Workouts with PR badges and best set previews.
2. Tap "New Empty Workout" or an exercise to log sets: verify the top bar timer pill, anatomical exercise art thumbnails, set table with previous hints, 2-tap set completion, and floating rest timer bar with -15s/+15s/skip.
3. Tap "Exercise library" / "Add Exercise": verify search, category filter chips, and anatomical artwork with CC BY-SA 4.0 attribution.
4. Complete a workout: verify the Workout Summary screen displaying 4 hero stat boxes (Duration, Volume, Sets, PRs), session notes, Est. 1RM badges, and the "Repeat this workout" action button.

Expected:

Workouts Hub, Active Logger, Exercise Library, and Workout Summary match the design contract and user flow from `prototypes/workouts.html`.

This proves:

The Workouts mobile screens and routine/session tracking adhere to the prototype spec with full offline SQLite persistence.
