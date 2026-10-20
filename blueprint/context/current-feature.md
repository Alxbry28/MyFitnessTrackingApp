# Feature: Product library

**From build-plan:** feature 1
**Build attempt:** 1
**Branch:** feature/product-library

## Goal

Give the app its foundation and its first real screen: a local SQLite database
with an additive migration runner, the four-tab shell, and a Products tab where I
can add, edit and search my own products with nutrition stored per 100 g. PRD
acceptance: 5 real products added by hand, and a product edit is what every
*later* log uses (feature 2 proves the log side; this feature must store edits in
place on the same row).

## Design reference

- `prototypes/products.html` frame 1 (library) and frame 4 (product form), with
  tokens from `prototypes/theme.css`.
- Port the shared tokens (surfaces, text, accent, status, macros, type scale,
  spacing, radius, `tap`) to `src/lib/theme/` with both dark and light values.
  Skip tokens marked mockup-only (`desk`, `shadow`) and the camera tokens until
  feature 4 needs them.
- Use the platform font (Roboto). Don't load Inter.
- Sprint rule: "ugly is fine" until Oct 28. Match the layout and tokens, skip polish.

## In scope

- **Database:** open one SQLite file through `expo-sqlite` and turn on
  `PRAGMA foreign_keys = ON`. A migration runner keyed on `PRAGMA user_version`
  runs each pending migration in its own transaction. Migration `001_init` creates
  only the `products` table and its two indexes.
- **Startup states:** a loading state while the database opens and migrates. If
  opening or migrating fails, show an error screen with a short message. The
  failed migration rolls back and nothing is wiped.
- **Tab shell:** Expo Router tabs Today, Log, Products and Settings, in that
  order, with Today as the start tab. Today, Log and Settings are placeholders
  that each name the feature that fills them (3, 2 and 3).
- **Products tab:**
  - A search field.
  - A count line ("N products · values per 100 g").
  - A `FlatList` of products: name, a meta line (brand, or "Custom" when there's
    no brand, plus serving size when set) and kcal per 100 g rounded to a whole
    number.
  - An "Add product" button.
  - Tapping a row opens it for editing.
