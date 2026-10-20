# Feature: Day navigation and JSON export

**From build-plan:** feature 7
**Build attempt:** 1
**Status:** verified
**Branch:** feature/day-navigation-and-json-export

## Goal

Move between days on the Log tab (previous, next, a date picker and a "Today"
shortcut), see exactly what was logged on any past day, and add food to the day
being viewed. In Settings, export all data as one JSON backup file through the
Android share sheet. PRD acceptance: the exported file opens and contains every
table's rows.

## Design reference

- `prototypes/log.html`: the date header ("Mon, Oct 19", "Yesterday, tap for
  calendar") with previous and next buttons.
- `prototypes/settings.html` "Your data": "Export backup (JSON)".
- `1_docs/UX_FLOWS.md` §6:
  - `‹ date ›` changes the day, tapping the date opens a picker, and "Today"
    returns.
  - Export writes one JSON file to the cache directory and opens the share
    sheet, showing the file size and row counts on success.
- `1_docs/DATABASE.md` §6 for the backup format.
- `1_docs/DESIGN_SYSTEM.md` §6 `DayNavigator`.
- Default styles; text arrows ("‹" "›").

## In scope

- **Dependencies (owner-approved Oct 20):** `expo-sharing` ~57.0.23,
  `expo-file-system` ~57.0.7 and `@react-native-community/datetimepicker`
  9.1.0, via `npx expo install`, which added the sharing and datetimepicker
  config plugins to `app.json`.
- **Day helpers (pure, in `mealTime.ts`):**
  - `addDays(day, n)`: the day key n days away, by calendar day.
  - `dayFromKey(day)`: a local `Date` at noon.
  - `formatDayLabel(day, today)`: "Today", "Yesterday", or "Mon, Oct 19". The
    year is added when it differs from today's.
- **Log tab day navigation (`DayNavigator` component):**
  - The selected day is screen state, starting at today.
  - "‹" goes to the previous day.
  - "›" goes to the next day and is disabled on today: you can't navigate into
    the future.
  - Tapping the label opens `DateTimePickerAndroid` in date mode, with
    `maximumDate` today and the current day selected.
  - A "Back to today" button shows below the row when you're viewing another day.
  - The empty message reads "Nothing logged this day" on past days.
- **Adding to the viewed day:**
  - "Add food" passes `day` to `/add`, which passes it on to `/add/[productId]`.
  - The add screen saves to that day when it's a valid `YYYY-MM-DD` that isn't
    in the future, otherwise today.
  - After saving it returns to Log, still on that day: the Log keeps its state
    because it stays mounted.
  - The save button stays "Add to <Meal>".
- **Backup export (`src/modules/backup/`):**
  - `backupRepo.readAll(db)` reads every row of `products`, `food_log_entries`
    and `settings`, including soft-deleted rows, plus `PRAGMA user_version`.
  - `buildBackup(tables, schemaVersion, now)` is pure and returns the
    DATABASE.md §6 object.
  - `exportBackup(db)`:
    - Writes the pretty-printed JSON (2-space indent) to
      `Paths.cache/myfitness-backup-<YYYY-MM-DD>.json`, overwriting.
    - Opens `Sharing.shareAsync` with `mimeType: "application/json"` and the
      `dialogTitle` "Save your backup".
    - Returns the row counts and the byte size.
- **Settings "Your data" card:**
  - The text "Backups contain your food and health data. Keep the file
    private."
  - An "Export backup (JSON)" button that shows "Exporting..." while busy.
  - On success: "Exported N products, N log entries, N settings (X KB)".
  - On failure, or when sharing is unavailable: "Couldn't export the backup."
    Nothing else changes.

## Out of scope

- Restoring a backup (feature 14) and CSV export.
- Day navigation on Today. It stays on today, so F-03 (midnight) still applies
  there and on the Log's initial day.
- Calendar month view and history (later prototypes), and logging future days.
- Automatic or scheduled backups.

## Build loop

Continuous Mode: steps run in order without review pauses. Each step must keep
`npx tsc --noEmit`, `npx expo lint` and `npx expo-doctor` passing. Checkpoint
commits are disabled; the final feature commit happens at completion.

## Build steps

- [x] **1. Install packages.**
  - `npx expo install expo-sharing expo-file-system @react-native-community/datetimepicker`.
  - **Done when:** `package.json` lists all three, `app.json` has the plugins,
    and expo-doctor passes.
- [x] **2. Day helpers and Log navigation.**
  - Add `addDays`, `dayFromKey` and `formatDayLabel` to `mealTime.ts`.
  - Add `src/modules/nutrition/components/DayNavigator.tsx`.
  - Add the day state to `log.tsx`.
  - Thread the `day` param through `/add` and `/add/[productId]`, and into
    `useAddEntry`.
  - **Done when:** typecheck and lint pass. A scratch node run shows
    `addDays("2026-03-01", -1)` is "2026-02-28" and `addDays("2026-12-31", 1)` is
    "2027-01-01", with the expected labels. On the phone:
    - "‹" shows yesterday's entries.
    - "Add food" there logs to yesterday.
    - "›" is disabled on today.
    - The date picker jumps to a picked day.
- [x] **3. JSON export.**
  - Add `src/modules/backup/repositories/backupRepo.ts`,
    `src/modules/backup/services/backupFile.ts` (pure `buildBackup`) and
    `src/modules/backup/services/exportBackup.ts`.
  - Add the "Your data" card in `settings.tsx`.
  - **Done when:** typecheck, lint and expo-doctor pass. A scratch node run of
    `buildBackup` gives the §6 shape with every table present. On the phone,
    Export opens the share sheet, and the saved file opens with the rows from
    all three tables.

- [x] **4. Repair F-08: the backup module was git-ignored.**
  - The root `.gitignore` rule `Backup*/` (Visual Studio template) matched
    `apps/mobile/src/modules/backup/` because `core.ignorecase=true`, so the
    review checkpoint lacked all four backup files.
  - Add the negation `!apps/mobile/src/modules/backup/` right after it, and
    commit the four files.
  - **Done when:** `git check-ignore` no longer matches the backup files, `git
    ls-files -o -i --exclude-standard -- apps/mobile/src` is empty, the files are
    in the new checkpoint, and typecheck, lint and expo-doctor pass.

## Files / areas

All paths are under `apps/mobile/`.

- Changed: `package.json`, `package-lock.json`, `app.json`
- Changed: root `.gitignore` (F-08 negation for the backup module)
- Changed: `src/modules/nutrition/services/mealTime.ts`
- New: `src/modules/nutrition/components/DayNavigator.tsx`
- Changed: `src/app/(tabs)/log.tsx`, `src/app/add/index.tsx`,
  `src/app/add/[productId].tsx`
- Changed: `src/modules/nutrition/hooks/useAddEntry.ts`
- New: `src/modules/backup/repositories/backupRepo.ts`
- New: `src/modules/backup/services/backupFile.ts`
- New: `src/modules/backup/services/exportBackup.ts`
- New: `src/modules/backup/components/ExportCard.tsx` (the Settings card, with its own busy and notice state)
- Changed: `src/app/(tabs)/settings.tsx`

## Data / contracts

- **Day keys:** local `YYYY-MM-DD`, as in feature 2. `addDays` goes through
  `new Date(y, m - 1, d + n)` at noon, so DST changes can't skip or repeat a
  day.
- **`day` route param:** accepted only when it matches `^\d{4}-\d{2}-\d{2}$`,
  is a real calendar date (it round-trips through `dayFromKey` and `dayKey`),
  and isn't after today. Anything else falls back to today. `logged_at` stays
  the real UTC time of logging.
- **Backup format (DATABASE.md §6):**

  ```json
  {
    "format": "myfitnesstrackingapp-backup",
    "formatVersion": 1,
    "schemaVersion": <PRAGMA user_version, currently 3>,
    "exportedAt": "<UTC ISO>",
    "tables": { "products": [...], "food_log_entries": [...], "settings": [...] }
  }
  ```

  - Rows are the raw SQLite rows, with snake_case columns and 0/1 integers, read
    with `SELECT * FROM <table>`, including soft-deleted rows.
  - Table names come from a fixed constant list, never user input. No photos.
- **File:**
  - Path: `new File(Paths.cache, "myfitness-backup-<day>.json")`, then
    `create({ overwrite: true })` and `write(json)`.
  - The reported size is the UTF-8 byte length of the JSON.
  - The file stays in the app cache, which Android can clear. It's never
    written to git (ADR-17).
- **Errors:** read, write and share failures are caught at the screen boundary
  and shown as one message. The database is only read, never modified.

## Testing

No test runner is configured. `addDays`, `formatDayLabel`, `dayFromKey` and
`buildBackup` are pure and checked with a scratch node run. The picker, the
share sheet and the file contents need the on-phone Done-when checks.

## Notes for the AI

- Use the installed APIs:
  - `expo-file-system`: `File` and `Paths`.
  - `expo-sharing`: `isAvailableAsync` and `shareAsync`.
  - `DateTimePickerAndroid.open` from `@react-native-community/datetimepicker`.
- Follow the existing patterns: `makeStyles`, thin routes, comments only when
  needed, no em dashes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8872,"specSha256":"b7eace2e8ece48e3d303e5bf86b840b5ae2537800d31f27df7e430ab49b687da","branch":"refs/heads/feature/day-navigation-and-json-export","head":"8b06d9aae99b90de88ffb3a701ecd17eb9a757aa","baseRef":"refs/heads/main","baseCommit":"85f5f0315160afa8af1088024a9be7f9456f9c35","sourceTree":"3e236687c7d4ae770d0fb5fae137d3b215f461c2","landing":"local-merge","absentOptional":[]} -->

