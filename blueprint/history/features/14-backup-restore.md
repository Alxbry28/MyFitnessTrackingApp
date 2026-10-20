# Feature: Backup restore

**From build-plan:** feature 14
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/backup-restore`

## Goal

Restore a JSON backup made by Export, so a reinstall or a new phone doesn't
lose everything (`1_docs/plan/11` §4: restore is a Must for Beta 1). Restoring
**replaces** the data on this phone. Before anything changes, the app keeps a
safety copy of the current data, so a wrong restore can be undone.

Owner decisions on Oct 20:
- Replace with a safety copy.
- Backups from an older schema are migrated, not refused.

## Design reference

- `prototypes/settings.html`, frame "Editing the calorie goal", section **Your
  data**:
  - It is one `.card.list`: a surface card with a 1 dp border, padding 0 and
    `radius.md`.
  - Each `.item` is at least 56 dp tall, with `space[2]` vertical and
    `space[4]` horizontal padding. Items after the first have a 1 dp top
    border.
  - The name is `md` 500 `text`, the meta is `sm` `muted`, and the section
    label is `xs` 600 uppercase `muted`.
  - The prototype's items are:
    - "Export backup (JSON)"
    - "Export food log (CSV)"
    - "Restore from backup", meta "Replace data on this phone", shown
      disabled with a "Soon" pill
  - This feature enables the Restore item and drops the "Soon" pill.
- The restore flow itself has no prototype frame. It reuses the same card,
  item, section label and button styles: an `accent` primary button, a
  `surface2` ghost button, and the destructive action on `overSoft` with
  `over` text.

## In scope

- **Your data card (Settings)**, rebuilt to the prototype's list card:
  - **"Export backup (JSON)":** the meta is "Contains food and health data.
    Keep it private." Tapping it runs the existing export. The result line
    (or error) shows under the card, as today.
  - **"Import weight history (CSV)":** the meta is "From your scale app".
    It opens `/import-weight`, as today.
  - **"Restore from backup":** the meta is "Replace data on this phone". It
    opens `/restore`.
- **Restore screen `/restore`** (Stack title "Restore backup"):
  - **Start:**
    - The note reads: "Restoring replaces everything on this phone with the
      backup. A copy of your current data is kept first, so you can undo."
    - "Choose backup file" opens the document picker (`*/*`, copy to cache)
      and reads the file text. Cancel leaves the screen as it was.
    - **"Undo last restore":** shown only when a safety copy exists. Its meta
      is "Data from before the restore on <date, time>". It loads the newest
      safety copy into the same preview.
  - **Preview:**
    - The heading is "Backup from <exportedAt as e.g. Oct 18, 21:04>".
    - A table shows rows "Products", "Log entries", "Weigh-ins" and "Settings"
      with the counts "In backup" and "On this phone now". Counts include only
      rows that aren't deleted.
    - A line "Made by an older version. It will be updated." appears when
      `schemaVersion` is lower than the app's.
    - "Replace my data" (destructive style) and "Cancel".
  - **Restoring:** a spinner reading "Restoring...". Back is disabled while it
    runs.
  - **Done:**
    - "Restored N products, N log entries, N weigh-ins." "Done" goes back to
      Settings.
    - Other screens show the restored data on their next focus.
  - **Errors** (no data changed in any of them):
    - Not JSON, or not a backup: "This file isn't a backup from this app."
    - Newer `schemaVersion`, or an unknown table: "This backup is from a
      newer version of the app. Update the app first."
    - The file can't be read: "Couldn't read the file."
    - The safety copy fails: "Couldn't save a copy of your current data, so
      nothing was restored."
    - A row breaks a database rule (check, unique or foreign key), or any
      other failure: "Couldn't restore this backup. Nothing was changed."
- **Validation** (pure `restoreFile` service):
  - `format === "myfitnesstrackingapp-backup"` and `formatVersion === 1`.
  - `schemaVersion` is an integer from 1 to the app's version.
  - `exportedAt` is a string.
  - `tables` is an object whose keys are `BACKUP_TABLES` names. A missing
    table means no rows.
  - Each row is an object whose values are strings, finite numbers or null.
- **Restore** (`restoreRepo` + `restoreBackup` service):
  1. Write the safety copy:
     - It holds `buildBackup(readAll(db))`.
     - The path is `Paths.document/pre-restore/pre-restore-<UTC timestamp with : replaced by ->.json`.
     - A failed write stops everything.
  2. Bring the rows to the current schema in a scratch `:memory:` database:
     - Run the migrations up to the backup's `schemaVersion`.
     - Insert the backup rows, keeping only columns that exist in that
       table.
     - Run the remaining migrations, then read every `BACKUP_TABLES` table.
     - Close the scratch database.
  3. In one `withExclusiveTransactionAsync` on the app database:
     - Delete every `BACKUP_TABLES` table in reverse order (children first).
     - Insert the migrated rows in `BACKUP_TABLES` order (parents first),
       with bound parameters. Column names come from `PRAGMA table_info`,
       never from the file.
     - Any error rolls back everything.

## Out of scope

- Merging a backup into existing data. The owner chose replace.
- Restoring photos (ADR-10; none exist yet).
- Deleting old safety copies, or a screen listing them all. Only the newest is
  offered.
- **Prototype gaps:**
  - The "Export food log (CSV)" item: no plan feature builds it, so it's left
    for the owner to plan.
  - The "Last export <date>" meta on Export: export time isn't stored. The
    item shows the privacy note instead (polish later).
  - The rest of `settings.html`, which is outside this feature: macro split,
    Display section, footer, and the large "Settings" title.

## Build loop

Continuous Mode: steps run in order without review pauses. Each step keeps
`npx tsc --noEmit` and `npx expo lint` passing; `npx expo-doctor` runs at the
end. Checkpoint commits are disabled; the feature commit happens at completion.

## Build steps

- [x] **1. Backup file validation.**
  - Add `src/modules/backup/services/restoreFile.ts` with
    `parseBackupText(text, appSchemaVersion)`. It returns `{ ok: true,
    backup, counts }` or `{ ok: false, error: "not_backup" | "newer" }`.
  - **Done when:** typecheck and lint pass. A scratch run gives:
    - ok for a current backup and for a version-1 backup missing newer tables
    - `not_backup` for bad JSON, a wrong format, or an object or boolean value
    - `newer` for a higher version or an unknown table
    - counts that skip rows with `deleted_at`
- [x] **2. Migrate and replace.**
  - Add `src/modules/backup/repositories/restoreRepo.ts` with
    `migrateRows(backup)` (the scratch database) and `replaceAll(db, tables)`
    (the transaction).
  - Add `src/modules/backup/services/restoreBackup.ts`: safety copy, then
    migrate, then replace. Add `latestSafetyCopy()`.
  - **Done when:** typecheck and lint pass. Reading the code shows:
    - no table or column name comes from the file
    - deletes run children first and inserts run parents first
    - the safety copy is written before any change
    - every change is inside one exclusive transaction
- [x] **3. Settings card and restore screen.**
  - Rebuild the Your data card to the `settings.html` list card.
  - Add `src/app/restore.tsx` with start, preview, restoring, done and error
    states, plus Undo last restore. Register the route.
  - **Done when:** typecheck, lint and expo-doctor pass. The Your data card
    matches `settings.html`'s list card (item height, borders, type), and
    Restore is enabled with meta "Replace data on this phone". On the phone,
    restoring an exported backup shows the preview counts. After "Replace my
    data", the Log and Products tabs show the backup's data, and "Undo last
    restore" brings the previous data back.
- [x] **4. Review repairs (F-16, F-17).**
  - Expo's exclusive transaction runs on its own connection, where foreign keys
    are off. `replaceAll` now runs `PRAGMA foreign_key_check` before commit and
    rolls back on any broken reference.
  - Remove the unused `ExportCard.tsx`.
  - Delete a half-written safety copy, so Undo never offers it.
  - **Done when:** typecheck, lint and expo-doctor pass. A backup row that
    points at a missing parent makes the restore fail with "Couldn't restore
    this backup. Nothing was changed." F-16 and F-17 are marked `fixed` for
    re-review.

## Files / areas

All paths are under `apps/mobile/`.

- New: `src/modules/backup/services/restoreFile.ts`, `src/modules/backup/services/restoreBackup.ts`
- New: `src/modules/backup/repositories/restoreRepo.ts`
- New: `src/app/restore.tsx`; changed: `src/app/_layout.tsx`
- Changed: `src/app/(tabs)/settings.tsx`
- New: `src/modules/backup/components/DataCard.tsx`, the Your data list card with
  the export logic moved in. It replaces the removed `ExportCard.tsx`.
- The scratch database loops over `migrations` from `src/db/migrations`
  directly, so `src/db/client.ts` doesn't change.

## Data / contracts

- **Backup file:** the existing `Backup` type (`backupFile.ts`).
  - `format` is `"myfitnesstrackingapp-backup"`, `formatVersion` is 1, and
    `schemaVersion` is the source app's `PRAGMA user_version`.
  - `tables` maps `BACKUP_TABLES` names to row arrays. Rows include
    soft-deleted ones.
- The app's schema version is `migrations[migrations.length - 1].version`
  (currently 5).
- **Replace order:**
  - Inserts follow `BACKUP_TABLES` order:
    - `products`
    - `food_log_entries`
    - `settings`
    - `body_profile`
    - `import_runs`
    - `body_weight_entries`
    - `text_log_matches`
  - Deletes run in the reverse order. `PRAGMA foreign_keys` stays ON on the
    app connection.
- **Safety copy:** the same JSON format as Export, so it can be restored the
  same way. It stays in app-private storage and is never shared, never
  committed and never deleted by the app.
- **Counts:** rows where `deleted_at` is null, for tables that have that
  column. `settings` counts all rows.
- **Untrusted input:**
  - The file is parsed with `JSON.parse` inside try/catch, then checked
    with zod.
  - Values go only into bound parameters. Identifiers come only from
    `BACKUP_TABLES` and `PRAGMA table_info`.

## Testing

No test runner is configured. Step 1 gets a scratch run of the pure validator.
Steps 2 and 3 rely on typecheck, lint, expo-doctor, code reading, and the
on-phone checks in their Done when. `parseBackupText` is the first unit-test
target once `/tests` adds a runner.

## Notes for the AI

- Follow the existing patterns:
  - `makeStyles(theme)` with `StyleSheet.create`
  - `DocumentPicker` plus `new File(uri).text()` (`importWeights.ts`)
  - focus reloads
  - comments only for the why
  - no em dashes
- Theme tokens only, no hex values.
- Never log or display row contents from the file. Show counts only.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10998,"specSha256":"6dfcecc86114874d1e6ebfa5012b20ecdbf81a550737580a1f5a1784b22d5b40","branch":"refs/heads/feature/backup-restore","head":"40af13856253ce46c546ac84e072393c0971af01","baseRef":"refs/heads/main","baseCommit":"006e38bb1a950df2698e5a390f99c8e27c00ee02","sourceTree":"6005c9d1a19d46bc7f09f9c7d12aff49239c26c8","landing":"local-merge","absentOptional":[]} -->

## Findings

### 14/F-16 [P1] closed - Restore transaction runs on a connection with foreign keys off, so a backup with broken references is restored instead of refused

**File:** apps/mobile/src/modules/backup/repositories/restoreRepo.ts:56
**Found:** 2026-10-20 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** `withExclusiveTransactionAsync` (expo-sqlite 57.0.4, `SQLiteDatabase.ts:175` and `Transaction.createAsync` at :787) opens a new native connection with `useNewConnection: true`. `PRAGMA foreign_keys = ON` is set only on the provider connection in `src/db/client.ts:10`, the Android open path runs no pragmas (`SQLiteModule.kt` `initDb`), and the build flags do not set `SQLITE_DEFAULT_FOREIGN_KEYS`, so foreign keys are off inside the restore transaction (the scratch `:memory:` database is also off). A hand-edited or inconsistent backup whose `food_log_entries.product_id`, `text_log_matches.product_id`, or `body_weight_entries.import_run_id` points at a row not in the file is therefore committed with orphan references. This violates the spec ("A row breaks a database rule (check, unique or foreign key) ... Couldn't restore this backup. Nothing was changed."; "`PRAGMA foreign_keys` stays ON") and the code comment claiming "foreign keys hold throughout". Later writes on the app connection that touch those rows (for example re-logging an entry with a missing product) then fail with a foreign key error far from the cause.
**Suggested fix:** Inside the same transaction, after the inserts, run `PRAGMA foreign_key_check` on `txn` (it works with enforcement off) and throw when it returns any row, so the transaction rolls back and the screen shows the generic restore error. Correct the comment. No new dependency or abstraction; no current requirement is lost.
**Resolution:** Fixed in `replaceAll` (restoreRepo.ts): after the inserts, `PRAGMA foreign_key_check` runs on `txn` and any row throws, rolling back the whole restore; the comment now says references are checked before commit. Verified with typecheck, lint and expo-doctor; awaiting re-review. Closed 2026-10-20 by independent re-review at 40af138: `replaceAll` (restoreRepo.ts:75-76) runs `PRAGMA foreign_key_check` on `txn` after all inserts and before `COMMIT`; expo-sqlite 57.0.4 `withExclusiveTransactionAsync` (SQLiteDatabase.ts:184-195) runs `ROLLBACK` and rethrows on any task error, and `restore.tsx:86-93` maps that to "Couldn't restore this backup. Nothing was changed.". Every table with a foreign key (`food_log_entries`, `body_weight_entries`, `text_log_matches`) is in `BACKUP_TABLES` and is fully replaced, so the database-wide check only sees restored rows. No new defect introduced by the repair.

### 14/F-17 [P3] closed - Replaced ExportCard.tsx is left in the tree unused

**File:** apps/mobile/src/modules/backup/components/ExportCard.tsx:12
**Found:** 2026-10-20 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** The spec's Files / areas says `DataCard.tsx` "replaces the removed `ExportCard.tsx`", and the export logic was copied into `DataCard`. `ExportCard` now has no importers, so the duplicate export UI and its copy can drift from `DataCard` and mislead the next change.
**Suggested fix:** Delete `src/modules/backup/components/ExportCard.tsx`. `DataCard` already provides the behavior; no current requirement is lost.
**Resolution:** Deleted `ExportCard.tsx` (no importers). Awaiting re-review. Closed 2026-10-20 by independent re-review at 40af138: the file is deleted in the delta and `grep ExportCard` over `apps/mobile/src` finds no reference; `DataCard.tsx` holds the only export UI.

## Independent review

**Status:** passed
**Target commit:** 40af13856253ce46c546ac84e072393c0971af01
**Base commit:** 006e38bb1a950df2698e5a390f99c8e27c00ee02
**Base ref:** main
**Spec hash:** 6dfcecc86114874d1e6ebfa5012b20ecdbf81a550737580a1f5a1784b22d5b40
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-21T00:45:00+08:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T23:33:00+08:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD`: pass (equals Target commit)
- `git merge-base main HEAD`: pass (equals Base commit)
- `sha256sum blueprint/context/current-feature.md`: pass (equals Spec hash; spec is tracked, no snapshot)
- `git status --porcelain --untracked-files=all`: pass (only `blueprint/context/findings.md` and `blueprint/context/review.md` differ)
- `npx tsc --noEmit` (apps/mobile): pass (existing `.expo/types/router.d.ts` already lists `/restore`; not regenerated)
- `npx expo lint` (apps/mobile): pass
- `npx expo-doctor` (apps/mobile): pass (21/21 checks)
- Test command: unavailable (no test runner configured)

### Evidence

- Reviewed the full `006e38b..40af138` delta: `restoreFile.ts`, `restoreRepo.ts`, `restoreBackup.ts`, `restore.tsx`, `DataCard.tsx`, `_layout.tsx`, `(tabs)/settings.tsx`, the `ExportCard.tsx` deletion, and the spec, against `coding-standards.md`, `DATABASE.md` §6, all five migrations and `backupRepo.ts`.
- Atomicity: the safety copy is written (and a half-written one deleted) before any change; `replaceAll` deletes children first and inserts parents first inside one `withExclusiveTransactionAsync`, then runs `PRAGMA foreign_key_check` before `COMMIT`; expo-sqlite 57.0.4 `SQLiteDatabase.ts:184-195` rolls back and rethrows on any error. Every FK-bearing table is in `BACKUP_TABLES`, and no migration seeds rows, so the scratch `:memory:` rebuild cannot collide with backup rows.
- Trust boundary: file parsed with `JSON.parse` in try/catch then zod (finite numbers, strings, null only; unknown table maps to "newer"); table names come only from `BACKUP_TABLES`, column names only from `PRAGMA table_info`, values only through bound parameters; no row contents are logged or shown.
- UI: `DataCard` matches `prototypes/settings.html:50-55` list card (padding 0, 56 dp items, `space[2]`/`space[4]` padding, 1 dp divider after the first item, `md` 500 name, `sm` muted meta); the trailing `.go` icon at :101-102 is missing (F-18). Restore screen copy, states, back blocking during restore, and focus reloads on other screens match the spec.
- F-16 closed and F-17 closed after re-examining the repaired code; F-18 re-confirmed against the prototype markup.

### Findings

- F-16 [P1] closed
- F-17 [P3] closed
- F-18 [P3] open (re-confirmed)
- F-19 [P2] open (new): a failed restore leaves a fresh safety copy that displaces the "Undo last restore" point
- No P0 or P1 finding is open or fixed

### Remaining risk

- No unit test runner: `parseBackupText`, `migrateRows` and `replaceAll` have no automated tests, and the pure validator was not exercised in this review.
- Check was not required and was not run: no on-phone restore, undo, older-schema migration, or broken-reference rollback was observed at runtime.
- Performance on large data sets is unmeasured: both the scratch load and the replace issue one async native call per row, and `currentCounts` reads every row to count it.
- Concurrent double tap on "Replace my data" has no re-entrancy guard; two runs would share the cached `:memory:` scratch connection. Judged unlikely because the restoring state renders before a second tap, and not reproduced.
- `npx tsc` relied on the existing git-ignored `.expo/types/router.d.ts`, which already includes `/restore`.

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go. In
**Settings**, tap **Export backup (JSON)** and save the file. Log one more food,
then tap **Restore from backup**, **Choose backup file**, and pick the file you
just saved.

Expected:

The Your data card shows three rows: Export backup (JSON), Import weight
history (CSV) and Restore from backup ("Replace data on this phone"). The
restore preview shows "Backup from <time>" with In backup and On this phone now
counts; Log entries is one lower in the backup. **Replace my data** shows
"Restored N products, N log entries, N weigh-ins." and the extra food is gone
from Log. Back on **Restore from backup**, **Undo last restore** brings it back.

This proves:

A backup replaces the phone's data in one step, and the automatic safety copy
can undo it.
