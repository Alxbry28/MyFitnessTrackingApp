# Feature: Barcode scanner

**From build-plan:** feature 4
**Build attempt:** 1
**Status:** verified
**Branch:** feature/barcode-scanner

## Goal

Scan an EAN/UPC barcode with the camera, feel a vibration on the read, and go
straight to the add-to-meal screen when the product is already in the library.
A barcode that isn't in the library opens the product form with the barcode
filled in, and logging continues after saving. If camera permission is denied,
the user can still search or add the product by hand. This is the local half of
the "scan to logged in under 30 s" flow; feature 5 adds the Open Food Facts
lookup on a miss.

## Design reference

- `prototypes/products.html` frame 2 "Scanning": a full-screen camera with a
  framing guide, the "Point at a barcode" hint and the "Type barcode" escape.
- `1_docs/UX_FLOWS.md` §3: the permission branch and the "ignore reads for 2 s
  after a hit" rule.
- `1_docs/DESIGN_SYSTEM.md` §6: `ScannerView` (framing guide, torch toggle,
  "Enter manually") and `ScanButton` on Today and Products.
- Default styles are fine. Labels only, no icon packages.

## In scope

- **Dependency (owner-approved Oct 20):** `expo-camera` ~57.0.6 via `npx expo
  install`. Add the config plugin to `app.json` as
  `["expo-camera", { "recordAudioAndroid": false }]`: the scanner never records
  audio, so the app shouldn't request the microphone.
- **Scanner route `src/app/scan.tsx`:** a full-screen modal.
  - **Permission:**
    - While the status is unknown, show a short loading state.
    - When it isn't granted and can be asked: explain why and offer "Allow
      camera".
    - When it's denied and can't be asked again: explain, and offer "Open
      settings" (`Linking.openSettings()`).
    - In every case, "Search products" opens `/add` and "Enter manually" opens
      the new product form.
  - **Granted:**
    - `CameraView` scanning `ean13`, `ean8`, `upc_a` and `upc_e`.
    - A framing guide and the hint "Point at a barcode".
    - A torch toggle ("Torch on" / "Torch off") and an "Enter manually" button.
  - **On a read:**
    - Ignore further reads until the lookup finishes, and for 2 s after it.
    - Vibrate with React Native's `Vibration` (no new package).
    - Normalize the data to digits only, then look it up with
      `productRepo.findByBarcode`.
  - **Match:** replace the scanner with `/add/[productId]`, carrying the meal
    param when one was passed in.
  - **Miss:** replace the scanner with `/product/new?barcode=<digits>&then=log`.
  - **Lookup error:** show "Couldn't check your library. Try again." and keep
    scanning.
- **Product form handoff:**
  - `src/app/product/[id].tsx` accepts optional `barcode` and `then=log`
    params.
  - In create mode, `barcode` prefills the barcode field.
  - After a successful save with `then=log`, it replaces itself with
    `/add/[productId]` for the new product. Without it, it goes back as before.
  - `ProductForm`'s `onSaved` receives the saved product id.
- **Entry points:** a "Scan" button on the Today tab, below the summary, and in
  the Products tab next to the search field, both opening `/scan`.

## Out of scope

- The Open Food Facts lookup, preview and offline notice (feature 5).
- Haptics packages; `Vibration` covers "vibrate" in the build plan.
- Pantry "how many did you buy" after a scan (feature 8), and scanning from the
  Log tab's meals.
- QR and other barcode types.

## Build loop

Continuous Mode: steps run in order without review pauses. Each step must keep
`npx tsc --noEmit`, `npx expo lint` and `npx expo-doctor` passing. Checkpoint
commits are disabled; the final feature commit happens at completion.

## Build steps

- [x] **1. Install the camera package.**
  - `npx expo install expo-camera`, then add the plugin entry to `app.json`.
  - **Done when:** `package.json` lists `expo-camera ~57.0.6`, and `npx
    expo-doctor` passes.
- [x] **2. Product form handoff.**
  - Add the `barcode` and `then` params to `src/app/product/[id].tsx`.
  - Change `ProductForm`'s `onSaved(id)`.
  - Add a `newProductForm(barcode)` helper to `productSchema.ts`.
  - **Done when:** typecheck and lint pass, and `/product/new?barcode=123&then=log`
    opens with 123 in the barcode field. The existing Products flow still goes
    back after saving.
- [x] **3. Scanner screen and entry points.**
  - Add `src/app/scan.tsx` and register it in the root `Stack` with
    `presentation: "fullScreenModal"` and the title "Scan".
  - Add `src/modules/nutrition/services/barcode.ts` (`normalizeBarcode`: digits
    only; null when empty).
  - Add Scan buttons on Today and Products.
  - **Done when:** typecheck, lint and expo-doctor pass. On the phone:
    - Scanning a saved product's barcode vibrates and opens "Add to meal" for
      it.
    - An unknown barcode opens New product with the barcode filled in, and
      saving continues to "Add to meal".
    - Denying permission shows the explain screen with Search products and Enter
      manually.

## Files / areas

All paths are under `apps/mobile/`.

- Changed: `package.json`, `package-lock.json`, `app.json`
- New: `src/app/scan.tsx`
- New: `src/modules/nutrition/services/barcode.ts`
- Changed: `src/app/_layout.tsx`
- Changed: `src/app/product/[id].tsx`
- Changed: `src/modules/nutrition/components/ProductForm.tsx`
- Changed: `src/modules/nutrition/services/productSchema.ts`
- Changed: `src/app/(tabs)/index.tsx`, `src/app/(tabs)/products.tsx`

