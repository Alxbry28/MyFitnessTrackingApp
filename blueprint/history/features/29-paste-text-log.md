# Feature: Paste text log

**From build-plan:** feature 29
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/paste-text-log`

## Goal

Type or paste the same meal text I used to give ChatGPT and turn it into log
entries. Simple offline rules read it. No AI, and reading needs no network.

A Preview screen shows each line as matched, to check, or not found. I fix
lines by choosing or creating a product. With "Always use this", the app
remembers that choice. When I'm online, a not-found line can also search Open
Food Facts by name to prefill a new product that I review before saving.

"Log" saves the matched lines and skips the rest. Nothing is saved before that
(user stories D1-D3, `1_docs/business_analyst/user_story/02_workflow_diagrams.md` §4).

## Design reference

- `prototypes/text-log.html`:
  - Frame 1 "Type or paste the day" is the text screen.
  - Frame 2 "Check matches, then log" is the Preview screen.
  - Frame 3 "Pick a match once, remembered after" is the match sheet.
- `prototypes/today.html`: the wide "Type or paste a meal list" action.
- Visual rules carried from the prototype CSS (tokens already ported in
  `src/lib/theme/tokens.ts`):
  - **Chips:** 32 dp pill chips on `surface2` with `muted` text.
  - **Editor card:** `surface` with an `accent` border and an `accentSoft`
    halo.
  - **Pills:**
    - ok uses `ok` on `surface2`
    - warn uses `estimate` on `estimateSoft`
    - bad uses `over` on `overSoft`
  - **Lines:** an 8 dp status dot (`ok` / `estimate` / `over`), name `sm` 500,
    source `xs` (`faint`, or warn/bad color), kcal `sm` 600.
  - **Fix link:** a 32 dp `accentSoft` pill with `accentText` `xs` 700.
  - **Bottom bar:** `surface` with a top border. It holds "Total so far" and
    a `lg` total, then a 1:2 row with ghost "Edit text" and primary "Log".
  - **Sheet:** `radius.lg` top corners, a grabber, and a `scrim` overlay. Radio
    options are 60 dp tall; the selected one has an `accent` border and an
    `accentSoft` fill. The remember checkbox is a 20 dp `accent` box.
  - **"est." badge:** `estimate` on `estimateSoft`.
- **How the frames are reproduced:**
  - The native header is hidden. A custom app bar matches frames 1 and 2:
    - a 48 dp muted icon button (`close` on frame 1, `arrow_back` on frame 2)
    - an `lg` 700 title
    - the day in `sm` muted text
  - Chip icons are Material Symbols (`content_paste`, `history`) through
    `expo-symbols`, which the tab bar already uses.
  - Editor headings show in `accentText` 700 and amounts in `muted`, as
    styled child runs of the `TextInput`.
  - The editor's halo is a 3 dp `accentSoft` ring.
  - "Preview N foods" sits in the content under the hint.
  - The sheet's "Use <name>" button is full width with no Cancel.
- **Not reproduced:** the phone status bar and frame, which are mockup-only.

## In scope

- **Entry points:** a wide "Type or paste a meal list" button on Today (after
  "Log weight", for today) and on the Log tab (above the totals, for the shown
  day). Both open `/paste-log` with a `day` param.
- **Text screen (frame 1):**
  - The header title is "Text log", with the target day on the right
    (`formatDayLabel`, e.g. "Today" or "Tue, Oct 20").
  - **Chips:**
    - **Paste** replaces the text with the clipboard text (`expo-clipboard`).
      An empty clipboard shows "Nothing to paste".
    - **Copy yesterday** fills the text from the previous day's log, written
      as `Breakfast:` headings with `<grams>g <product name>` lines. With
      nothing logged it shows "Nothing logged yesterday". If text already
      exists, it is appended after a blank line.
    - **Lunch → Dinner** appends a `Dinner:` heading plus a copy of the food
      lines from the first `Lunch:` section. It shows only when such a section
      has food lines.
  - The editor is a multiline `TextInput` labeled "Paste your log".
  - The format hint reads: "One header per meal, then one food per line:
    250g white rice, 250ml milk or 8oz chicken. Matched against your library,
    works offline."
  - The primary button reads "Preview N foods" (or "Preview 1 food"). It is
    disabled with no food lines and opens the Preview.
- **Reading rules (pure `pasteLog` service):**
  - Lines split on `\n` or `\r\n` and are trimmed. One leading bullet (`-`,
    `*` or `•` plus a space) is removed. Blank lines are ignored.
  - **Heading:** a line ending in `:` with text before it.
  - **Food:** `<amount><unit> <name>`. The unit is `g`, `ml` or `oz` (any
    case, optional space). A comma or dot is the decimal mark. Grams are the
    amount for `g` and `ml` (1 ml = 1 g), or the amount × 28.35 for `oz`.
    Grams must be finite and above 0.
  - **Anything else** is "not read". It is shown in the Preview, skipped and
    counted as skipped.
- **Sections and meals:**
  - A heading that names a meal (`breakfast`, `lunch`, `dinner`, `snack` or
    `snacks`, any case) logs to that meal.
  - Any other heading logs as **Snack** unless changed.
  - Food before the first heading logs to the time-of-day meal
    (`defaultMeal`).
  - A section with a non-meal heading or no heading shows "logs as `<Meal>` ▾"
    in its header. Tapping it opens a choice of the four meals. A meal heading
    shows the section's kcal sum instead.
- **Matching (by name key: lowercase, trimmed, inner spaces collapsed):**
  1. A choice made in this session (from the sheet), as **matched**.
  2. An active remembered match whose product still exists, as **matched**.
  3. Exactly one product whose name key equals the line's key, as **matched**.
  4. Otherwise, products whose name key contains the line's key:
     - Exactly one is **to check**, using that product.
     - Several are **to check**, using the first in library order (favorites,
       then name), with "N matches" in the source text.
  5. Otherwise **not found**.
- **Preview screen (frame 2):**
  - The header title is "Preview" with the day. Hardware back and "Edit text"
    return to the text screen with the text and choices kept.
  - **Summary pills:** "N matched", "N to check" and "N not found". A pill is
    hidden when its count is 0.
  - **One card per section:**
    - The head shows the heading, or the meal label when there is no heading,
      with a kcal sum or the meal choice.
    - A **matched** line shows the product name (with "est." when its source
      is `ai_estimate`), the source text (the raw line) and its kcal.
    - A **to check** line shows the product name and the source plus
      " · N matches" when there are several. It has a "Check" pill and no kcal.
    - A **not found** line shows the typed name and "<amount><unit> · not in
      your library". It has an "Add" pill.
    - Tapping any food line opens the match sheet.
  - Not-read lines show in a last card titled "Not read", with a red dot,
    the raw line and "Not read. Use a line like 250g rice".
  - **Bottom bar:** "Total so far" is the kcal sum of all matched and to-check
    lines. Then "Edit text" and "Log N, skip M" ("Log N" when M is 0). M counts
    not-found plus not-read lines. The button is disabled when N is 0 or a
    save is running.
- **Match sheet (frame 3):** a bottom sheet over a scrim.
  - It has a title "Which <typed name>?" and the line "For **<raw amount and
    name>** in <meal list>", which lists every section with that name key.
  - **Radio options:**
    - All products whose name contains the key (up to 5), each with name,
      "brand or Custom · kcal / 100 g" and kcal for the line's grams.
    - The current product is preselected.
    - A "Search your library" field sits above them, kept clear of the
      keyboard. It filters options from the whole library.
  - **"Always use this for "<typed name>"":** a checkbox, on by default.
  - The primary button reads "Use <product name>" (disabled with nothing
    selected). It applies the choice to every line with that key and closes
    the sheet.
  - **Secondary actions:**
    - **"New product"** opens the in-sheet `ProductForm` with the name
      prefilled. Saving creates the product (source `manual`) and selects it.
    - **"Search Open Food Facts"** shows only for a not-found line, when the
      search text isn't empty. It sends one request per tap. Results show name,
      brand and kcal per 100 g, or "No kcal listed".
    - Choosing an Open Food Facts result opens the in-sheet `ProductForm`
      prefilled from it, with the note "From Open Food Facts. It's community
      data, so check it against the label before saving." Source is
      `open_food_facts` when kcal was usable, otherwise `manual`.
    - Searching shows "Searching Open Food Facts...". Offline, a timeout or an
      error shows "Couldn't reach Open Food Facts. Go back and add it as a new
      product from the label." No results shows "Nothing on Open Food Facts for
      '<name>'."
    - "Back" returns to the options. The scrim and hardware back close the
      sheet.
  - **Additions beyond frame 3:** the plan line needs these to choose or
    create a product and to search Open Food Facts.
    - The "Search your library" field.
    - The "New product" and "Search Open Food Facts" pill buttons.
- **Log:**
  - One exclusive transaction creates every matched and to-check line
    (`foodLogRepo.create`, values copied, ADR-6) on the target day.
  - It also saves a remembered match for every name key chosen in the sheet
    with "Always use this" on. Then the screen goes back.
  - If a product has been deleted, nothing is saved and the screen shows "A
    matched product was removed. Check the lines and try again." It also
    reloads.
  - Any other failure saves nothing and shows "Couldn't save your log. Nothing
    was saved." The text and choices are kept.
- **Loading:** products and remembered matches load on focus.
  - Preview shows a spinner, "Loading your products".
  - An error shows "Couldn't load your products." with Retry, and the text is
    kept.
- **Remembered matches table:** migration `005_text_log_matches`, a
  repository, and the table added to the JSON backup's fixed table list.

## Out of scope

- AI parsing (feature 18), pantry or batch matching (S18, M16), and stock changes.
- Editing grams inside the Preview. Use "Edit text" instead.
- Densities per product for ml. 1 ml = 1 g for every food.
- A screen to view or delete remembered matches.
- Restoring the new table from a backup (feature 14).
- **Prototype gaps:** none. Only the mockup-only phone status bar and frame are
  left out.

## Build loop

Continuous Mode: steps run in order without review pauses, then one review
packet. Each step must keep `npx tsc --noEmit` and `npx expo lint` passing;
`npx expo-doctor` runs at the end. Checkpoint commits are disabled; the feature
commit happens at completion.

## Build steps

- [x] **1. Reading and matching rules (first version).**
  - Add `pasteLog.ts` with `parsePastedLog(text, fallbackMeal)`, `nameKey`,
    `mealForHeading` and `matchLine`, plus types.
  - **Done when:** typecheck and lint pass, and the scratch run reads the BA
    example as specified.
- [x] **2. Remembered matches storage.**
  - Migration `005_text_log_matches`, `textLogMatchRepo` and backup table.
  - **Done when:** typecheck and lint pass, and the migration is additive.
- [x] **3. Open Food Facts name search.**
  - `parseOffSearch` and `searchOffProducts`, sharing the barcode lookup's
    draft rules and request helper.
  - **Done when:** typecheck and lint pass. A scratch run shows results with
    and without kcal, dropped malformed entries, and `error` for non-2xx or
    non-JSON. Barcode parsing is unchanged.
- [x] **4. Rules for the prototype.**
  - Add `ml` and `oz` units with converted grams.
  - Non-meal headings default to Snack.
  - Contains-matches become "to check" with candidates; the matcher result
    carries status and candidates, and session choices count as matched.
  - Add `textFromEntries(entries)` for Copy yesterday and
    `copyLunchToDinner(text)`.
  - **Done when:** typecheck and lint pass. A scratch run shows `250ml`,
    `8oz` and `7,5 g` lines, the Pre-Workout section as Snack, the one and
    several "to check" cases, Copy yesterday text, and Lunch → Dinner output.
- [x] **5. Text screen (frame 1).**
  - Add `expo-clipboard` (installed with `npx expo install`).
  - The header has the day.
  - Add the Paste, Copy yesterday and Lunch → Dinner chips, the editor card,
    the format hint and "Preview N foods".
  - Add the wide entry buttons on Today and Log.
  - **Done when:** typecheck and lint pass. On the phone, the text screen
    looks like frame 1.
- [x] **6. Preview screen (frame 2) and Log.**
  - Add the pills, section cards and lines with dots, the meal choice, the
    Not read card, the bottom bar with the total and "Log N, skip M", the
    transactional save, and the errors.
  - **Done when:** typecheck and lint pass. On the phone, the BA example
    previews like frame 2, and Log adds the matched lines to the right meals
    and day.
- [x] **7. Match sheet (frame 3).**
  - Add the radio options, library search, the "Always use this" checkbox,
    "Use <name>", in-sheet "New product" and the Open Food Facts search.
  - Remove the old full-screen picker.
  - **Done when:** typecheck, lint and expo-doctor pass. On the phone, picking
    "White rice, cooked" with "Always use this" on, then logging, shows that
    line as matched on the next paste.

## Files / areas

All paths are under `apps/mobile/`.

- New: `src/modules/nutrition/services/pasteLog.ts`, `src/modules/nutrition/types/pasteLog.ts`
- New: `src/db/migrations/005_text_log_matches.ts`; changed: `src/db/migrations/index.ts`
- New: `src/modules/nutrition/repositories/textLogMatchRepo.ts`
- Changed: `src/modules/backup/repositories/backupRepo.ts`
- New: `src/modules/nutrition/hooks/usePasteLog.ts`, `src/app/paste-log.tsx`
- New: `src/modules/nutrition/components/PasteLogPreview.tsx`, `src/modules/nutrition/components/MatchSheet.tsx`
- Removed: `src/modules/nutrition/components/ProductPickerModal.tsx` (replaced by `MatchSheet`)
- Changed: `src/app/_layout.tsx`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/log.tsx`
- Changed: `src/modules/nutrition/services/productSchema.ts` (`newProductForm` takes an optional name)
- Changed: `src/modules/nutrition/hooks/useProducts.ts` (optional initial query)
- Changed: `src/modules/nutrition/services/mealTime.ts` (`logDay`, moved from `useAddEntry`), `src/modules/nutrition/hooks/useAddEntry.ts`
- Changed: `src/modules/nutrition/services/offProduct.ts`, `src/lib/openFoodFacts.ts`
- Changed: `package.json`, `package-lock.json` (`expo-clipboard ~57.0.2`, approved by the owner)

