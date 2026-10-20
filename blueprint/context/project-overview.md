# MyFitnessTrackingApp - Project Overview

<!-- blueprint:source-hash 11606437be2dc4e32ea8d67f614ac88fdea55e639df5407f499f533b9af4fe4c -->

> A personal, local-first Android fitness tracker: scan a barcode, save your own
> product once, log meals in a few taps. Later it adds pantry, body progress,
> workouts and AI help.

## Problem

Food logging is slow. MyFitnessPal is cluttered with wrong foods, ChatGPT has no
memory or barcode scanning, and the same groceries get typed in again and again.
The app keeps *my* products with *my* numbers on the phone, works offline, and
makes daily logging take seconds.

Principles: log fast; offline-first; my data, my products; AI assists but I
confirm before anything is saved; ship thin slices.

## Users

- **Owner** - one Android user, logging daily from Oct 23, 2026. A .NET developer learning React.
- **Beta testers** - 2-5 trusted Android friends from Nov 29, each with separate on-device data.
- **Portfolio viewers** - the public repo is a portfolio piece.

One user per device. No accounts until Beta 2. Personal values (goal, units,
scale, region) are settings, never constants.

## Usage model

- v1 and Beta 1 run fully on-device: no server, no accounts, no network needed to log.
- Beta 2 (January+) adds an internet-facing API with per-user accounts, sync and AI.
- People use the app daily on real data. Migrations must be additive and never wipe data.
- The repo is public. No personal health data, exports, real screenshots or secrets go in git (ADR-17).
- Progress photos stay on the device (ADR-10). Crash reports carry no food or body data.
- AI gets per-user limits and a monthly cost cap before testers use it. Budget is $0.
- Non-requirements: social features, marketplace, a web app for logging, iOS (parked), finance (separate project).

## Features

**v1 - Nutrition (due Oct 31, 2026).** The headline flow is features 4-5: scan to logged in under 30 s.

1. **Product library** - SQLite + migration runner + tab shell; add/edit/search products per 100 g.
2. **Food log** - log a product to a meal and date with grams; edit and delete entries.
3. **Today screen** - calorie goal setting; eaten / goal / remaining and per-meal summaries.
4. **Barcode scanner** - `expo-camera` scan that opens the matching saved product.
5. **Open Food Facts lookup** - on a local miss: fetch, preview, edit, save and log. Falls back to a manual form with the barcode prefilled.
6. **One-tap re-log** - recents (7 days), favorites, quick-add on Today.
7. **Day navigation and JSON export** - prev/next day; JSON backup via the share sheet.

**v1.1 - Pantry, body weight, friends beta (November).**

8. **Pantry and groceries** - stock ledger; add after scan; eat from pantry; remove with reason; log edits restore stock.
9. **Canned and opened items** - drained values and weight; opened can with grams left.
10. **Supplements** - pantry items counted in grams per scoop.
11. **Body weight and BMI** - body profile, weight log, 7-day trend, BMI on Progress, Xiaomi CSV import.
12. **Recipes and cooked batches** - recipes; batches with settled cooked weight; per-100 g portions.
13. **First-run setup** - goal, units, height, sex, birth date, BMI scale.
14. **Backup restore** - safe JSON import.
15. **Beta feedback and safety** - feedback button, Sentry, disclaimer and privacy page.

**Later (December onward).**

16. **.NET API foundation** - ASP.NET Core Minimal API + PostgreSQL (Render + Neon).
17. **Sync** - push/pull local changes, last-write-wins.
18. **AI meal parse** - text, then parsed entries, preview, confirm, save.
19. **Workouts** - exercise library, session flow, sets with previous hints, history.
20. **Body measurements** - sites, sessions, change since start, waist-to-height.
21. **Calorie stats** - weekly averages, 30-day chart, TDEE, suggested target.
22. **Scale sync** - Health Connect weight read on app open.
23. **Web dashboard** - separate Vite React app on the same API.
24. **Accounts (Beta 2)** - per-user accounts for tester sync and AI.

## Data model

SQLite on the device, mirrored to PostgreSQL once sync exists. **Locked for every
table:** `id` (UUID text), `created_at`, `updated_at` (ISO timestamps). Column
names use snake_case. Detailed column lists live in `1_docs/plan/03` §4, `09` §5
and `10` §8.

### products (feature 1)

- `barcode` (text, nullable, unique when present) - null for manual items
- `name` (text), `brand` (text, nullable)
- `serving_size` (text) - display only, e.g. "1 can"
- `kcal_per_100g` (real), `protein_per_100g`, `carbs_per_100g`, `fat_per_100g` (real, nullable)
- `net_weight_g` (real, nullable) - reserved for pantry
- `source` (enum: `open_food_facts` | `manual` | `ai_estimate`)
- `is_favorite` (bool) - feature 6
- Pantry later adds `label_basis`, `eaten_drained`, drained values per 100 g, `usual_drained_g`, `track_in_pantry`
- has many `food_log_entries`, `pantry_items`, `recipe_ingredients`

### food_log_entries (feature 2)

- `logged_at` (timestamp), `meal_type` (enum: `breakfast` | `lunch` | `dinner` | `snack`)
- `product_id` (FK products, nullable)
- `grams` (real)
- `kcal`, `protein_g`, `carbs_g`, `fat_g` (real) - **copied at log time** (ADR-6), so product edits never rewrite history
- `pantry_item_id` (nullable), `updated_by_settle` (bool) - added with the pantry

### settings (feature 3)

- Single-row or key/value store: `calorie_goal_kcal`, then units and first-run values (feature 13)

> TODO: the plans list both a `settings` table (08) and `daily_nutrition_goals`
> with `effective_date` (03). Pick one in feature 3.