## Findings

### 7/F-08 [P1] closed - Backup module is git-ignored, so the target commit cannot build

**File:** .gitignore:284 (`Backup*/`); importer apps/mobile/src/app/(tabs)/settings.tsx:7
**Found:** 2026-10-20 by /audit (scope: current; all lenses; independent review)
**Why it matters:** The root `.gitignore` carries the Visual Studio template rule `Backup*/`, and this checkout has `core.ignorecase=true`, so `git check-ignore -v` matches all of `apps/mobile/src/modules/backup/` (backupRepo.ts, backupFile.ts, exportBackup.ts, ExportCard.tsx). None of the four spec files is in the target commit (`git ls-tree -r HEAD` has no backup paths) and `git status` reports a clean tree, yet `settings.tsx` at the target imports `@/modules/backup/components/ExportCard`. A clean clone, CI, or an EAS build (which uploads per `.gitignore`) cannot resolve that import, and `/complete` would land the feature without its export code. Local `tsc` and lint pass only because the ignored files sit in this working tree, and freshness checks cannot detect later edits to them, so the independent receipt cannot bind the export code either.
**Suggested fix:** Narrow or remove the unused template rule (for example delete `Backup*/` or anchor it as `/Backup*/`, since no Visual Studio project exists here), confirm `git check-ignore` no longer matches `apps/mobile/src/modules/backup/`, then add the four files in a new approved checkpoint and request a fresh review. No current requirement is lost.
**Resolution:** Fixed by spec step 4 (2026-10-20): `!apps/mobile/src/modules/backup/` added after `Backup*/` in the root `.gitignore`; `git check-ignore` no longer matches and `git ls-files -o -i --exclude-standard -- apps/mobile/src` is empty; the four files are in the new checkpoint. Awaiting re-review.
Closed by independent re-review (2026-10-20, fresh subagent, claude-opus-5-5) against target 8b06d9aae99b90de88ffb3a701ecd17eb9a757aa: `git ls-tree -r --name-only 8b06d9a` lists all four backup files plus every other file the spec names; `git check-ignore --no-index` on the backup files returns no match (rc=1) with `core.ignorecase=true`; `git ls-files -o -i --exclude-standard -- apps/mobile/src` and `git ls-files -o --exclude-standard -- apps/mobile/src` are both empty; the negation sits directly after `Backup*/` and is scoped to the one app folder, so the repair adds no new ignore exposure. `npx tsc --noEmit` and `npx expo lint` pass on the target.

