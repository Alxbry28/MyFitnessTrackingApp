# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-01 [P3] open - Startup error boundary catches every app render error with database copy

**File:** apps/mobile/src/app/_layout.tsx:13 (boundary in apps/mobile/src/components/StartupStatus.tsx:32)
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** `DatabaseErrorBoundary` wraps the whole `Stack`, not only the `SQLiteProvider` startup. Any later render exception in any screen (for example the product form) replaces the app with "Couldn't open your data. Nothing was deleted." plus the raw error message, which misdiagnoses the failure and gives no way back except restarting the app.
**Suggested fix:** Keep the boundary but make its copy generic ("Something went wrong") or scope the database message to errors raised during open/migrate; no new machinery needed. No current requirement is lost.
**Resolution:**

### F-02 [P3] unverified - Floating Add button may cover the last product row

**File:** apps/mobile/src/app/(tabs)/products.tsx:115
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** The clearance for the absolutely positioned Add button is `marginBottom` on the FlatList `contentContainerStyle`. Margin on a scroll content container is not reliably counted in the scrollable content height on Android, so with a full list the last row could sit under the button and be hard to tap. Not observed on a device in this review.
**Suggested fix:** Check on the phone with a list longer than the screen; if the last row is covered, use `paddingBottom` (on the container) instead of `marginBottom`.
**Resolution:**

### F-03 [P3] unverified - Log tab can keep showing yesterday after midnight

**File:** apps/mobile/src/app/(tabs)/log.tsx:25 (load in apps/mobile/src/modules/nutrition/hooks/useDayLog.ts:39)
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** The Log day is `dayKey(new Date())` computed only during render, and `useFocusEffect` reruns the `load` from the last render. If the app stays open on the Log tab across midnight (common on Android, where the app is kept in memory) and the screen does not re-render before the next focus, the tab keeps listing yesterday's entries under "today", while a new entry from Add food is saved to the new day and would not appear after `dismissTo("/log")`. Not reproduced on a device in this review; whether a navigation focus forces a re-render was not confirmed.
**Suggested fix:** Check on the phone by changing the device clock across midnight with the Log tab open. If stale, compute the day inside `load` (or refresh it on focus/AppState "active") instead of only at render. Feature 7 (day navigation) may replace this anyway. No current requirement is lost.
**Resolution:**

### F-05 [P3] open - Scanner keeps showing "Camera access is off" after granting in Settings

**File:** apps/mobile/src/app/scan.tsx:22 (Open settings at scan.tsx:85)
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** `useCameraPermissions()` fetches the status once on mount (expo-modules-core `PermissionsHook.ts` runs `getPermission` only in its mount effect). When permission was permanently denied, the user taps "Open settings", grants the camera and returns: Android resumes the app without remounting the scanner, so it still shows the explain screen with "Open settings" until the user closes and reopens Scan. Denial never blocks logging, so this is a polish item, not a contract break.
**Suggested fix:** Use the hook's third return value (`getPermission`) and call it when React Native `AppState` changes to "active" while the scanner is mounted. No new dependency; no current requirement is lost.
**Resolution:**

### F-06 [P3] open - Torch toggle announces a checked state that contradicts its label

**File:** apps/mobile/src/app/scan.tsx:113
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** The torch button's label is the action ("Torch off" while the torch is on) but it also sets `accessibilityState={{ checked: torch }}`, so TalkBack reads "Torch off, checked" when the torch is lit. The two signals disagree for screen-reader users.
**Suggested fix:** Drop `accessibilityState` and keep the action label (matches the spec copy), or keep the state with a fixed "Torch" label and `accessibilityRole="switch"`. No current requirement is lost.
**Resolution:**

### F-07 [P3] open - Open Food Facts draft can show exponent notation or a zero serving weight

