# Feature: Open Food Facts lookup

**From build-plan:** feature 5
**Build attempt:** 1
**Status:** verified
**Branch:** feature/open-food-facts-lookup

## Goal

When a scanned barcode isn't in the library, look it up on Open Food Facts, show
the values normalized to per 100 g in the editable product form, then save the
product to the library and continue to logging. If the product isn't found, has
no kcal, the lookup fails or the phone is offline, the same form opens with the
barcode filled in and a short note, so local products still get logged. Nothing
is saved without the user reviewing it. PRD acceptance: 10 real groceries
scanned end to end, and local PH products that aren't on Open Food Facts still
get logged.

## Design reference

- `prototypes/products.html` frames 3b "Not in library, found on Open Food Facts"
  and 3c "Not found anywhere, enter from label": the product form with a source
  note above it ("Found on Open Food Facts. It's community data, so check it
  against the label before saving.") and a save action that continues to
  logging.
- `1_docs/DESIGN_SYSTEM.md` §6 `OfflineNotice` (an info banner, shown only when
  an online action falls back).
- Default styles are fine; macro sanity check lines from the prototype are polish
  and stay out.

## In scope

- **External call (owner-approved Oct 20):** a read-only `GET` to Open Food
  Facts, exactly as `1_docs/API.md` §2:
  - URL: `https://world.openfoodfacts.org/api/v2/product/{barcode}.json?fields=code,product_name,brands,nutriments,serving_size,serving_quantity,product_quantity`
  - The `User-Agent` header from API.md.
  - An 8 s timeout through `AbortController`.
  - One request per lookup, made only after a local library miss.
- **Pure parser `src/modules/nutrition/services/offProduct.ts`:**
  - `parseOffResponse(httpStatus, body)` returns `{ kind: "found", draft }`,
    `{ kind: "not_found", draft }` or `{ kind: "error" }`.
  - The body is `unknown` and parsed with `zod`. Every field is optional and
    numbers may arrive as numbers or numeric strings.
  - `draft` is the product form values (strings) with the barcode set.
  - Mapping from API.md §2:
    - `product_name` to name.
    - The first comma-separated `brands` item to brand.
    - `serving_size` to serving size.
    - `serving_quantity` to serving grams.
    - `product_quantity` to net weight.
  - **Normalization (DATABASE.md §6):** per-100 g values come from
    `energy-kcal_100g`, `proteins_100g`, `carbohydrates_100g` and `fat_100g`. When
    a `_100g` value is missing but the `_serving` value and serving grams exist,
    use `serving / grams * 100`.
  - **Left blank, never guessed:** values that can't be normalized, and values
    outside the form's valid ranges (kcal 0-900, macros 0-100).
  - **Outcomes:**
    - Found with a usable kcal: `found`.
    - Status 0, HTTP 404, or found without a usable kcal: `not_found`, with only
      the name and brand prefilled (UX_FLOWS §3).
    - Any other HTTP status, or a malformed body: `error`.
- **Network client `src/lib/openFoodFacts.ts`:** `fetchOffProduct(barcode)`
  returns the parser result, or `{ kind: "offline" }` on a network error or
  timeout.
- **Lookup screen `src/app/lookup/[barcode].tsx`** (title "Check and save"):
  - **While loading:** "Looking up on Open Food Facts..." with a spinner and an
    "Enter manually" escape.
  - **Then the product form**, prefilled from the draft, with one note above it:
    - Found: "Found on Open Food Facts. It's community data, so check it against
      the label before saving."
    - Not found: "This barcode isn't in your library or on Open Food Facts. Add
      it once from the label."
    - Offline or error: the `OfflineNotice` "Couldn't reach Open Food Facts.
      Enter the values from the label."
  - Saving creates the product with `source = open_food_facts` when the found
    draft was used, otherwise `manual`, then replaces itself with
    `/add/[productId]`. A duplicate barcode shows the existing field error.
- **Scanner change:** a library miss now replaces the scanner with
  `/lookup/[barcode]` instead of the product form. "Enter manually" is
  unchanged.
- **`productRepo.create`** takes an optional `source` (default `manual`).
  `useProduct`'s create path stays `manual`.

## Out of scope

- An Open Food Facts credit or About screen (DEPENDENCIES.md notes it isn't
  planned yet).
- Product images, bulk lookups, writing to Open Food Facts, and caching misses
  (a later scan of a saved product never calls again, because the library is
  checked first).
- mL and liquid products, macro sum sanity checks, and the "est." badge.
- Retrying a lookup automatically.

## Build loop

Continuous Mode: steps run in order without review pauses. Each step must keep
`npx tsc --noEmit`, `npx expo lint` and `npx expo-doctor` passing. Checkpoint
commits are disabled; the final feature commit happens at completion. I don't
call the live API during the build; the parser is checked with sample bodies.

## Build steps

- [x] **1. Parser and repository source.**
  - Add `src/modules/nutrition/services/offProduct.ts`.
  - Add the `source` parameter to `productRepo.create`.
  - **Done when:** typecheck and lint pass, and a scratch node run with sample
    bodies gives the expected results:
    - Full `_100g` values: found, with every field mapped.
    - Per-serving values only (with serving grams): normalized per 100 g.
    - No kcal: not_found, with name and brand only.
    - Status 0 and HTTP 404: not_found.
    - HTTP 500 and a malformed body: error.
    - kcal 1500: kcal left blank.
- [x] **2. Network client and lookup screen.**
  - Add `src/lib/openFoodFacts.ts`.
  - Add `src/modules/nutrition/hooks/useOffLookup.ts`, which loads once per
    barcode and ignores a result that arrives after unmount.
  - Add `src/app/lookup/[barcode].tsx` and register it in the root `Stack`.
  - Point the scanner's miss branch at `/lookup/[barcode]`.
  - **Done when:** typecheck, lint and expo-doctor pass. On the phone:
    - A packaged product missing from the library opens Check and save with Open
      Food Facts values, and saving continues to Add to meal.
    - An unknown local barcode opens the form with the not-found note.
    - Airplane mode shows the offline note within about 8 s.

## Files / areas

All paths are under `apps/mobile/`.

- New: `src/modules/nutrition/services/offProduct.ts`
- New: `src/lib/openFoodFacts.ts`
- New: `src/modules/nutrition/hooks/useOffLookup.ts`
- New: `src/app/lookup/[barcode].tsx`
- Changed: `src/modules/nutrition/repositories/productRepo.ts`
- Changed: `src/app/scan.tsx`
- Changed: `src/app/_layout.tsx`

## Data / contracts

- **Untrusted input (SECURITY.md):** the response body is parsed with `zod` from
  `unknown`. Unknown fields are ignored, and strings are trimmed.
  - Numbers are accepted only when finite. A numeric string must parse fully
    with `Number()`.
  - Name, brand and serving text are capped at 200 characters before they reach
    the form.
  - Text renders only through `<Text>` and `TextInput`.
- **Draft format:** `ProductFormValues` strings. Numbers are rounded to 2
  decimals, with no exponent notation. Blank means unknown.
- **Saving:**
  - Always through `productSchema` (form validation) and then
    `productRepo.create(db, input, source)`.
  - `source` is `open_food_facts` only when the found draft was used. The user's
    edits win from then on.
  - No write happens without the user tapping save.
- **Network:**
  - `fetch` with `headers: { "User-Agent": ... }` and an `AbortController`
    timeout of 8000 ms.
  - Abort and network failures map to `offline`. HTTP 404 and `status: 0` map
    to `not_found`. Other non-2xx statuses map to `error`.
  - No retries, and no API key.

## Testing

No test runner is configured. `offProduct.ts` is pure and checked with a scratch
node run on sample bodies in step 1. The network path, screens and fallbacks
need the on-phone Done-when checks.

## Notes for the AI

- `fetch` and `AbortController` are built into React Native; no new
  dependencies.
- Reuse `ProductForm` with `defaultValues` from the draft and a custom
  `onSubmit`.
- Follow existing patterns: `makeStyles`, thin routes, comments only when
  needed, and no em dashes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8281,"specSha256":"62a6660faeb1cd20caa88a65299aea5ab48421d6c3c108da16c41e6aced0a41d","branch":"refs/heads/feature/open-food-facts-lookup","head":"3c067cc9a7b88e352385be5915a775d5d66314c2","baseRef":"refs/heads/main","baseCommit":"b6e9d9d50b98277c97cc8f1173b8d639c733a56c","sourceTree":"5757a08e4843f4ae356ccdedf61ce4b1fdffb479","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 3c067cc9a7b88e352385be5915a775d5d66314c2
**Base commit:** b6e9d9d50b98277c97cc8f1173b8d639c733a56c
**Base ref:** main
**Spec hash:** 62a6660faeb1cd20caa88a65299aea5ab48421d6c3c108da16c41e6aced0a41d
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-20T12:47:28Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T12:49:33Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `b6e9d9d50b98277c97cc8f1173b8d639c733a56c..3c067cc9a7b88e352385be5915a775d5d66314c2` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`: pass (HEAD, merge base and spec hash match the request; only review.md differs)
- `npx tsc --noEmit` (apps/mobile): pass
- `npx expo lint` (apps/mobile): pass
- Scratch `node` run of `offProduct.ts` + `productSchema.ts` (temp copies, deleted after) on 22 sample bodies: pass for every spec case; reproduced F-07
- `npx expo-doctor`: unavailable (not run; it contacts the Expo API and this review was restricted from network services)

## Evidence

- Reviewed all 7 changed app files plus `ProductForm.tsx`, `productSchema.ts`, `productRepo.ts`, `barcode.ts`, `types/product.ts`, `db/migrations/001_init.ts` (source CHECK includes `open_food_facts`), API.md §2/§5, SECURITY.md trust table, DATABASE.md §6.
- Untrusted boundary: body parsed from `unknown` with zod; leaves are `unknown` and coerced only via finite-number and trimmed, 200-char-capped string helpers; arrays/strings/null bodies map to `error`; null or odd-typed leaves blank only that field; kcal 0-900 and macros 0-100 enforced; text renders only through `Text`/`TextInput`; SQL uses bound parameters including the new `source`; barcode is digits-only from the scanner and `encodeURIComponent`-escaped into a fixed HTTPS host.
- Outcomes verified: full `_100g` found and mapped; per-serving normalized (150 kcal / 30 g -> 500); no kcal, kcal 1500, negative kcal, `status: 0`/`"0"`, missing product and HTTP 404 -> `not_found` with name/brand only; HTTP 500/301, null, string and array-product bodies -> `error`.
- Network client: single GET, documented User-Agent, 8000 ms AbortController covering headers and body, timer cleared in `finally`, network/abort -> `offline`, no retries; hook drops results after unmount; save goes through `productSchema` and `productRepo.create(db, input, source)` only on user tap.

## Findings

- F-07 [P3] open - Open Food Facts draft can show exponent notation or a zero serving weight

## Remaining risk

- `npx expo-doctor` not run (network-backed; restricted in this review).
- No test runner is configured; parser evidence is a scratch run, not a repeatable test.
- On-phone Done-when checks (real product lookup, unknown local barcode, airplane-mode timeout) and the live Open Food Facts response shape were not exercised; Check was not required.
- In-flight fetch is not aborted when the user taps "Enter manually" or leaves; bounded by the 8 s timeout, result is discarded.

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go with the
phone online. Tap **Scan** on Today and scan a packaged grocery that is **not**
in your Products library (most international brands are on Open Food Facts).

Expected:

A **Check and save** screen shows "Looking up on Open Food Facts..." briefly,
then the product form filled with the name, brand and per-100 g values under the
note "Found on Open Food Facts. It's community data, so check it against the
label before saving." Tapping **Save and add amount** opens **Add to meal** for
the new product. In airplane mode the same scan shows "Couldn't reach Open Food
Facts. Enter the values from the label." with only the barcode filled in.

This proves:

A library miss is looked up on Open Food Facts, normalized into the reviewable
product form, saved only on confirm, and falls back to manual entry offline.
