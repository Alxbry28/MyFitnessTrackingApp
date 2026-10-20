# Feature: One-tap re-log

**From build-plan:** feature 6
**Build attempt:** 1
**Status:** verified
**Branch:** feature/one-tap-re-log

## Goal

Make repeat foods fast:
- Star a product as a favorite.
- See recently logged products (last 7 days) and favorites as one-tap chips on
  Today, under a quick-add section.
- A chip opens Add to meal with the meal picked by time of day and the last
  grams prefilled, so one more tap logs it.

PRD acceptance: a repeat breakfast is logged in 3 taps or fewer, plus grams.

## Design reference

- `prototypes/today.html` "Quick-add sheet": the "Recent" list with name, amount
  and kcal, and the Scan barcode / Search library actions.
- `1_docs/DESIGN_SYSTEM.md`:
  - §7 Today layout: the "RECENT" overline and the one-tap chips.
  - §6 `ProductRow` with a favorite star.
- `1_docs/UX_FLOWS.md` §2: recents are distinct products logged in the last 7
  days, newest first. Default grams are the last grams used.
- Default styles, text star glyphs ("★" / "☆"), no icon packages.

## In scope

- **`productRepo`:**
  - `setFavorite(id, isFavorite)` updates `is_favorite` and `updated_at`.
    Returns `{ ok }` or `not_found`.
  - `favorites()` returns non-deleted favorites by name, limit 12.
  - `recentlyLogged(sinceIso)` returns distinct non-deleted products with a
    non-deleted log entry at or after `sinceIso`, newest log first, limit 12
    (DATABASE.md §3 "Recents").
- **Favorite star:**
  - `ProductRow` takes an optional `onToggleFavorite`. When given, it shows a
    star button with `accessibilityRole="switch"`, the label "Favorite" and the
    checked state.
  - The Products tab wires the star. The list refreshes after a toggle, and
    favorites already sort first in search.
  - A failed toggle shows "Couldn't update favorite." and leaves the row as it
    was.
- **Today quick-add (`QuickAdd` component, `useQuickAdd` hook):**
  - Below the Scan button: a "Recent" chip row (last 7 days) and a "Favorites"
    chip row.
  - Each chip shows the product name and opens `/add/[productId]`.
  - A row with nothing in it is hidden. When both are empty, show "Log a food
    or star a favorite to see it here."
  - A "Search library" button opens `/add`.
  - Loads on focus. A load error shows "Couldn't load quick add." with Retry,
    without blocking the rest of Today.

## Out of scope

- The quick-add bottom sheet and "type or paste a meal list" (feature 18).
- Recents inside the product picker. Search already lists favorites first.
- Copying yesterday's meal (PRD backlog B3).
- Favorite stars in the picker and on the Log tab.

## Build loop

Continuous Mode: steps run in order without review pauses. Each step must keep
`npx tsc --noEmit`, `npx expo lint` and `npx expo-doctor` passing. Checkpoint
commits are disabled; the final feature commit happens at completion.

## Build steps

- [x] **1. Favorites and recents in the repository, with the star on Products.**
  - Add `setFavorite`, `favorites` and `recentlyLogged` to `productRepo`.
  - Add the optional star to `ProductRow`.
  - Add `toggleFavorite` to `useProducts` and wire it in
    `src/app/(tabs)/products.tsx`.
  - **Done when:** typecheck and lint pass. On the phone, tapping the star fills
    it, and the product moves to the top of the list.
- [x] **2. Quick add on Today.**
  - Add `src/modules/nutrition/hooks/useQuickAdd.ts`.
  - Add `src/modules/nutrition/components/QuickAdd.tsx`.
  - Render it on Today below Scan.
  - **Done when:** typecheck, lint and expo-doctor pass. On the phone, after
    logging oats for breakfast, Today shows an "Oats" chip under Recent.
    Tapping it opens Add to meal with the last grams prefilled, and "Add to
    Breakfast" logs it: 2 taps.

## Files / areas

All paths are under `apps/mobile/`.

- Changed: `src/modules/nutrition/repositories/productRepo.ts`
- Changed: `src/modules/nutrition/components/ProductRow.tsx`
- Changed: `src/modules/nutrition/hooks/useProducts.ts`
- Changed: `src/app/(tabs)/products.tsx`, `src/app/(tabs)/index.tsx`
- New: `src/modules/nutrition/hooks/useQuickAdd.ts`
- New: `src/modules/nutrition/components/QuickAdd.tsx`

## Data / contracts

- No schema change: `products.is_favorite` (0/1) already exists.
- **Recents query:**

  ```sql
  WITH recent AS (
    SELECT product_id, MAX(logged_at) AS last_at FROM food_log_entries
    WHERE logged_at >= ? AND deleted_at IS NULL AND product_id IS NOT NULL
    GROUP BY product_id
  )
  SELECT <product columns> FROM products JOIN recent ON recent.product_id = products.id
  WHERE products.deleted_at IS NULL
  ORDER BY recent.last_at DESC
  LIMIT 12
  ```

  `sinceIso` is `new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()`.
  `logged_at` is UTC ISO, so string comparison orders correctly.
- **Favorites query:**
  `WHERE is_favorite = 1 AND deleted_at IS NULL ORDER BY name COLLATE NOCASE LIMIT 12`.
- **Favorite toggle:**
  `UPDATE products SET is_favorite = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`.
  It doesn't change nutrition values. Bound parameters throughout.
- A chip navigates with `{ productId }` only. The add screen already picks the
  meal by time and prefills the last grams (feature 2).

## Testing

No test runner is configured, and there's no new pure logic. Evidence is
typecheck, lint, expo-doctor and the on-phone Done-when checks.

## Notes for the AI

- Reuse feature 2's add screen; no new route.
- Follow the existing patterns: `makeStyles`, focus refresh in hooks, comments
  only when needed, no em dashes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5523,"specSha256":"d996558ab258506872b45fcec08a2db065c563a1d2c8a9dcb3ca6cf9170f6f86","branch":"refs/heads/feature/one-tap-re-log","head":"7f4993ae3507be9a073b75acf6d5ba48c69834f6","baseRef":"refs/heads/main","baseCommit":"7f4993ae3507be9a073b75acf6d5ba48c69834f6","sourceTree":"4e6db9e8bdfe8d7a6aca175f2b339873a1609a93","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go. Log any
product once (Log, + Add food, pick it, Add). Then open **Today**.

Expected:

Under **Recent** there is a chip with that product's name. Tapping it opens
**Add to meal** with the grams you used last time and the meal for the current
time already selected; one tap on **Add to ...** logs it. On **Products**,
tapping the ☆ next to a product turns it into ★, moves it to the top, and it
appears under **Favorites** on Today.

This proves:

Recent products and favorites give a repeat food in two taps from Today.
