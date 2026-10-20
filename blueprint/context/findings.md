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

### F-04 [P3] open - Today can show "0 kcal over" or "0 kcal left" at the goal boundary

**File:** apps/mobile/src/modules/nutrition/components/CalorieSummary.tsx:24
**Found:** 2026-10-20 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** `over` is decided on unrounded totals (`eaten > goal`) while the headline rounds the difference. Logged kcal are scaled by grams, so fractional totals are normal: eating 2200.3 kcal against a 2200 goal shows "0 kcal over" in the over color with "Eaten 2,200" and "Goal 2,200" captions, which reads as a contradiction. This follows the spec's formulas, so it is a display polish item, not a contract break.
**Suggested fix:** Compare on the rounded values for the over/left decision and headline (for example `Math.round(eaten) > goal`), keeping the bar fraction unrounded. No current requirement is lost.
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
