# Feature: Body measurements

**From build-plan:** feature 20
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/body-measurements`

## Goal

Step B2 in `1_docs/plan/10_body_progress.md` (§5, §7 Stories J7–J10):
1. **Tracked measurement sites (J7):** Select which body sites to measure (arms, chest, shoulders, waist, hips, thighs, calves, neck, forearms) with bilateral L/R support.
2. **Measurement session logger (J8):** Fast form to log a measurement session with all chosen sites in cm and optional notes; skipped sites stay empty.
3. **Change tracking (J9):** Calculate and display change since first session (start) and since previous session per site and muscle group.
4. **Waist-to-height ratio (J6):** Calculate `waist cm / height cm` (< 0.5 healthy rule of thumb) and display alongside BMI and measurements.
5. **Measurement consistency guide (J10):** In-app guidance on tape placement, breathing, flexed vs relaxed, and measurement frequency (every 2-4 weeks).
6. **Integration:** Display summary and quick entry on Progress tab screen (`/progress`).

## In scope

- **Migration 013 (`013_measurements.ts`):**
  - Table `measurement_sessions`: `id`, `measured_on`, `note`, `created_at`, `updated_at`, `deleted_at`.
  - Table `body_measurements`: `id`, `session_id`, `site`, `side`, `value_cm`, `state`, `created_at`, `updated_at`, `deleted_at`.
  - Alter `body_profile`: add column `tracked_sites TEXT DEFAULT '["chest", "waist", "arm_left", "arm_right", "thigh_left", "thigh_right"]'`.
- **Domain logic in `measurementCalc.ts`:**
  - Standard site definitions, muscle groups, bilateral sides, flexed/relaxed states.
  - Waist-to-height ratio and health classification.
  - Changes calculation: current vs last, current vs baseline (first).
  - Site consistency instructions.
- **Repositories & hooks (`modules/body/`):**
  - `measurementRepo.ts`: listSessions, getSession, getLatestSession, getFirstSession, saveSession, deleteSession, getTrackedSites, saveTrackedSites, getWaistToHeight.
  - Hook `useMeasurements.ts`.
- **Screens & UI Integration:**
  - `apps/mobile/src/app/measurements/index.tsx`: Measurements hub with waist-to-height card, latest measurements with deltas, and session history timeline.
  - `apps/mobile/src/app/measurements/log.tsx`: Session entry form for tracked sites with prefilled hints, note, and save.
  - `apps/mobile/src/app/measurements/sites.tsx`: Customize tracked sites and view measurement guide.
  - `apps/mobile/src/app/(tabs)/progress.tsx`: Body Measurements card with waist-to-height and latest measurements summary.

## Out of scope

- Progress photos (Could, J15).
- US Navy body fat % formula (Could, J14).
- Automatic smart tape Bluetooth integration.

## Build steps

- [x] 1. **Database migration & pure logic.** Migration `013_measurements.ts` creating `measurement_sessions`, `body_measurements`, and adding `tracked_sites` to `body_profile`. Types in `modules/body/types/measurements.ts`. Pure logic in `modules/body/services/measurementCalc.ts`. Done when migration registered, typecheck and lint pass.
- [x] 2. **Measurement repository & hooks.** `measurementRepo.ts` with session persistence, history retrieval, change calculations, and tracked sites management. Hook `useMeasurements.ts`. Done when typecheck and lint pass.
- [x] 3. **Measurements hub & history screen.** Screen `apps/mobile/src/app/measurements/index.tsx` showing waist-to-height card, latest site values with deltas (+/- cm since start and last), and past sessions list. Done when typecheck and lint pass.
- [x] 4. **Session logger & site selector screens.** `apps/mobile/src/app/measurements/log.tsx` (entry form with inputs for tracked sites, hints, notes) and `apps/mobile/src/app/measurements/sites.tsx` (site customization toggles and measurement guide). Done when typecheck and lint pass.
- [x] 5. **Progress tab integration.** Update `apps/mobile/src/app/(tabs)/progress.tsx` with a Body Measurements card linking to `/measurements` and showing waist-to-height and recent measurement deltas. Done when typecheck, lint, and `npx expo-doctor` pass.

## Testing

Evidence per step: `npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor` at the end.
