# Session Notes — October 19, 2026

**Topic:** Build workflow for the fitness app, aiming to ship by the end of October  
**Outcome:** New sprint plan at [plan/08_october_sprint.md](./plan/08_october_sprint.md), linked from [plan/00_index.md](./plan/00_index.md)

---

## 1. What you asked

> "Can you make me a workflow for this project. I want to build this by this month."

## 2. Where the project stood

- Only planning docs (`plan/00`–`07`) exist. There's no code and no git repo yet.
- The full roadmap (`06`) takes about **15 weeks**: nutrition, workouts, finance, sync and AI.
- `07` already recommends **nutrition-only v1 first**, using Expo (React Native) for the app and .NET for the API later.
- **Time left:** 13 days (Mon Oct 19 → Sat Oct 31).

## 3. Main conclusion

The whole roadmap can't fit in 13 days. The sprint ships **one complete feature**, the nutrition tracker:

> Scan a grocery barcode → save the product → log it → see calories remaining, on your phone and used every day.

## 4. Decisions for October

| Area | Decision |
|------|----------|
| App | One Expo app (TypeScript + Expo Router), Nutrition module only |
| Data | `expo-sqlite`, stored only on the phone |
| Backend | None this month (.NET API moves to November) |
| Barcode data | Open Food Facts, with results saved to your own `products` table |
| AI | None this month |
| Forms | `react-hook-form` + `zod` |
| Device | Phone via Expo Go, then an EAS preview build (Android APK) |

**Deferred:** workouts, finance, .NET API, Supabase/sync, AI, charts, macro targets.

## 5. Definition of done (Oct 31)

- [ ] Scan → product found → logged in under 30 seconds
- [ ] Unknown barcode → manual form (barcode prefilled) → saved and logged
- [ ] Edit nutrition facts once; your numbers are used from then on
- [ ] Log to breakfast / lunch / dinner / snack with a quantity
- [ ] Today screen: eaten / goal / remaining
- [ ] Recent + favorite products for one-tap re-log
- [ ] JSON export backup
- [ ] Used daily from Oct 23 with no data-loss bugs

## 6. Schedule

| Dates | Focus | Milestone |
|-------|-------|-----------|
| Oct 19–23 | Scaffold → SQLite → product library → food log → Today screen | **M1 (Oct 23):** start using it for real |
| Oct 24–28 | Barcode scanner → Open Food Facts → one-tap re-log → day navigation + backup → bug fixes | **M2 (Oct 25):** full scan flow |
| Oct 29–31 | Standalone build → buffer day → release | **v1.0 (Oct 31)** |

Each day in `08` has a goal, an exit check and the React concept you'll practise.

## 7. Daily routine

1. Open `08` → today's row
2. Build the smallest version that passes the exit check
3. Test on your phone
4. `git commit`
5. From Oct 23: log real food each evening; put problems in `BUGS.md`

**Rules:** stuck for more than 45 minutes → take the simpler workaround. No new features mid-sprint. Ugly is fine until Oct 28. If you fall behind, cut features from the bottom of the list, but always keep the scan flow.

## 8. After October

| When | Work |
|------|------|
| Nov 1–14 | ASP.NET Core API + PostgreSQL, sync, AI meal parse (parse → preview → confirm) |
| Nov 15–28 | Workouts module |
| December | Finance module |

## 9. Assumptions / open items

- Assumed a few hours of work most days. If you have less time, cut scope further.
- iOS standalone builds need an Apple Developer account ($99/yr); until then, use Expo Go on iOS.

## 10. Next step

Day 1 (Oct 19): `git init`, create the Expo app with the TypeScript template, set up the folder structure and run it on your phone. Say **"start Day 1"** to begin.