## Independent review

**Status:** passed
**Target commit:** 8b06d9aae99b90de88ffb3a701ecd17eb9a757aa
**Base commit:** 85f5f0315160afa8af1088024a9be7f9456f9c35
**Base ref:** main
**Spec hash:** b7eace2e8ece48e3d303e5bf86b840b5ae2537800d31f27df7e430ab49b687da
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-20T13:21:44Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T13:24:09Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `85f5f0315160afa8af1088024a9be7f9456f9c35..8b06d9aae99b90de88ffb3a701ecd17eb9a757aa` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `git rev-parse HEAD` / `git merge-base main HEAD`: pass (HEAD equals target; merge base equals base commit)
- `sha256sum blueprint/context/current-feature.md`: pass (matches Spec hash; spec is tracked, not ignored)
- `git status --porcelain --untracked-files=all`: pass (only blueprint/context/review.md differs)
- `git ls-tree -r --name-only 8b06d9a`: pass (every file the spec lists is tracked, including the four backup files)
- `git ls-files -o -i --exclude-standard -- apps/mobile/src`: pass (empty)
- `npx tsc --noEmit` (apps/mobile): pass
- `npx expo lint` (apps/mobile): pass
- `npx expo-doctor`: unavailable (skipped; contacts the Expo API; builder reported 21/21 on this tree)
- Scratch node run of `addDays`, `isDayKey`, `formatDayLabel`, `buildBackup`, `formatBytes`: pass
- Scratch `node:sqlite` run of migrations 001-003 plus `backupRepo.readAll`: pass