## Data / contracts

- **Table `text_log_matches`** (migration version 5, additive):

  ```sql
  CREATE TABLE text_log_matches (
    id          TEXT PRIMARY KEY,           -- randomUUID()
    name_key    TEXT NOT NULL,              -- nameKey() of the typed food name
    product_id  TEXT NOT NULL REFERENCES products(id),
    created_at  TEXT NOT NULL,              -- ISO UTC
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT                        -- soft delete, for sync later (ADR-4)
  );
  CREATE UNIQUE INDEX ux_text_log_match_key ON text_log_matches(name_key) WHERE deleted_at IS NULL;
  ```

- `remember` updates `product_id` and `updated_at` on the active row for that
  key, or inserts a new row. It runs inside the Log transaction.
- `listActive` skips rows whose product is soft-deleted.
- `nameKey(text)` = `text.trim().toLowerCase()` with inner whitespace runs
  collapsed. It is used for typed names, product names, remembered matches and
  choices.
- **Food line regex** (after bullet removal):
  `^(\d+(?:[.,]\d+)?)\s*(g|ml|oz)\s+(.+)$` (case-insensitive). The comma
  becomes a dot before `Number()`. `OZ_GRAMS = 28.35`.
- **Copy yesterday text:**
  - Yesterday's non-deleted entries come from `foodLogRepo.listByDay`, grouped
    in `MEAL_TYPES` order.
  - Each meal writes `<Meal label>:` followed by `<gramsToText(grams)>g
    <productName>` lines. Meals are separated by blank lines.
  - Empty meals are omitted.
