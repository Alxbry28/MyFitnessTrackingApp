# Feature: Body weight and BMI

**From build-plan:** feature 11
**Build attempt:** 1
**Status:** verified
**Branch:** feature/body-weight-and-bmi

## Goal

Log body weight in two taps from Today, see a 7-day average trend and the change
against the previous week, and see BMI with its category on a new Progress tab.
A minimal body profile (height, BMI scale) feeds BMI. Weight history from the
Xiaomi scale's CSV export imports with a preview, skips duplicates, never
replaces typed weights, and can be undone.

## Design reference

- `prototypes/progress.html` frame 1: the weight card (7-day average, change
  this week, dot chart with trend) and the BMI card (value, category, scale
  name, height, "BMI can't tell muscle from fat" note). Measurements and the
  Calendar segment are later features.
- `prototypes/measure.html` frame 2 (log weight sheet: − value + stepper,
  yesterday and 7-day average hint, tip) and frame 3 (import preview: file,
  date range, new, already in app, to review, "Nothing is saved until you
  import", Cancel / Import N).
- `1_docs/plan/10_body_progress.md` §3, §4, §5b import rules, §7 J1/J5/J6/J17
  acceptance, §8 data model.
- `1_docs/DATABASE.md` §4 Body and §6 Xiaomi CSV import;
  `1_docs/SECURITY.md` (Xiaomi CSV is untrusted input).
- Owner decisions (Oct 20, memory `build-decisions-oct-2026`): kg and cm only,
  Asia-Pacific BMI by default, a minimal profile form (height, BMI scale) that
  feature 13 extends, `expo-document-picker` approved for the import.
- Default styles; the chart is drawn with plain Views (no chart library yet).

## In scope

- **Dependency (owner-approved Oct 20):** `expo-document-picker` via
  `npx expo install`.
- **Migration `004_body`:** `body_profile`, `import_runs`,
  `body_weight_entries` (see Data / contracts).
- **Pure services (`src/modules/body/services/`):**
  - `weightCalc.ts`: daily values, 7-day trend and previous-week change, BMI,
    BMI category per scale, chart points, kg formatting.
  - `weightSchema.ts`: weight 20 to 300 kg, comma decimal allowed.
  - `profileSchema.ts`: height 100 to 250 cm, scale `asia_pacific` or `who`.
  - `weightCsv.ts`: CSV parsing and the import plan (dedupe, review flag).
- **Weight sheet (`/weight`, optional `id` param):**
  - New entry: weight prefilled with the latest daily weight (empty when
    none), − and + buttons step 0.1 kg, the day defaults to today and a date
    picker allows past days (never future).
  - Hint line: "Yesterday 69.8 · 7-day average 69.6" (parts shown only when
    known). Tip: "Weigh in the morning, after the bathroom, before eating."
  - One manual weight per day: saving for a day that already has a manual
    weight updates that entry, and the sheet says "Replaces the 69.8 kg you
    logged for this day."
  - Edit (`id`): same form with the entry's weight and day, plus Delete with a
    confirm alert. Missing entry shows "This weigh-in doesn't exist anymore."
  - Save button "Save 69.4 kg"; errors show "Couldn't save your weight. Try
    again." and keep the form.
- **Today:** a "Log weight" secondary button under Scan opens `/weight`.
- **Progress tab** (between Log and Products; tab bar becomes Today · Log ·
  Products · Progress · Settings until Pantry adds More):
  - Header action "+ Log weight".
  - Weight card: "Weight · 7-day average", value in kg, "−0.4 kg vs last
    week" (only when both weeks have weights), latest weigh-in line, and a dot
    chart of the last 30 days (daily values) with the 7-day trend as accent
    dots. Empty state: "No weigh-ins yet" and a Log weight button.
  - BMI card: BMI to one decimal, category, scale name, height, the note "BMI
    can't tell muscle from fat." and "Estimate, not medical advice." No height:
    "Add your height to see your BMI" with a button to `/body-profile`. No
    weight: "Log a weight to see your BMI".
  - Recent weigh-ins: the last 14 days of readings, newest first, each with
    day, time, kg and source ("Typed" / "Imported"); tap opens `/weight?id=`.
  - Loading, and an error state with Retry.
- **Body profile (`/body-profile`):** height in cm and a two-option BMI scale
  choice (Asia-Pacific, the default, or WHO). Save returns to Progress.
- **Weight history import (`/import-weight`, linked from Settings "Your
  data"):**
  - "Choose CSV file" opens the document picker. Files over 5 MB are refused.
  - The preview shows the file name, date range, readings found, "N new",
    "N already in app", "N to review" (more than 5 kg off your usual weight,
    listed up to 5 with day, time and kg, not imported), and "N rows couldn't
    be read" when any. Text: "Nothing is saved until you import. Weights you
    typed yourself are never replaced. You can undo this import later."
  - "Import N" writes everything in one transaction and shows "Imported N
    weigh-ins". Cancel clears the preview. Import is disabled when N is 0.
  - Errors: "That file has no time and weight columns." / "That file is empty
    or isn't a CSV." / "That file is too big (over 5 MB)." / "Couldn't read
    that file." / "Couldn't import. Nothing was saved."
  - Last import: "Last import Oct 20: 388 weigh-ins" with "Undo import" and a
    confirm alert. Undo soft-deletes that run's entries and marks it undone.
- **JSON export:** `body_profile`, `body_weight_entries` and `import_runs`
  join the backup tables; the success line adds "N weigh-ins".

## Out of scope

- Health Connect sync (feature 22), measurements and waist-to-height (20),
  TDEE and calorie stats (13, 21).
- Sex, birth date, activity level, goal and tracked sites in the profile
  (feature 13 adds columns), a units setting (kg and cm only).
- Body fat, muscle and water columns and their import (later, with 22).
- Picking a different reading as a day's weight (`is_daily_value`); the daily
  value is calculated instead.
- Restoring a backup (14), a More tab (comes with Pantry, 8).

## Build loop

Continuous Mode: steps run in order without review pauses. Each step must keep
`npx tsc --noEmit`, `npx expo lint` and `npx expo-doctor` passing. Checkpoint
commits are disabled; the final feature commit happens at completion.

## Build steps

- [x] **1. Install the document picker.**
  - `npx expo install expo-document-picker`.
  - **Done when:** `package.json` lists it and expo-doctor passes.
- [x] **2. Schema and backup tables.**
  - Add `src/db/migrations/004_body.ts` and register version 4.
  - Add the three tables to `BACKUP_TABLES`; ExportCard adds the weigh-in
    count.
  - Note in `1_docs/DATABASE.md` §4 that `is_daily_value` and body composition
    columns are deferred and the daily value is calculated.
  - **Done when:** typecheck and lint pass, and a scratch `node:sqlite` run of
    migrations 1 to 4 creates the tables and rejects a `weight_kg` of 0 and an
    unknown `source` or `bmi_scale`.
- [x] **3. Weight and BMI calculations.**
  - Add `src/modules/body/types/body.ts`, `services/weightCalc.ts`,
    `services/weightSchema.ts`, `services/profileSchema.ts`.
  - **Done when:** a scratch node run shows: 70 kg at 170 cm gives BMI 24.2,
    "At risk" on Asia-Pacific and "Normal" on WHO; a manual reading wins over an
    earlier imported one on the same day, otherwise the first reading of the day
    is the daily value; seven days averaging 70.0 after a week averaging 70.4
    gives "−0.4 kg"; a single week gives no change.
- [x] **4. Repositories and hooks.**
  - Add `repositories/bodyProfileRepo.ts`, `repositories/weightRepo.ts` and
    hooks `useProgress`, `useWeightEntry`, `useBodyProfile`.
  - **Done when:** typecheck and lint pass, and a scratch `node:sqlite` run of
    the save-or-replace SQL keeps one manual row per day.
- [x] **5. Weight sheet and Today shortcut.**
  - Add `src/app/weight.tsx`, `src/modules/body/components/WeightForm.tsx`,
    register the route, and add "Log weight" to Today.
  - **Done when:** typecheck and lint pass. On the phone: Today → Log weight →
    Save logs today's weight in two taps; logging again the same day replaces
    it; edit and delete work.
- [x] **6. Progress tab and body profile.**
  - Add `src/app/(tabs)/progress.tsx`, `src/app/body-profile.tsx`, components
    `WeightCard`, `WeightChart`, `BmiCard`, `WeighInRow`, and the tab icon.
  - **Done when:** typecheck and lint pass. On the phone: the tab shows the
    trend and change; BMI asks for height until it's saved, then shows the
    value and category, and switching to WHO changes the category.
- [x] **7. CSV parsing and import plan.**
  - Add `services/weightCsv.ts` (`parseWeightCsv`, `planImport`).
  - **Done when:** a scratch node run shows: a Zepp Life style file
    (`time,weight,...` with `+0000` offsets), a `Date,Weight (lb)` file, and a
    semicolon file all parse; 400 readings with 12 already in the app preview
    as 388 new and 12 skipped; a reading 6 kg off is flagged for review; a
    header without weight returns `no_columns`; bad rows are counted.
- [x] **8. Import screen and undo.**
  - Add `src/app/import-weight.tsx`, `services/importWeights.ts` (picker, size
    check, read), the import and undo repository functions, and the Settings
    link.
  - **Done when:** typecheck, lint and expo-doctor pass. On the phone: picking
    a CSV shows the preview, Import adds the readings and Progress updates,
    importing the same file again shows 0 new, and Undo import removes them.

## Files / areas

All paths are under `apps/mobile/`.

- Changed: `package.json`, `package-lock.json`, `app.json` (if the picker adds
  a plugin)
- New: `src/db/migrations/004_body.ts`; changed: `src/db/migrations/index.ts`
- Changed: `src/modules/backup/repositories/backupRepo.ts`,
  `src/modules/backup/services/exportBackup.ts`,
  `src/modules/backup/components/ExportCard.tsx`
- New: `src/modules/body/` (types, services, repositories, hooks, components)
- New: `src/app/weight.tsx`, `src/app/body-profile.tsx`,
  `src/app/import-weight.tsx`, `src/app/(tabs)/progress.tsx`
- Changed: `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`,
  `src/app/(tabs)/index.tsx`, `src/app/(tabs)/settings.tsx`
- Changed: `1_docs/DATABASE.md`

## Data / contracts

- **`body_profile`:** `id INTEGER PRIMARY KEY CHECK (id = 1)`, `height_cm REAL
  CHECK (height_cm BETWEEN 100 AND 250)`, `bmi_scale TEXT NOT NULL DEFAULT
  'asia_pacific' CHECK (bmi_scale IN ('asia_pacific','who'))`, `updated_at`.
  One row, upserted.
- **`import_runs`:** `id TEXT PK`, `source TEXT NOT NULL CHECK (source IN
  ('csv_import'))`, `file_name`, `started_at`, `found`, `added`, `skipped`
  (integers), `undone_at`.
- **`body_weight_entries`:** `id TEXT PK`, `day` (local `YYYY-MM-DD`),
  `measured_at` (UTC ISO), `weight_kg REAL NOT NULL CHECK (weight_kg > 0)`,
  `source TEXT NOT NULL CHECK (source IN
  ('manual','health_connect','apple_health','csv_import'))`,
  `source_record_id`, `import_run_id REFERENCES import_runs(id)`, `note`,
  `created_at`, `updated_at`, `deleted_at`. Index on `day` for live rows.
- **Manual entries:** `measured_at` is now for today, local noon for a past
  day. One live manual row per day: save updates it when present.
- **Daily value:** the day's latest-updated manual reading if any, else the
  earliest reading by `measured_at`. Calculated, never stored (ADR-9).
- **Trend:** mean of daily values in `[today−6, today]`; previous week
  `[today−13, today−7]`; change shown when both have at least one value,
  rounded to 0.1 kg. Chart: daily values of the last 30 days and, for each
  such day, the mean of daily values in its own 7-day window.
- **BMI:** latest daily value ÷ (height m)², one decimal. Asia-Pacific:
  <18.5 Underweight, <23 Normal, <25 At risk, else Obese. WHO: <18.5
  Underweight, <25 Normal, <30 Overweight, else Obese. Category uses the
  rounded value.
- **CSV parsing (untrusted input):**
  - Text up to 5 MB; delimiter comma or semicolon (whichever the header has
    more of); quoted fields with `""` escapes; a UTF-8 BOM is stripped.
  - Time column: first header matching `time`, `timestamp`, `date`,
    `datetime` or containing "time" or "date". Weight column: first header
    containing "weight" (case-insensitive).
  - Unit from the weight header: `lb`/`lbs` → ×0.45359237, `jin`/`斤` → ×0.5,
    otherwise kg.
  - Time values: unix seconds (10 digits) or milliseconds (13 digits);
    `YYYY-MM-DD` or `YYYY/MM/DD` with optional `[ T]HH:MM[:SS]` and optional
    `Z`, `±HH:MM` or `±HHMM` (no offset means local time; a date alone means
    local noon).
  - A row is unreadable when the time or weight doesn't parse, the weight is
    outside 20 to 300 kg after conversion, or the time is more than a day in
    the future. Weights are stored rounded to 0.01 kg.
  - Results: `{ ok: true, readings, unreadable }` or `{ ok: false, error:
    "empty" | "no_columns" }`.
- **Import plan:** a reading is a duplicate when an existing live entry or an
  earlier reading in the same file is within 2 minutes and 0.05 kg. "Usual
  weight" is the median of existing daily values plus the file's readings; a
  non-duplicate reading more than 5 kg from it goes to review and is not
  imported. `skipped` counts duplicates plus review readings.
- **Errors:** repository failures are caught at the screen boundary and shown
  as the messages above. Import runs in one transaction, so a failure saves
  nothing.

## Testing

No test runner is configured. `weightCalc`, the schemas and `weightCsv` are
pure and checked with scratch node runs; migration SQL and the replace logic
are checked with `node:sqlite`. The picker, sheets and charts need the
on-phone Done-when checks.

## Notes for the AI

- Read the installed `expo-document-picker` types for the SDK 57 API; read the
  file with `expo-file-system` `File`.
- Follow the existing patterns: `makeStyles`, thin routes, focus reload like
  `useCalorieGoal`, ids from `expo-crypto` `randomUUID`, no em dashes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":13913,"specSha256":"19ce6ef8b2a3c681ab10a3f6db225a74a7b5eb9f88a5dee1c533236124f9661a","branch":"refs/heads/feature/body-weight-and-bmi","head":"892883beb91594a23860661aa616e3ace7d44997","baseRef":"refs/heads/main","baseCommit":"3c9133b841ce509d9d6b9603023abfa1dc7e88f1","sourceTree":"daf8a7773796db13f2c69de1fe283fbd2313ff73","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 892883beb91594a23860661aa616e3ace7d44997
**Base commit:** 3c9133b841ce509d9d6b9603023abfa1dc7e88f1
**Base ref:** main
**Spec hash:** 19ce6ef8b2a3c681ab10a3f6db225a74a7b5eb9f88a5dee1c533236124f9661a
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-20T13:59:42Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T14:03:01Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `3c9133b841ce509d9d6b9603023abfa1dc7e88f1..892883beb91594a23860661aa616e3ace7d44997` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `git rev-parse HEAD` / `git merge-base HEAD main` / `sha256sum blueprint/context/current-feature.md`: pass (match Target, Base, Spec hash)
- `git ls-files -o -i --exclude-standard -- apps/mobile/src`: pass (no ignored source files; all 22 new body/route/migration files are in the target tree)
- `npx tsc --noEmit` (apps/mobile): pass
- `npx expo lint` (apps/mobile): pass
- Scratch `node --experimental-strip-types` runs of `weightCsv` and `weightCalc` outside the repo: pass (BOM, CRLF, quoted semicolon lb header, unix seconds, invalid dates, empty and no_columns cases, 2-minute duplicate, BMI 24.2 At risk / Normal)

## Evidence

- Full delta read: migration 004, migrations index, body types/services/repositories/hooks/components, the four new routes, Today/Settings/tab/root layout changes, backup table list and export summary, DATABASE.md note.
- Migration 004 is a new append-only file; CHECK constraints match the spec (weight_kg > 0, source and bmi_scale enums, single-row profile, height 100 to 250).
- All CSV values reach SQLite only through bound parameters; the cached picker copy is deleted in `finally`; the 5 MB limit is checked before reading.
- `saveManual` and `importReadings`/`undoImport` run inside `withExclusiveTransactionAsync`; one-manual-per-day replace holds for new entries and for manual edits moved onto another day.
- Daily value, 7-day trend, previous-week change and BMI category (on the rounded value) match the spec formulas.
- Loading and error-with-Retry states are reachable on Progress, Weight sheet and Body profile; import errors map to the spec messages.
- Scratch run of a 300-day 85 to 70 kg history planned 200 new and 100 to review (F-08).

## Findings

- F-08 [P2] open: import holds back legitimate history when weight changed more than 10 kg (global-median review rule)
- F-09 [P3] open: first six chart trend dots use incomplete 7-day windows
- F-10 [P3] open: editing an imported reading shows "Replaces..." copy but replaces nothing
- F-11 [P3] open: export success line counts deleted and undone weigh-ins

## Remaining risk

- `blueprint/context/project-overview.md` has an uncommitted edit from another session that is outside the review target; it was not reviewed or modified, and it must be resolved before freshness checks at `/complete` will treat this receipt as current.
- `npx expo-doctor` was not run in this review.
- Not observed on a device: document picker behavior, the plain-View chart layout, the Android date picker, TalkBack reading of the new screens, and import speed for very large files (one awaited insert per reading inside the transaction).
- No test runner is configured; parser and calculation logic is covered only by scratch runs.

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start --clear` (new native package) and open
the app in Expo Go. On **Today**, tap **Log weight**, type `70`, tap
**Save 70.0 kg**. Open the **Progress** tab, tap **Add height**, enter `170`
and **Save**. Then tap **+ Log weight**, type `69.5` and save. Finally switch
the BMI scale to **WHO** under **Edit** in the BMI card.

Expected:

Progress shows **Weight · 7-day average** with **69.5 kg** and "Latest 69.5 kg
· Today" (the second save replaced the first, and the log weight sheet said
"Replaces the 70.0 kg you logged for this day"). The BMI card shows **24.0**
and **At risk** on the Asia-Pacific scale, then **Normal** after switching to
WHO, with "Estimate, not medical advice." Settings has **Import weight history
(CSV)**; picking a CSV with `time,weight` columns shows a preview with new,
already-in-app and to-review counts, and **Import N** adds the readings, which
**Undo import** removes again.

This proves:

Weight logs in two taps with one typed weight per day, and BMI follows your
height, latest weight and chosen scale.