## Evidence

- Day helpers: `addDays("2026-03-01",-1)` = 2026-02-28, `addDays("2026-12-31",1)` = 2027-01-01, leap day correct; a 3000-day forward/back walk had no skips or repeats under America/Sao_Paulo (midnight DST), Asia/Tehran, Pacific/Apia and America/St_Johns.
- `isDayKey` rejects 2026-02-30, 2026-13-01, 2026-1-01 and trailing spaces; `useAddEntry.targetDay` also rejects future days, so the route param cannot log into the future.
- Labels: Today, Yesterday (including across a year boundary), "Sun, Oct 18", and the year suffix only when it differs from today's.
- Backup: `buildBackup` returns the DATABASE.md §6 shape; `readAll` against the migrated in-memory DB returns exactly the three tables that exist (products, food_log_entries, settings) with `schemaVersion` 3. Table names come from a fixed constant; the database is only read.
- Share boundary: export is user-initiated, writes to the app-private cache via `File(Paths.cache, ...)`, hands it to `Sharing.shareAsync` with `application/json`, shows the privacy warning on the card, and reports one generic error message on read/write/share failure. Settings rows hold only key/value preferences; no secrets exist in the schema.
- Day threading: Log -> `/add` -> `/add/[productId]` carries `day`; Log stays mounted and `useDayLog` reloads on day change with a request-id guard against stale results.
- F-08 repair confirmed in the target (see ledger).

## Findings

- F-08 [P1] closed (repair confirmed)
- No new findings

## Remaining risk

- `npx expo-doctor` not run by the reviewer (network); relies on the builder's 21/21 result.
- No test runner configured; pure helpers were checked only by scratch runs, not committed tests.
- On-phone behavior (date picker, share sheet, file contents opening in another app) not exercised; Check was not required.
- Android `shareAsync` resolves even when the user dismisses the sheet, so "Exported ..." can show without the file being saved elsewhere; the backup file then remains only in the app-private cache, as the spec allows.

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start --clear` (new native packages) and open
the app in Expo Go. On **Log**, tap **‹**, then **+ Add food** under any meal,
pick a product and add it. Then open **Settings** and tap
**Export backup (JSON)**, and save the file (for example to Files or Drive).

Expected:

The Log header reads **Yesterday**, the new entry is listed under that meal
there, **›** returns to **Today** (where it is not listed), and **›** is
greyed out on Today. Export opens the Android share sheet titled
"Save your backup"; afterwards Settings shows "Exported N products, N log
entries, N settings (X KB)", and the saved `myfitness-backup-<date>.json` file
contains `"format": "myfitnesstrackingapp-backup"` and the three tables.

This proves:

Past days can be browsed and logged to, and all data exports to one JSON file
through the share sheet.
