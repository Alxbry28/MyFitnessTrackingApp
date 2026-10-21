# Feature: Body measurements

**From build-plan:** feature 20
**Build attempt:** 1
**Status:** completed
**Branch:** `feature/body-measurements`

## Goal

Step B2 in `1_docs/plan/10_body_progress.md` (§5, §7 Stories J7–J10):
1. **Tracked measurement sites (J7):** Select which body sites to measure (arms, chest, shoulders, waist, hips, thighs, calves, neck, forearms) with bilateral L/R support.
2. **Measurement session logger (J8):** Fast form to log a measurement session with all chosen sites in cm and optional notes; skipped sites stay empty.
3. **Change tracking (J9):** Calculate and display change since first session (start) and since previous session per site and muscle group.
4. **Waist-to-height ratio (J6):** Calculate `waist cm / height cm` (< 0.5 healthy rule of thumb) and display alongside BMI and measurements.
5. **Measurement consistency guide (J10):** In-app guidance on tape placement, breathing, flexed vs relaxed, and measurement frequency (every 2-4 weeks).
6. **Integration:** Display summary and quick entry on Progress tab screen (`/progress`).

## Shipped scope

- **Migration 013 (`013_measurements.ts`):**
  - Table `measurement_sessions`: `id`, `measured_on`, `note`, `created_at`, `updated_at`, `deleted_at`.
  - Table `body_measurements`: `id`, `session_id`, `site`, `side`, `value_cm`, `state`, `created_at`, `updated_at`, `deleted_at`.
  - Altered `body_profile`: added column `tracked_sites TEXT DEFAULT '["chest", "waist", "arm_left", "arm_right", "thigh_left", "thigh_right"]'`.
- **Pure domain logic in `measurementCalc.ts`:**
  - Site definitions across Upper, Arms, Core, and Legs with bilateral sides, default states (flexed/relaxed), and tape placement instructions.
  - Waist-to-height ratio calculation and health risk classification.
  - Change delta computations vs previous session and vs first (baseline) session.
  - Format helpers for cm and delta values (+/- cm).
- **Repositories & hooks (`modules/body/`):**
  - `measurementRepo.ts`: listSessions, getSession, getLatestSession, getFirstSession, saveSession (atomic transaction with cascade), deleteSession, getTrackedSites, saveTrackedSites, getWaistToHeight.
  - Hook `useMeasurements.ts`.
- **Screens & UI Integration:**
  - `apps/mobile/src/app/measurements/index.tsx`: Measurements hub with waist-to-height card, latest measurements with deltas, and session history timeline.
  - `apps/mobile/src/app/measurements/log.tsx`: Session entry form for tracked sites with prefilled hints, note, and save.
  - `apps/mobile/src/app/measurements/sites.tsx`: Customize tracked sites and view measurement consistency guide.
  - `apps/mobile/src/app/(tabs)/progress.tsx`: Added Body Measurements card with waist-to-height ratio badge and latest measurement deltas preview.

## Verification

- `npm run typecheck`: passed clean (0 errors)
- `npx expo lint`: passed clean (0 warnings, 0 errors)
- `npx expo-doctor`: passed clean (21/21 checks passed)