- **Entries:**
  - Each logged line creates a normal `food_log_entries` row through
    `foodLogRepo.create`, with the product, the section meal, the converted
    grams and the target day.
  - `logged_at` is the save time. Values are copied (ADR-6).
- **Target day:** `logDay(param)` returns the `day` param when it is a real
  day not in the future, otherwise today.
- **Atomicity:** `db.withExclusiveTransactionAsync`.
  - Each product is re-read with `productRepo.findById(txn, ...)`. A missing
    product aborts the whole save.
  - A double tap on Log is ignored while a save runs.
  - A product created from the sheet is a library save through the existing
    form, not a log entry.
- **Open Food Facts name search:**
  - `GET https://world.openfoodfacts.org/cgi/search.pl?search_terms=<name>&search_simple=1&action=process&json=1&page_size=10&fields=<barcode lookup fields>`
  - It sends the same `User-Agent`, uses an 8 s timeout, makes no retries and
    needs no key.
  - Entries are parsed with the barcode lookup's tolerant schema and draft
    rules. At most 10 are kept, and nameless or malformed ones are dropped.
  - A non-2xx status or non-JSON body gives `error`. An abort or network
    failure gives `offline`.
- **Clipboard:** `Clipboard.getStringAsync()`. Pasted text is shown only
  through React Native `Text`/`TextInput`. It reaches SQL only as bound
  parameters.

