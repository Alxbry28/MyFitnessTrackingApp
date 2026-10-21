# Build Plan

Features in build order, one line each. Run `/feature` to spec the next unchecked
item, or `/feature 2` to pick one. Keep completed items checked and append new
features as the project grows. Do not renumber completed features; their
archived specs refer to those IDs.

Pre-build (not features): scaffold the Expo app, run it in Expo Go.

## v1 - Nutrition (due Oct 31, 2026)

- [x] 1. **Product library** - SQLite setup with migration runner and tab shell; add, edit and search products with nutrition per 100 g
- [x] 2. **Food log** - log a product to a meal on a date with grams (values copied onto the entry); edit and delete entries
- [x] 3. **Today screen** - calorie goal in Settings; Today shows eaten / goal / remaining and per-meal summaries
- [x] 4. **Barcode scanner** - scan with `expo-camera`, vibrate, open the matching saved product
- [x] 5. **Open Food Facts lookup** - on local miss fetch, preview, edit, save and log; manual form with barcode prefilled when not found or offline
- [x] 6. **One-tap re-log** - recent products (7 days), favorites, quick-add on Today
- [x] 7. **Day navigation and JSON export** - previous/next day on Log; JSON backup via share sheet

## v1.1 - Phone-only app, no API (due Oct 31, 2026)

- [x] 29. **Paste text log** - built to `prototypes/text-log.html`: "Type or paste a meal list" on Today and Log opens a text screen (Paste, Copy yesterday and Lunch → Dinner chips); rules (no AI, offline) read `Meal:` headings and `250g`, `250ml` (1 ml = 1 g) or `8oz` (28.35 g) food lines; a heading that is not a meal logs as Snack unless changed; a Preview screen matches lines to my products and shows matched, to check and not found; fix a line by choosing or creating a product, with "Always use this" to remember it; when online, a "not found" line can search Open Food Facts by name to prefill the new-product form for review; Log saves the matched lines and skips the rest; nothing saves until Log
- [x] 11. **Body weight and BMI** - body profile, weight log, 7-day trend, BMI on a Progress screen, Xiaomi CSV import
- [x] 14. **Backup restore** - import a JSON backup safely
- [x] 30. **Match shipped screens to prototypes** - screens built before the prototypes became the contract are rebuilt to their HTML frames; prototype parts that need data from later features are listed as gaps
  - [x] 30a. **Today screen to prototype** - `today.html`: Today app bar with date, calorie ring card (eaten, goal, remaining, burned), macro bars, meal cards with foods and + Add, Log food button opening the quick-add sheet (meal chips, Scan / Search / Type or paste, Recent); "Snacks" label app-wide
  - [x] 30b. **Log screen to prototype** - `log.html`: date nav with calendar hint, total card with over badge and bar, meal group cards, swipe to delete, entry edit per `entry-edit.html`
- [x] 13. **First-run setup** - goal, units, height, sex, birth date, BMI scale, current weight, activity level; formula TDEE (Mifflin-St Jeor) suggests a calorie goal to accept or override; personal values become settings

After 13 (not a feature): build the Android APK with `eas build -p android --profile preview` and use it daily.

- [x] 8. **Pantry and groceries** - pantry items plus stock movements ledger; add after scan; eat from pantry; remove with reason; log edits restore stock
  - [x] 8a. **Pantry list and adding stock** - `pantry_items` + `stock_movements` tables (stock in grams); tab bar Today · Log · Pantry · Progress · More; Pantry list per `pantry.html` frame 1; "How many did you buy?" after a scan or from a product (frame 3)
  - [x] 8b. **Pantry item detail and removing stock** - item detail with amount left and movement history (frame 2); log a portion from the pantry; remove with reason and adjust to actual (frame 4)
  - [x] 8c. **Pantry in food search and log edits** - "In my pantry" section on Add food; editing or deleting a log entry restores its pantry stock
- [x] 9. **Canned and opened items** - drained values, usual drained weight, opened can with grams left
- [ ] 10. **Supplements** - supplement pantry items counted in grams per scoop
- [ ] 12. **Recipes and cooked batches** - recipes, batches with settled cooked weight, per-100 g portions, cooking subtracts tracked items
- [ ] 19. **Workouts** - exercise library, start/active/complete session, sets with previous hints, history; exercise illustrations from `@bryllim/workout-guide` (ADR-20: art is CC BY-SA 4.0, credit Bryl Lim and Everkinetic, don't edit the art)
- [ ] 20. **Body measurements** - measurement sites, sessions, change since start, waist-to-height
- [ ] 21. **Calorie stats** - weekly averages, 30-day chart, learned TDEE from logged food and weight trend (formula TDEE ships in 13), suggested target

## v1.2 - .NET API and friends beta (November)

- [ ] 16. **.NET API foundation** - ASP.NET Core Minimal API with PostgreSQL on Render and Neon
- [ ] 15. **Beta feedback and safety** - feedback button, Sentry crash reports, disclaimer and privacy page

## Later (December onward)

- [ ] 26. **Pantry label OCR** - on-device ML Kit text recognition (needs an EAS dev build); tap the label text to fill the product name; read the expiry date from EXP/BB text (later of two dates, DD/MM default) with +1 week/month/6 months/year chips as fallback; always confirm before saving
- [ ] 27. **Expiry warnings** - "Expiring soon" list on Pantry and Today, plus local notifications with `expo-notifications` before `expires_at`
- [ ] 28. **Receipt OCR** - scan a grocery receipt into a reviewed list of pantry items; remember each confirmed receipt line to product match so repeat items fill in automatically; build only if most shopping turns out to be at supermarkets
- [ ] 25. **Product and grocery photos** - take or pick a photo for a product or pantry item, upload it through the API to file storage, show it in the product library and pantry; Open Food Facts image as fallback
- [ ] 17. **Sync** - push and pull local changes through the API with last-write-wins
- [ ] 18. **AI meal parse** - text to parsed entries, preview, confirm, then save
- [ ] 22. **Scale sync** - read weight from Health Connect when the app opens
- [ ] 23. **Web dashboard** - separate Vite React app on the same API
- [ ] 24. **Accounts (Beta 2)** - per-user accounts so testers' data syncs and they can use AI
