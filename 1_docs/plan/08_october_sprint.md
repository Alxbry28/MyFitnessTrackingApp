# 08 — October Sprint: Nutrition v1 by Oct 31

**Created:** October 19, 2026 (Mon)  
**Deadline:** October 31, 2026 (Sat) — **13 days**  
**Starting point:** planning docs only, no code yet

The original roadmap (`06`) is ~15 weeks for everything. That doesn't fit in 13 days, so this sprint ships **one thing that works end to end**: the nutrition tracker from `07` §5, running on your phone, used every day.

---

## 1. Locked decisions (don't revisit this month)

| Decision | Choice | Why |
|----------|--------|-----|
| App shape | One Expo app; only the Nutrition module this month | Fastest daily value (see `07`) |
| Framework | Expo + TypeScript + Expo Router | Teaches React |
| Data | `expo-sqlite`, **local only** | No server to build or host |
| Backend | **None this month** | .NET API comes in November, with sync + AI |
| Barcode data | Open Food Facts → saved to your `products` table | Free, no key |
| AI | **None this month** | Stretch goal only |
| Forms | `react-hook-form` + `zod` | |
| Target device | Your phone via Expo Go, then an EAS preview build | |

### Out of scope until November

Workouts, the .NET API, Supabase/sync, AI, charts, macro *targets* (store the macro fields, but don't build UI for them yet).

---

## 2. Definition of done (Oct 31)

- [ ] Scan a grocery barcode → product found (local or Open Food Facts) → logged in **< 30s**
- [ ] Barcode not found → manual product form (barcode prefilled) → saved and logged
- [ ] Edit a product's nutrition facts once; every later log uses your numbers
- [ ] Log to breakfast / lunch / dinner / snack with a quantity
- [ ] Today screen: eaten / goal / remaining calories
- [ ] Recent + favorite products → one-tap re-log
- [ ] JSON export backup from Settings
- [ ] Used for real every day from **Oct 23** on, with no data-loss bugs

---

## 3. Day-by-day plan

Each day has one goal and a checkable exit. If a day overruns, take the time from the buffer (Oct 30), **not** from the dogfooding days.

### Week A — get to "usable" (Oct 19–23)

| Day | Goal | Tasks | Exit check | React concept |
|-----|------|-------|------------|---------------|
| **Mon 19** | Scaffold | `git init`; `npx create-expo-app@latest` (TS template); folder structure from `05` §10 (fitness only); run on phone in Expo Go | App opens on your phone; first commit | JSX, components |
| **Tue 20** | Data layer | `expo-sqlite` setup + simple migration runner; tables `products`, `food_log_entries`, `settings`; repository functions (`productRepo`, `foodLogRepo`); tab shell: **Today · Log · Products · Settings** | Insert and read a product from a debug button | `useState`, `useEffect` |
| **Wed 21** | Product library | Products list + search; add/edit product form (name, brand, serving, kcal, P/C/F optional) | Add 5 real products from your kitchen by hand | Forms (`react-hook-form` + `zod`) |
| **Thu 22** | Food log | Log screen grouped by meal for a date; "add to meal" from a product with quantity; delete entry | Log a full day of food manually | Lists, props, lifting state |
| **Fri 23** | Today screen ✅ **M1** | Calorie goal in Settings; Today shows eaten / goal / remaining + meal summaries | **Start using it for real today.** Keep `BUGS.md` | Derived state |

### Week B — make it fast (Oct 24–28)

| Day | Goal | Tasks | Exit check | React concept |
|-----|------|-------|------------|---------------|
| **Sat 24** | Scanner | `expo-camera` barcode scanning; vibrate on scan; local `products` lookup first | Scanning a product you saved opens it | Native modules, permissions |
| **Sun 25** | Open Food Facts ✅ **M2** | Fetch on local miss → preview → edit → save to `products` + log; on miss, open manual form with barcode prefilled; handle offline | Scan 10 real groceries end to end | Async + loading/error states |
| **Mon 26** | One-tap re-log | Recent products (last 7 days) + favorites (star on product); quick-add on Today | Log breakfast in ≤ 3 taps | Custom hooks (`useRecentProducts`) |
| **Tue 27** | Day navigation + backup | Prev/next day on Log; edit entry quantity; JSON export via share sheet (`expo-sharing`) | Export file opens and contains your data | — |
| **Wed 28** | Fix + polish | Work through `BUGS.md`; empty states; number formatting; keyboard handling | No open data-loss bugs | — |

### Week C — ship (Oct 29–31)

| Day | Goal | Tasks | Exit check |
|-----|------|-------|------------|
| **Thu 29** | Standalone build | `eas build --profile preview --platform android` (APK); app icon + name. On iOS, keep Expo Go unless you already have an Apple Developer account | App installed on your phone without Expo Go |
| **Fri 30** | **Buffer** | Catch-up for anything that slipped. If you're ahead, see §5 stretch goals | — |
| **Sat 31** | ✅ **v1 release** | Run the §2 checklist; tag `v1.0`; write a 10-line retro; draft the November plan (§6) | All §2 boxes ticked |

---

## 4. Daily workflow (each session)

```
1. Open this file → today's row
2. Write the exit check as the goal for the session
3. Build the smallest version that passes it
4. Test on your PHONE (not only the emulator)
5. git commit  (one commit per working step is fine; work on main)
6. Tick the box / update the row with notes
7. Evening (from Oct 23): log your real food in the app → anything annoying goes in BUGS.md
```

**Rules for staying on schedule**

- **Timebox:** stuck for 45+ minutes → take the simpler workaround and write the better version down in `BUGS.md` under "later".
- **No new features mid-sprint.** New ideas go to the parking lot in `06`.
- **Ugly is fine.** Default styles until Oct 28.
- **Real data from day 3.** Your own groceries are the test data.

---

## 5. Stretch goals (only if Oct 30 is free)

In order:

1. Copy yesterday's meal to today
2. Show macros (P/C/F) totals on Today — the data is already stored
3. Import JSON backup (restore)

AI parsing waits for the .NET API, so it isn't a stretch goal this month.

---

## 6. Rough November plan (after v1)

| Weeks | Work |
|-------|------|
| Nov 1–14 | ASP.NET Core Minimal API + PostgreSQL; sync products/food log; `POST /ai/parse-meal` (parse → preview → confirm) |
| Nov 15–28 | Workouts module (`06` Phase 3) |
| December | Finance app — separate plan in [finance_app](../../../finance_app/00_index.md) |

---

## 7. Risks this month

| Risk | Mitigation |
|------|------------|
| Expo/Android dev setup eats Day 1 | Use **Expo Go on your physical phone**; skip emulators |
| Open Food Facts has few local (PH) products | Manual form with barcode prefilled is a Day 25 must, not a nice-to-have |
| Camera doesn't work in Expo Go on your device | Move the EAS dev build earlier (Oct 24) |
| SQLite schema changes break your real data | Migration runner on Day 20; export backup before every schema change |
| Life happens / you miss days | Oct 30 buffer; then cut §2 items from the bottom up (export → favorites), **never** the scan flow |