### Pantry (features 8-12)

- **pantry_items** - `kind` (`packaged` | `supplement` | `batch`), `product_id?`, `batch_id?`, `status` (`sealed` | `opened` | `active` | `finished` | `discarded` | `expired`), `location` (`fridge` | `freezer` | `cupboard`), `opened_at?`, `expires_at?`
- **stock_movements** (ledger, ADR-7) - `pantry_item_id`, `occurred_at`, `delta_units?`, `delta_grams`, `reason` (`bought` | `cooked` | `eaten` | `used_in_cooking` | `shared` | `discarded` | `spilled` | `adjustment`), `food_log_entry_id?`, `batch_id?`. Stock = sum of movements
- **recipes** - `name`, `notes`, `learned_cooked_ratio`
- **recipe_ingredients** - `recipe_id`, `product_id`, `raw_grams`, `is_estimated`
- **batches** - `recipe_id?`, `cooked_at`, `cooked_weight_g`, `weight_method` (`weighed_parts` | `settled` | `estimated`), `is_settled`, kcal/P/C/F per 100 g
- **batch_ingredients** - `batch_id`, `product_id`, `raw_grams`, copied per-100 g values, `is_estimated`

> Locked rule (ADR-8): stock changes never touch daily macros. Only food log entries count.

### Body progress (features 11, 20-22)

- **body_profile** (one row) - `height_cm`, `sex`, `birth_date`, `activity_level`, `goal` (`cut` | `maintain` | `bulk`), `bmi_scale` (`asia_pacific` | `who`), `tracked_sites`
- **body_weight_entries** - `measured_at`, `weight_kg`, `source` (`manual` | `health_connect` | `apple_health` | `csv_import`), `source_record_id?`, `is_daily_value`, `body_fat_pct?`, `muscle_kg?`, `water_pct?`, `note`
- **import_runs** - `source`, `file_name?`, `started_at`, readings found / added / skipped
- **measurement_sessions** - `measured_on`, `note`, `photo_uris?` (device only)
- **body_measurements** - `session_id`, `site`, `side` (`left` | `right` | `none`), `value_cm`, `state` (`relaxed` | `flexed`)
- Calculated, never stored (ADR-9): BMI, waist-to-height, trends, weekly averages, TDEE. Stored in kg/cm; the display unit is a setting.

### Workouts (feature 19)

- **exercises** - `name`, `muscle_group?`, `equipment?`
- **workout_sessions** - `started_at`, `ended_at?`, `name?`, `notes?`
- **workout_sets** - `session_id`, `exercise_id`, `set_number`, `reps?`, `weight_kg?`, `duration_sec?`, `rpe?`

### sync_queue (feature 17)

- `table_name`, `record_id`, `operation` (`insert` | `update` | `delete`), `payload` (JSON), `created_at`

## Tech stack

- **Expo + React Native + TypeScript + Expo Router** - the app; Android only (ADR-12), cross-platform libraries preferred
- **expo-sqlite** - local-only storage behind repository functions (ADR-3), additive migrations
- **react-hook-form + zod** - forms and validation, including Open Food Facts responses
- **expo-camera** - barcode scanning; **Open Food Facts** - free product lookup, no key
- **expo-sharing** - JSON backup export
- **Sentry** (`@sentry/react-native`) - Beta 1 crash reports
- **ASP.NET Core Minimal API + EF Core + PostgreSQL** - later API on Render + Neon
- **Gemini or OpenAI** - AI only through the API (ADR-5)
- **Vite + React Router + TanStack Query** - January web dashboard
- **GitHub Actions** - CI

## Monetization

None. This is a personal and portfolio project on a $0 budget.

## UI/UX

Speed over looks: scan to logged in under 30 s; breakfast in 3 taps or fewer. Default
styles until Oct 28, polish after v1. Health numbers are labeled as estimates.

- `(tabs)/today` - eaten / goal / remaining, meal summaries, quick-add
- `(tabs)/log` - entries by meal for a date, prev/next day
- `(tabs)/products` - library, search, add/edit, scan entry point
- `(tabs)/settings` - calorie goal, export (restore and first-run later)
- Pantry and Progress tabs arrive in v1.1

> TODO: the visual style and styling library aren't decided.

## Deployment

- **App:** Android APK from `eas build -p android --profile preview` (needs `eas.json`), shared as a link and sideloaded. EAS Update for JS-only fixes. Keep the same EAS-managed keystore so updates never force an uninstall. No Play Store for Beta 1; iOS is parked.
- **API (later):** Render free tier (Docker) + Neon PostgreSQL. Secrets go in env vars or EAS secrets, with `.env.example` committed. Expect cold starts.
- **Web dashboard (January):** static Vite build on Vercel or Cloudflare Pages. CORS allows only its domain.

> TODO: env var names, health check path and the API's repo location aren't decided.

## Open questions

> Resolve in the plans or `1_docs`, then re-run /overview.

- **November order is proposed, not approved** (`08` §6, Q-N1). The build plan follows the proposal: pantry before the API and workouts.
- **`03` conflicts with the locked decisions:** it stores products per serving and puts workouts in v1. ADR-6 and the sprint take precedence; `03` is stale.
- **Goal storage:** `settings` vs `daily_nutrition_goals` (see Data model).
- **Repo layout for later apps:** the .NET API and the web dashboard have no agreed place yet (this repo vs separate repos).
- **Feature 12** (recipes and batches) is the largest item (`09` P4, ~11 days). Consider splitting it when it is specced.
- **Scale sync (22)** needs an EAS dev build; its slot after calorie stats is a guess.
- **Schedule:** the sprint planned scaffolding for Oct 19, and the app isn't scaffolded yet.
