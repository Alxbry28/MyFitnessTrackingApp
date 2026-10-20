# Project Plan

> Drafted from `1_docs/` on Oct 20, 2026 (mainly `plan/01`, `03`, `05`, `08`–`11`
> and `tech_lead/01`). Those docs keep the detail, stories and ADRs; this file is
> the summary the Blueprint workflow reads.

## 1. Problem - What problem are we solving?

Logging food is slow and unreliable today. MyFitnessPal is cluttered with wrong
foods, and ChatGPT has no memory and can't scan a barcode. Groceries repeat, so
the same products get typed in again and again.

The app is a personal, local-first fitness tracker: scan a grocery barcode, save
*my* product once with *my* numbers, and log a meal in a few taps. Over time it
adds a pantry (what food I have at home), body progress, workouts and AI help.

Core principles:

1. **Log fast** - barcode scan, recents, favorites, one-tap re-log
2. **Offline-first** - daily logging never needs the network
3. **My data, my products** - scanned items live in my own database, my edits win
4. **AI assists, I decide** - AI output is always previewed and confirmed before saving
5. **Start small** - ship a thin slice, use it daily, then deepen

## 2. Users - Who is this for?

- **Primary:** me, a .NET developer learning React, on my Android phone, using it
  every day from Oct 23, 2026.
- **Testers:** 2-5 Android friends in Friends Beta 1 (from Nov 29). Each one has
  their own data on their own phone.
- **Portfolio viewers:** the repo is public and doubles as a portfolio piece.

One user per device. No accounts while data stays on the phone. Personal values
(calorie goal, units, scale brand, region) are settings, never hard-coded.

## 3. Features - What does the MVP need?

**v1 (Oct 31, 2026) - nutrition only:**

- Personal product library (nutrition per 100 g, add/edit/search)
- Food log by meal (breakfast / lunch / dinner / snack) with quantity
- Today screen: eaten / goal / remaining calories
- Barcode scan, then local lookup, then Open Food Facts, then a manual form with the barcode prefilled
- Recent and favorite products for one-tap re-log
- Day navigation, edit entry quantity, JSON export backup

**After v1:** pantry inventory (groceries, canned and opened items, supplements,
recipes and cooked batches), body weight and BMI, friends-beta readiness, .NET
API with sync and AI meal parsing, workouts, body measurements and calorie
stats, scale sync, web dashboard, accounts.

## 4. Data - What are we storing?

Local SQLite on the phone (synced to PostgreSQL later):

- **Products** - barcode, name, brand, serving size, kcal/protein/carbs/fat per 100 g, net weight, source, favorite
- **Food log entries** - date/time, meal, product, grams, a **copy** of the nutrition values at log time
- **Settings** - calorie goal, units, first-run profile values
- **Pantry** (v1.1) - pantry items, stock movements ledger, recipes, recipe ingredients, batches, batch ingredients
- **Body progress** - body profile, weight entries, import runs, measurement sessions, body measurements
- **Workouts** - exercises, workout sessions, workout sets
- **Sync** (later) - local sync queue

Data rules (ADR-6, -7, -8, -9):

- Nutrition is stored per 100 g. Log entries copy their values, so editing a product never rewrites history.
- Pantry stock is the sum of `stock_movements`. It is not an editable number.
- Buying or cooking food never changes daily macros. Only food log entries do.
- Body data is stored in kg and cm. BMI, trends and TDEE are calculated, not stored.
- Every table uses UUID ids plus `created_at` / `updated_at`.

## 5. Tech - What stack are we using?

Locked for October (`08` §1):

- **App:** Expo + React Native + TypeScript + Expo Router, Android only (ADR-12), cross-platform libraries preferred
- **Data:** `expo-sqlite`, local only, with a simple additive migration runner
- **Forms/validation:** `react-hook-form` + `zod`
- **Barcode:** `expo-camera`; product data from Open Food Facts (free, no key)
- **Export:** `expo-sharing` (JSON backup)

Later (proposed in `tech_lead/01`):

- **API:** ASP.NET Core Minimal API (C#) + EF Core, on Render (Docker) with Neon PostgreSQL
- **AI:** Gemini or OpenAI, called only through the API (ADR-5)
- **Crash reports:** Sentry free tier (`@sentry/react-native`)
- **Web dashboard:** separate React app (Vite + React Router + TanStack Query) on the same API, on Vercel or Cloudflare Pages
- **CI:** GitHub Actions

Budget is $0: free tiers only.

## 6. Monetize - How will this make money?

It won't. This is a personal app and a portfolio piece on a $0 budget.

## 7. UI/UX - How should this look and feel?

- Tab shell: **Today · Log · Products · Settings** (Pantry and Progress tabs come later)
- Speed over looks: scan to logged in under 30 s; breakfast in 3 taps or fewer
- Default styles are fine until Oct 28. Polish (empty states, number formatting, keyboard handling) is planned for Oct 28 and after v1
- Calorie, BMI and TDEE numbers are labeled as estimates, not medical advice

> TODO: visual style and styling library aren't decided.

## 8. Deployment - Where and how will this ship?

- **App:** Android APK via EAS Build preview profile
  (`eas build -p android --profile preview`). It's shared as a link or APK file
  and sideloaded by friends. JS-only fixes ship through EAS Update. Always keep
  the same EAS-managed keystore so updates install over the old app without
  wiping data. No Play Store for Beta 1. iPhone is parked until there's money for
  the $99/year Apple fee.
- **API (later):** Render free tier (Docker), Neon PostgreSQL. Secrets live in env
  vars and EAS secrets, with only `.env.example` committed. Expect cold starts.
- **Web dashboard (January):** static Vite build on Vercel or Cloudflare Pages.
  CORS allows only its domain.

## 9. Usage model and constraints (optional)

- **Scale:** 1 user now; 2-5 trusted friends from Nov 29.
- **Reachability:** v1 and Beta 1 are fully offline and on-device, with no
  server. Beta 2 (January+) adds an internet-facing API with per-user accounts,
  sync and AI.
- **Data safety:** people use the app daily on real data. Migrations must be
  additive and never wipe data. Export a backup before schema changes.
- **Privacy:** the repo is public, so no personal health data, exports or real
  screenshots go in git (ADR-17). Progress photos stay on the device (ADR-10).
  Crash reports contain no food or body data.
- **Cost:** AI calls get limits and a monthly cost cap before friends use them.
- **Non-requirements:** no social features, no marketplace, no web *app* for
  logging, no iOS for now. Finance is a separate project.