## Testing

No test runner is configured, so logic is checked with scratch runs of the
pure parser, matcher, text helpers and `parseOffSearch`, plus typecheck, lint
and expo-doctor. On-phone checks compare the screens to the three prototype
frames and cover the live clipboard and Open Food Facts calls.

## Notes for the AI

- Follow the existing patterns:
  - `makeStyles(theme)` with `StyleSheet.create`
  - focus reloads with a request counter
  - repositories take `SQLiteDatabase`
  - comments only for the why
  - no em dashes
- Use theme tokens only, no hex values in components.
- Reuse `ProductForm`, `useProducts`, `forGrams`, `formatKcal`, `gramsToText`,
  `MEAL_LABELS`, `defaultMeal`, `formatDayLabel` and `logDay`.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":18254,"specSha256":"b7ba8fdd029778733d15494838d38f91db6e8dacca96107843d869dda01cbc0b","branch":"refs/heads/feature/paste-text-log","head":"b79d8f22a433ecc5744b6c8fa46f0086e3b564dd","baseRef":"refs/heads/main","baseCommit":"fac6517012df278b22e31dcf8c9df67d962d5902","sourceTree":"0dc4556724affb057b78dd7c0ad08af376e42536","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** b79d8f22a433ecc5744b6c8fa46f0086e3b564dd