## Data / contracts

- No schema change. Lookups use the existing `findByBarcode`, which excludes
  deleted rows, through bound parameters.
- **Barcode normalization:** strip every non-digit character. An empty result
  is ignored, and the scan keeps going. The digits are what get looked up and
  prefilled, matching the product schema's "Digits only" rule.
- **Debounce:**
  - A ref flag blocks reads while a lookup is in flight.
  - After a lookup that keeps the scanner open (the error case), reads stay
    blocked for 2000 ms.
  - Navigation away uses `router.replace`, so going back from the next screen
    doesn't return to a scanner mid-read.
- **Route params:**
  - `/scan?meal=<MealType>` (optional).
  - `/add/[productId]?meal=` (existing).
  - `/product/[id]?barcode=<digits>&then=log` (new and optional). Unknown
    `then` values are ignored.
- **Permissions:** Android camera only. No microphone (`recordAudioAndroid:
  false`). Denial never blocks logging.

## Testing

No test runner is configured. `normalizeBarcode` is pure and checked with a
scratch node run in step 3. The camera flows need the on-phone Done-when checks,
because a build can't prove them.

## Notes for the AI

- Read the installed `expo-camera` 57 types (`CameraView`, `useCameraPermissions`,
  `BarcodeScanningResult`), not memory.
- Follow the feature 1-3 patterns:
  - `makeStyles(theme)` for styles.
  - Thin route files.
  - Comments only when needed.
  - No em dashes in comments or copy.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6931,"specSha256":"4090e3face992f4ee1032b2ae01e2cfd95b6efba7e8e2a3f3bcb8ac1910974f2","branch":"refs/heads/feature/barcode-scanner","head":"5869b0d0afff54725d424cce898b121fb73a5a13","baseRef":"refs/heads/main","baseCommit":"63e704fae07fc4569465d931d16c2bd74ade5cf2","sourceTree":"0bf3b5b1d8cee09be0e3a69cee9b9b85df4ce5ae","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 5869b0d0afff54725d424cce898b121fb73a5a13
**Base commit:** 63e704fae07fc4569465d931d16c2bd74ade5cf2
**Base ref:** main
**Spec hash:** 4090e3face992f4ee1032b2ae01e2cfd95b6efba7e8e2a3f3bcb8ac1910974f2
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-20T12:40:05Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T12:42:35Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `63e704fae07fc4569465d931d16c2bd74ade5cf2..5869b0d0afff54725d424cce898b121fb73a5a13` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `git rev-parse HEAD` / `git merge-base main HEAD` / `sha256sum blueprint/context/current-feature.md`: pass (HEAD, merge base and spec hash match the request; tracked spec, no snapshot)
- `git status --porcelain --untracked-files=all`: pass (only `blueprint/context/review.md` differs)
- `npx tsc --noEmit` (apps/mobile): pass
- `npx expo lint` (apps/mobile): pass
- `npx expo-doctor` (apps/mobile): pass (21/21 checks)
- `node <scratch>/nb.mts` (normalizeBarcode, 5 assertions, scratch file outside repo, deleted): pass
- Test command: unavailable (no test runner configured)

## Evidence

- Reviewed all 12 changed files in the delta: `scan.tsx`, `product/[id].tsx`, `ProductForm.tsx`, `productSchema.ts`, `barcode.ts`, `_layout.tsx`, Today and Products tabs, `app.json`, `package.json`, lockfile (adds only expo-camera and its web deps), and the spec.
- Followed callers and contracts: `productRepo.findByBarcode` (bound parameter, excludes deleted rows), partial unique index `ux_products_barcode` (deleted rows excluded, so a miss can always be saved), `useProduct.save` result id, `add/[productId]` meal handling and `dismissTo("/log")`.
- Read installed `expo-camera` plugin (`recordAudioAndroid: false` omits RECORD_AUDIO; library manifest declares CAMERA only) and expo-modules-core `PermissionsHook.ts` (status fetched once on mount).
- Debounce matches the spec: ref blocks reads during lookup; match/miss leave via `router.replace`; error path re-enables after 2000 ms. Empty normalized reads are ignored without vibrating.
- Security: camera data only reaches a bound SQL parameter and route params; deep-link `barcode`/`then` params only prefill a form or choose a navigation target, nothing is saved without user action.

## Findings

- F-05 [P3] open - Scanner keeps showing "Camera access is off" after granting in Settings
- F-06 [P3] open - Torch toggle announces a checked state that contradicts its label

## Remaining risk

- No test runner configured; `normalizeBarcode` was checked only by a scratch node run.
- Camera flows (scan match, miss to form to Add to meal, permission denial, torch, vibration) were not exercised on a device; Check was not required.
- Standalone APK manifest (VIBRATE permission from the Expo prebuild template, absence of RECORD_AUDIO) not verified by a prebuild; `eas.json` is not set up yet.
- The optional `meal` param on `/scan` is carried only on a match; the miss and fallback paths drop it. No current caller passes `meal`, so this is not reachable today.

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start --clear` (new native package) and open
the app in Expo Go. Save a product with its real barcode in **Products** first.
Then go to **Today**, tap **Scan**, allow the camera, and point it at that
product's barcode.

Expected:

The phone vibrates once and the **Add to meal** screen opens for that product.
Scanning a barcode that isn't saved opens **New product** with the Barcode
field already filled in; saving it continues to **Add to meal**.

This proves:

The camera reads EAN/UPC barcodes and a local library match goes straight to
logging, with an unknown barcode handed to the product form.