**File:** apps/mobile/src/modules/nutrition/services/offProduct.ts:48 (asField at :52, used at :92-93)
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** `positive()` has no upper bound and `asField()` uses `String(Math.round(v * 100) / 100)`. A community value such as `product_quantity: 1e25` reaches the form as "1e+25" (the spec's draft format says "no exponent notation"), and the form schema accepts it, so an absurd net weight can be saved with one tap. A tiny `serving_quantity` such as 0.001 rounds to "0", which the form then rejects as "Must be more than 0" while the per-100 g values were scaled from the unrounded weight. Both were reproduced with the scratch parser run. Unlikely with real data and the user reviews before saving, so this is polish, not a contract break that blocks.
**Suggested fix:** Pass serving grams and net weight through a bounded check (for example `inRange(value, 0.01, 100000)` or a similar plausible cap) so out-of-range values are left blank like kcal and macros. No new machinery; no current requirement is lost.
**Resolution:**

### F-08 [P2] open - Import holds back legitimate history when weight changed more than 10 kg

**File:** apps/mobile/src/modules/body/services/weightCsv.ts:207 (review check at :215)
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** "Usual weight" is one median over all existing daily values plus every file reading, so any reading more than 5 kg from that single number goes to review and can never be imported. For a real weight-loss history the start and the end of the file are both far from the overall median. A scratch run of 300 daily readings going from 85 kg to 70 kg (empty app) planned 200 new and 100 to review, including the most recent 50 days down to 70 kg on 2026-09-26. Re-importing after the 200 are in still holds them back. The code matches the spec's contract, but the plan (`1_docs/plan/10_body_progress.md` line 197) says "more than 5 kg off my trend", and a fitness app's own user is the person most likely to change weight by 10 kg or more.
**Suggested fix:** Compare each reading with a local reference instead of one global median, for example the median of daily values (existing plus file) within a few days or weeks of that reading, so only same-period outliers (another person on the scale) are held back. Needs a spec contract update; no new machinery.
**Resolution:**

### F-09 [P3] open - First six trend dots on the 30-day chart use incomplete 7-day windows

**File:** apps/mobile/src/modules/body/hooks/useProgress.ts:75 (trend in apps/mobile/src/modules/body/services/weightCalc.ts:55)
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** `useProgress` loads readings only from `today - 29`, and `chartPoints` computes each day's trend as the mean of daily values in its own 7-day window from that same list. For the oldest six chart days the window reaches back before the loaded range, so their accent trend dots average fewer days than the spec's "mean of daily values in its own 7-day window" and can jump at the left edge of the chart.
**Suggested fix:** Load from `addDays(today, -35)` (30 chart days plus 6 days of window) and keep the 30-day filter in `chartPoints`; also keep `recent` limited to 14 days as now. No current requirement is lost.
**Resolution:**

### F-10 [P3] open - Editing an imported reading says it replaces the typed weight but does not

**File:** apps/mobile/src/modules/body/components/WeightForm.tsx:265 (replace rule in apps/mobile/src/modules/body/repositories/weightRepo.ts:340)
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** When the user opens an "Imported" reading from Recent weigh-ins on a day that also has a typed weight, the sheet shows "Replaces the X kg you logged for this day." but `saveManual` only removes the other manual row when the edited entry is itself manual, so nothing is replaced. The edited value also stays `csv_import` ("Imported"), the typed weight still wins as the daily value, and a later Undo import silently removes the user's correction. The copy contradicts what is saved.
**Suggested fix:** Show the "Replaces" line only when the entry being edited is manual or new (pass the entry's source to the form), or decide in the spec whether editing an imported reading turns it into a typed one. No current requirement is lost.
**Resolution:**

### F-11 [P3] open - Export success line counts deleted and undone weigh-ins

**File:** apps/mobile/src/modules/backup/services/exportBackup.ts:36
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** `readAll` intentionally exports soft-deleted rows, and `weighIns` is the raw `body_weight_entries` row count. After importing 388 readings and pressing Undo import, the export still says "388 weigh-ins" (plus every deleted or replaced typed weight), while Progress shows none. The products and log-entry counts already behave this way, but an undone import makes the gap large and visible.
**Suggested fix:** Count only rows with `deleted_at` null for the summary line (keep exporting every row). No current requirement is lost.
**Resolution:**

### F-12 [P3] open - Open Food Facts result without kcal opens the form without the community-data note

**File:** apps/mobile/src/modules/nutrition/components/MatchSheet.tsx:100 (note shown at :76)
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** Choosing a search result sets `fromOff: item.found`, and the note renders only when `fromOff` is true. A result with no usable kcal ("No kcal listed") therefore opens the in-sheet form prefilled with Open Food Facts name and brand but without "From Open Food Facts. It's community data, so check it against the label before saving." The spec shows that note for every chosen Open Food Facts result and ties only the saved `source` to whether kcal was usable.
**Suggested fix:** Keep two values in the form step, for example `fromOff: true` for any search result and `source: item.found ? "open_food_facts" : "manual"`, and show the note on `fromOff`. No current requirement is lost.
**Resolution:**

### F-13 [P3] open - Hardware back on the sheet's form and search steps does not close the sheet as specified

**File:** apps/mobile/src/modules/nutrition/components/MatchSheet.tsx:206
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** `onRequestClose` closes the sheet only on the options step and otherwise returns to the options. The spec says "'Back' returns to the options. The scrim and hardware back close the sheet." The code's behavior is arguably kinder (it keeps the sheet when backing out of a half-filled form), but it is undocumented drift from the approved contract, and the scrim still closes the form step and drops typed values.
**Suggested fix:** Decide which behavior is intended and align the other: either update the spec to say hardware back steps back to the options, or pass `onClose` unconditionally. No new machinery.
**Resolution:**

### F-14 [P3] open - Match sheet options can omit candidates counted in the line's "N matches"

**File:** apps/mobile/src/modules/nutrition/components/MatchSheet.tsx:40 (matching in apps/mobile/src/modules/nutrition/services/pasteLog.ts:85; SQL in apps/mobile/src/modules/nutrition/repositories/productRepo.ts:69)
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** The Preview counts candidates with `nameKey(product.name).includes(key)` (whitespace collapsed, Unicode lowercase), but the sheet lists options from `useProducts(food.name)`, a SQL `LIKE '%<raw typed name>%'` that keeps inner whitespace runs and is case-insensitive only for ASCII. A pasted line such as `250g white  rice` (two spaces, common in copied text) shows "White rice, cooked" as "to check" with "2 matches", while the sheet's search only finds the preselected current product, so the other candidate the spec promises ("All products whose name contains the key") is missing until the user retypes the search.
**Suggested fix:** Seed the sheet search with `food.key` instead of the raw `food.name` (fixes whitespace), or build the initial options from `match.candidates` and use the SQL search only after the user edits the field. No current requirement is lost.
**Resolution:**

### F-15 [P3] unverified - Library search in the match sheet may sit under the keyboard

**File:** apps/mobile/src/modules/nutrition/components/MatchSheet.tsx:206 (field at :115)
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** The spec requires the "Search your library" field to be "kept clear of the keyboard". The sheet is a bottom-anchored transparent `Modal` with no keyboard avoidance (the app has no `KeyboardAvoidingView` or keyboard handling anywhere), so it relies on the Android dialog window resizing for the IME under SDK 57's edge-to-edge mode. Whether the field and the "Use" button stay visible with the keyboard open was not observed on a device in this review.
**Suggested fix:** Check on the phone by focusing the search field. If the sheet does not lift, wrap the sheet in `KeyboardAvoidingView` (behavior "height" or "padding") inside the modal. No new dependency.
**Resolution:**

### F-18 [P3] open - Your data rows drop the prototype's trailing action icon

**File:** apps/mobile/src/modules/backup/components/DataCard.tsx:86
**Found:** 2026-10-20 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** In `prototypes/settings.html` (lines 51-56, 101-102) each `.item` ends with a `.go` icon in `faint`, the visual cue that the row is tappable. `DataCard`'s `Item` renders only the name and meta, and the old Import row's chevron was removed with it, so the three rows now look like static text. Item height, borders, padding and type otherwise match the prototype.
**Suggested fix:** Add a trailing `SymbolView` (already used in `(tabs)/_layout.tsx` and `paste-log.tsx`) or the existing "›" text glyph in `colors.faint` to `Item`. No new dependency.
**Resolution:** Re-examined 2026-10-20 by independent re-review at 40af138; still valid as P3 open. `prototypes/settings.html:101-102` end both export items with `<svg class="i go">` (a download glyph, styled `.item .go { color: var(--faint); }` at :56), and the Restore item at :103 ends with the "Soon" pill that the spec drops. `DataCard.tsx:86-98` renders only `.info`. The spec's Done when lists item height, borders and type, which match (`minHeight: 56`, `space[2]`/`space[4]` padding, 1 dp top border after the first item, `md` 500 / `sm` muted), so this is design polish, not a broken contract. A trailing glyph in `colors.faint` (download for export, chevron for the two navigation rows) would match the prototype.

### F-19 [P2] open - A failed restore replaces the "Undo last restore" point with a copy of the unchanged data

**File:** apps/mobile/src/modules/backup/services/restoreBackup.ts:90 (newest-copy pick at :48-57; failure path in apps/mobile/src/app/restore.tsx:86-93)
**Found:** 2026-10-20 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** `restoreBackup` writes a new safety copy before `migrateRows`/`replaceAll`, and nothing removes or marks it when either step then fails (for example a backup with a broken reference, a CHECK or UNIQUE violation, or rows for a table that did not exist at its `schemaVersion`). The screen says "Nothing was changed", but `latestSafetyCopy()` offers only the newest file by name, so the next time Restore opens, "Undo last restore" points at a copy of the data that is still on the phone (a no-op), and the copy taken before the last real restore is no longer reachable from the app. The safety copies live in app-private `Paths.document`, which the user cannot browse without root, so after "restore A, then a failed attempt with B", the data from before A is effectively lost to the user. Within the same screen visit the stale `safetyCopy` state still shows the older copy (restore.tsx:84 refreshes only on success), so the offered undo point also changes silently between visits.
**Suggested fix:** When `migrateRows` or `replaceAll` throws after the safety copy was written, delete that just-written copy (it duplicates the unchanged data) before rethrowing, mirroring the half-written-copy cleanup already in `writeSafetyCopy`. This conflicts with the spec line "never deleted by the app", so record the owner's decision in the spec first. No new machinery; no current requirement is lost.
**Resolution:**

### F-22 [P3] open - Scanning an unknown barcode from the quick-add sheet still loses the chosen meal

**File:** apps/mobile/src/app/scan.tsx:43 (also the "Search products" fallback at :55; product form continues to logging at apps/mobile/src/app/product/[id].tsx:49)
**Found:** 2026-10-21 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** The sheet now passes `meal` to `/scan` (F-20), but the scanner forwards it only for a barcode already in the library. An unknown barcode goes to `/lookup/[barcode]` with only `barcode`, then the product form with `then=log`, and the amount form falls back to `defaultMeal(new Date())`; the "Search products" fallback also replaces to `/add` without `meal`. So a user who picks "Dinner" at 13:00 and scans a new product (the common first-scan case) lands on Lunch. The spec keeps the scan/add screens out of scope and its Done when ("every action opens its screen with the chosen meal") is met, so this is follow-up polish, not a contract break.
**Suggested fix:** Thread the optional `meal` param through `/lookup/[barcode]` and `/product/[id]` (when `then=log`) into `/add/[productId]`, and pass it on the scanner's "Search products" fallback, the same way `add/index.tsx` already passes `meal`/`day` through. No new machinery; no current requirement is lost.
**Resolution:**