**Base commit:** fac6517012df278b22e31dcf8c9df67d962d5902
**Base ref:** main
**Spec hash:** b7ba8fdd029778733d15494838d38f91db6e8dacca96107843d869dda01cbc0b
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-20T23:20:00+08:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T23:07:59+08:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `fac6517012df278b22e31dcf8c9df67d962d5902..b79d8f22a433ecc5744b6c8fa46f0086e3b564dd` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD` / `git merge-base main HEAD` / `sha256sum blueprint/context/current-feature.md` / `git status --porcelain`: pass (request current; only `blueprint/context/review.md` differed from the target)
- `npx tsc --noEmit` (apps/mobile): pass
- `npx expo lint` (apps/mobile): pass
- `npx expo-doctor` (apps/mobile): pass (21/21 checks)
- Unit tests: unavailable (no test runner configured)

### Evidence

- Reviewed the full 30-file delta: `pasteLog.ts` service and types, migration `005_text_log_matches` and its registration, `textLogMatchRepo`, backup table list, `usePasteLog`, `paste-log.tsx`, `PasteLogPreview`, `MatchSheet`, Open Food Facts search (`openFoodFacts.ts`, `offProduct.ts`), `logDay` move, `useProducts`/`newProductForm` changes, Today and Log entry buttons, `expo-clipboard` dependency, plus the Blueprint skill, plan and guide edits (`.agents` and `.claude` skill changes are identical).
- Parser and matcher follow the spec contract: food regex, `g`/`ml`/`oz` conversion with `OZ_GRAMS = 28.35`, bullet stripping, non-meal headings as Snack, fallback meal, five-step match order with library-order "to check" pick.
- Log save runs in one `withExclusiveTransactionAsync`, re-reads every product with `findById(txn, ...)`, aborts the whole save on a removed product with the specified message, guards double taps with a ref, and remembers only keys chosen with "Always use this".
- Migration is additive with the specified partial unique index; `listActive` joins out soft-deleted products; `remember` updates or inserts inside the Log transaction.
- Security: clipboard and Open Food Facts text reach SQL only as bound parameters and render only through `Text`/`TextInput`; the search term is `encodeURIComponent`-encoded; search entries go through the tolerant zod schema with bounded text and dropped nameless entries; a duplicate barcode from a search result is caught by the existing `duplicate_barcode` path.
- UI compared by reading `prototypes/text-log.html` frames 1-3 CSS against the styles: app bar, 32 dp chips, editor border and 3 dp halo, pills, 8 dp dots, line type, Fix pill, bottom bar 1:2 row, sheet radius, grabber, scrim, 60 dp radio options and 20 dp checkbox all match the stated tokens.

### Findings

- F-12 [P3] open: Open Food Facts result without kcal opens the form without the community-data note
- F-13 [P3] open: Hardware back on the sheet's form and search steps does not close the sheet as specified
- F-14 [P3] open: Match sheet options can omit candidates counted in the line's "N matches"
- F-15 [P3] unverified: Library search in the match sheet may sit under the keyboard
- No P0 or P1 findings.

### Remaining risk

- No test runner: parser, matcher, `textFromEntries`, `copyLunchToDinner` and `parseOffSearch` were reviewed by reading only; no scratch or unit run in this review.
- No on-device run: the styled-children `TextInput` (cursor behavior, placeholder with empty children), keyboard handling in the editor and match sheet, and the Log transaction were not exercised on a phone.
- Live clipboard (`expo-clipboard`) and the live Open Food Facts name search were not exercised.
- Prototype screenshot comparison was not run; the visual check was a code-to-CSS reading only.
- Check was not required and was not run.

## Try it now

Run or do:

From `apps/mobile/`, run `npx expo start` and open the app in Expo Go. On
**Today**, tap **Type or paste a meal list**, then type:

```text
Breakfast:
220g taho
Pre-Workout:
5g creatine
250ml milk
xyz line
```

Tap **Preview 3 foods**.

Expected:

The text screen shows the **Text log** app bar with the day. "Breakfast:" and
"Pre-Workout:" appear in orange in the editor. The Preview shows a pill per
status (matched, to check, not found) and cards for **Breakfast** and
**Pre-Workout**. Pre-Workout says "logs as Snack ▾". The last card, **Not
read**, lists "xyz line". Tapping a line opens the "Which ...?" sheet. After
choosing products, **Log N, skip M** adds the matched lines to Today under
Breakfast and Snack.

This proves:

Pasted text is read offline, previewed against your library like
`prototypes/text-log.html`, and only matched lines are logged.