- **Search:** partial and case-insensitive on name ("chick" finds "Chicken breast,
  boiled"), and updates as I type. An empty query lists every product. Order is
  favorites first, then name.
- **List states:**
  - Loading.
  - Empty library: "No products yet" plus the Add action.
  - No matches: "No products match '<query>'".
  - Load failure: a message plus Retry.
- **Product form (new and edit):**
  - Fields: name, brand, barcode, serving size (text, e.g. "1 can"), serving
    grams, net weight (g), kcal, protein, carbs and fat per 100 g.
  - Numeric keyboards for number fields, labels above each field, and the error
    shown under its field.
  - Save writes the product and goes back to the list. The list then reflects
    the change.
  - Edit loads the existing values. Saving updates the same row in place and sets
    `updated_at`.
  - A product created from this form has `source = 'manual'`. Editing never
    changes `source`.
- **Validation (UX_FLOWS §4 and PRD F1):**
  - Name is required after trimming.
  - kcal per 100 g is required, 0-900.
  - Protein, carbs and fat are optional, 0-100 each.
  - Barcode is optional, digits only, and unique among products that aren't
    deleted.
  - Serving grams and net weight are optional and must be > 0.
  - An empty optional field is stored as `NULL`. Text fields are trimmed, and an
    empty brand or serving size is stored as `NULL`.
- **Save failure:** a duplicate barcode shows an inline error on the barcode
  field. Any other write failure shows a message on the form, keeps every typed
  value, and never leaves the form silently.
- **Theme:** a theme module with a `useTheme()` hook that follows the system light
  or dark setting. Screens and the tab bar use its tokens only, with no raw hex
  values or sizes.

## Out of scope

- Barcode scanning and the Scan button (feature 4). The prototype's Scan FAB
  becomes "Add product" for now.
- Open Food Facts lookup, preview and source badges (feature 5).
- The prototype's Recent / Scanned / Custom filter chips, and favoriting
  (feature 6). `is_favorite` exists in the schema with default 0 and only feeds
  the sort.
- The "macros add up to ≈ N kcal" check shown in the prototype form.
- Deleting products (not in the build plan). `deleted_at` exists so later
  features can soft delete.
- `food_log_entries` and `settings` tables (they arrive in migrations for
  features 2 and 3).
- An unsaved-changes prompt on back.
- Unit tests: no test runner exists yet.
- Pantry fields, iOS and web.

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`.
Implement all steps in order, keep the project passing typecheck and lint after
each one, then present one review packet for the whole feature. No checkpoint
commits. `/complete` makes the final commit.

## Build steps

- [ ] **1. Dependencies and theme tokens.**
  - Check the SDK 58 docs for `expo-sqlite`, `expo-crypto` and Expo Router tabs
    before writing code (rule in `apps/mobile/AGENTS.md`).
  - Run `npx expo install expo-sqlite expo-crypto react-hook-form zod @hookform/resolvers`.
  - Confirm that the installed `@hookform/resolvers` version supports the
    installed `zod` major version.
  - Add `src/lib/theme/tokens.ts`, with dark and light palettes plus shared space,
    radius, type and `tap` values from `prototypes/theme.css`, and
    `src/lib/theme/useTheme.ts`.
  - **Done when:** `npx tsc --noEmit`, `npx expo lint` and `npx expo-doctor` pass,
    and the app still opens in Expo Go.
- [ ] **2. Tab shell.**
  - Replace `src/app/index.tsx` with `src/app/(tabs)/_layout.tsx` (themed `Tabs`)
    plus `index.tsx` (Today), `log.tsx`, `products.tsx` and `settings.tsx`.
  - Make `src/app/_layout.tsx` a `Stack` that hosts the `(tabs)` group.
  - Add tab icons only if an installed package renders them on Android.
    Otherwise use labels only.
  - **Done when:** typecheck and lint pass, and on the phone the four tabs switch
    in light and dark mode with Today first.
- [ ] **3. Database and migration runner.**
  - `src/db/client.ts` opens the database and runs migrations at startup.
    Prefer `SQLiteProvider` with an init callback in the root layout, plus
    `useSQLiteContext` in hooks, if the SDK 58 docs confirm it.
  - `src/db/migrations/001_init.ts` exports `up(db)` with the `products` DDL from
    Data / contracts.
  - `src/db/migrations/index.ts` holds the ordered list.
  - Add the loading state and the startup error screen.
  - **Done when:** typecheck and lint pass, the app opens on the phone, a reload
    opens again without re-running `001`, and a temporary `user_version` log
    shows 1. Remove that log before review.
- [ ] **4. Product types, schema and repository.**
  - `src/modules/nutrition/types/product.ts` holds the camelCase `Product` and
    `ProductInput` types.
  - `src/modules/nutrition/services/productSchema.ts` holds the zod form schema
    with the validation rules, including blank to `null`, trimming and number
    parsing.
  - `src/modules/nutrition/repositories/productRepo.ts` provides `search(query)`,
    `count()`, `findById(id)`, `findByBarcode(barcode)`, `create(input)` and
    `update(id, input)`, all with bound parameters. It maps rows to types,
    generates ids with `randomUUID()` and sets the timestamps.
  - A duplicate barcode returns a typed result (`{ ok: false, error: 'duplicate_barcode' }`)
    instead of throwing a raw SQLite error. Other write errors still reject.
  - **Done when:** typecheck and lint pass, and the repo is reachable from a hook
    (no screen imports SQL).
- [ ] **5. Products list screen.**
  - `src/modules/nutrition/hooks/useProducts.ts` handles the search query and
    loading, error and retry states, and refreshes when the tab regains focus.
  - Add a `ProductRow` component.
  - `src/app/(tabs)/products.tsx` holds the search field, count line, `FlatList`,
    the empty, no-match and error states, and the Add product button.
  - **Done when:** typecheck and lint pass, and the phone shows the empty state
    on a fresh install. Search behavior is checked in step 6 once products exist.
- [ ] **6. Product form (new and edit).**
  - `src/app/product/[id].tsx` handles both modes: `new` for create, otherwise
    an edit by UUID.
  - Add a `ProductForm` component using `react-hook-form` with the zod resolver.
    Each error appears under its field, and submitting moves focus to the first
    invalid field.
  - Add a not-found state for an unknown id.
  - Handle save failures, keeping the typed values.
  - **Done when:** typecheck and lint pass, and on the phone:
    - Adding 5 real products works.
    - "chick" finds a chicken product.
    - Editing a product's kcal shows the new value in the list.
    - Each validation rule shows its error.
    - A second product with an existing barcode shows the duplicate error.
    - Values survive an app restart.

## Files / areas

All paths are under `apps/mobile/`.

- `package.json`, `package-lock.json`: the new dependencies
- `src/app/_layout.tsx`: root `Stack` and database provider
- `src/app/index.tsx`: removed (replaced by the tab group)
- `src/app/(tabs)/_layout.tsx`, `index.tsx`, `log.tsx`, `products.tsx`, `settings.tsx`
- `src/app/product/[id].tsx`
- `src/db/client.ts`, `src/db/migrations/index.ts`, `src/db/migrations/001_init.ts`
- `src/lib/theme/tokens.ts`, `src/lib/theme/useTheme.ts`
- `src/modules/nutrition/types/product.ts`
- `src/modules/nutrition/services/productSchema.ts`
- `src/modules/nutrition/repositories/productRepo.ts`
- `src/modules/nutrition/hooks/useProducts.ts` (plus `useProduct.ts` for the form if needed)
- `src/modules/nutrition/components/ProductRow.tsx`, `ProductForm.tsx`

## Data / contracts

Migration `001_init` (from `1_docs/DATABASE.md` §3, `products` only):

```sql
CREATE TABLE products (
  id                TEXT PRIMARY KEY,
  barcode           TEXT,
  name              TEXT NOT NULL,
  brand             TEXT,
  serving_size      TEXT,
  serving_grams     REAL,
  kcal_per_100g     REAL NOT NULL CHECK (kcal_per_100g >= 0),
  protein_per_100g  REAL CHECK (protein_per_100g >= 0),
  carbs_per_100g    REAL CHECK (carbs_per_100g >= 0),
  fat_per_100g      REAL CHECK (fat_per_100g >= 0),
  net_weight_g      REAL,
  source            TEXT NOT NULL CHECK (source IN ('manual','open_food_facts','ai_estimate')),
  is_favorite       INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT
);
CREATE UNIQUE INDEX ux_products_barcode ON products(barcode)
  WHERE barcode IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX ix_products_name ON products(name COLLATE NOCASE);
```

- **Migrations:** after `001` commits, `user_version` is 1. Each migration and its
  `user_version` bump run in one transaction. A failure rolls back and surfaces
  the startup error. Migrations are additive only, with no `down`.
- **IDs and time:** ids are UUID v4 strings from `expo-crypto` `randomUUID()`.
  `created_at` and `updated_at` are UTC ISO 8601 strings from
  `new Date().toISOString()`. `update` changes `updated_at` only and keeps
  `created_at` and `id`.
- **Search query:**

  ```sql
  SELECT ... FROM products
  WHERE deleted_at IS NULL AND name LIKE '%' || ? || '%' ESCAPE '\' COLLATE NOCASE
  ORDER BY is_favorite DESC, name COLLATE NOCASE
  ```

  The query is trimmed and `\`, `%` and `_` are escaped before binding. An empty
  query drops the `LIKE` clause. There's no row limit: a personal library is
  small and `FlatList` virtualizes. `count()` counts rows that aren't deleted.
- **Barcode uniqueness:** the repo checks `findByBarcode` first (excluding the
  product being edited). The unique index is the backstop, and its constraint
  error maps to `duplicate_barcode`.
- **Types:**
  - `Product`: `{ id, barcode, name, brand, servingSize, servingGrams, kcalPer100g, proteinPer100g, carbsPer100g, fatPer100g, netWeightG, source, isFavorite, createdAt, updatedAt }`
  - `ProductInput`: the editable subset, without id, source, favorite or timestamps.
  - Nullable columns map to `null`, and `is_favorite` maps 0/1 to a boolean.
- **Storage precision:** stored numbers keep full precision. Only the list display
  rounds kcal.

## Testing

- No test runner and no Verify command exist yet, so there are no automated tests
  in this feature. Gates: `npx tsc --noEmit`, `npx expo lint` and
  `npx expo-doctor` from `apps/mobile/`.
- Behavior is checked by hand on the phone in Expo Go, in light and dark mode,
  using the Done-when list in steps 2, 3 and 6.
- `productSchema.ts` and the LIKE escaping are pure logic and should get unit
  tests once `/tests` adds Jest. Keep them pure so that's easy.
- Use made-up demo products for any screenshot that goes into the repo
  (ADR-17).

## Notes for the AI

- Run every command from `apps/mobile/`. Add packages with `npx expo install`.
- Read the versioned Expo SDK 58 docs before using any Expo API. Don't rely on
  memory.
- Layers (`1_docs/ARCHITECTURE.md` §2):
  - Route files compose components and hooks only.
  - No SQL in `src/app/` or components.
  - The repository owns every query and maps snake_case to camelCase.
- Product names and brands are user text. Render them only through `<Text>`,
  never interpolated into SQL.
- Accessibility:
  - Every input has a visible label and a matching `accessibilityLabel`.
  - Touch targets are at least `tap` (48 dp).
  - Errors are visible text under the field.
- Use `StyleSheet.create` with theme tokens and `tabular-nums` for numbers.
- `1_docs/DESIGN_SYSTEM.md` still lists the older teal palette. The prototype's
  `theme.css` is newer and wins for this feature. Note the drift in the review
  packet rather than editing the design system doc here.
- Comments explain *why* only. No em dashes in comments.
