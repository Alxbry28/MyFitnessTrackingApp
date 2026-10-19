# 06 — Development Roadmap

Phased plan to build the personal fitness app **without trying to ship everything at once**.

Assumes recommended stack: **Expo + SQLite + Supabase (later) + Open Food Facts**.

---

## Phase 0 — Decisions & setup (Week 1)

**Goal:** Frozen stack choices and empty runnable app.

| Task | Output |
|------|--------|
| Confirm Expo vs Flutter | Decision recorded |
| Install Node, Expo CLI, emulators | Dev environment ready |
| Create git repo | Initial commit (scaffold only) |
| `npx create-expo-app` with TypeScript | App launches in Expo Go |
| Define folder structure | Matches architecture doc |
| Choose UI kit (optional) | e.g. NativeWind, React Native Paper |

**Exit criteria:** Blank app runs on device/emulator; planning docs in `draft/`.

---

## Phase 1 — Foundation (Week 2)

**Goal:** Shared infrastructure both modules will use.

| Task | Priority |
|------|----------|
| SQLite setup + migration runner | Must |
| Theme + navigation shell (tabs) | Must |
| Settings screen (placeholder) | Must |
| Base components: Button, Input, ListRow, EmptyState | Must |
| Date/number formatting utils | Must |
| Zod + react-hook-form pattern for one sample form | Must |

**Exit criteria:** Tabs work; can insert/read one dummy table locally.

---

## Phase 2 — Fitness v1: Nutrition (Weeks 3–4)

**Goal:** Daily calorie logging with barcode support.

| Order | Feature |
|-------|---------|
| 2.1 | `products` + `food_log_entries` schema |
| 2.2 | Product library list + manual add/edit |
| 2.3 | Daily food log screen (add from library) |
| 2.4 | Calorie goal setting + remaining calories on dashboard |
| 2.5 | Barcode scanner screen |
| 2.6 | Open Food Facts lookup + save to products |
| 2.7 | Fitness dashboard (calories summary) |

**Exit criteria:** Scan or add product → log meal → see daily total. Works offline.

---

## Phase 3 — Fitness v1: Workouts (Weeks 5–6)

**Goal:** Strength workout logging.

| Order | Feature |
|-------|---------|
| 3.1 | `exercises`, `workout_sessions`, `workout_sets` schema |
| 3.2 | Exercise library (CRUD) |
| 3.3 | Start / active / complete workout flow |
| 3.4 | Show previous set hints when logging |
| 3.5 | Workout history list + detail |
| 3.6 | Link from Fitness dashboard |

**Exit criteria:** Complete one workout with multiple exercises; view in history.

---

## Phases 4–5 — moved

The Finance phases now live in [finance_app/04_development_roadmap.md](../../../finance_app/04_development_roadmap.md). Phase numbers below are kept so existing references still work.

---

## Phase 6 — Cloud sync & backup (Weeks 7–8)

**Goal:** Data survives device loss.

| Order | Feature |
|-------|---------|
| 6.1 | Supabase project + tables mirroring local schema |
| 6.2 | Auth (email magic link or single-user) |
| 6.3 | Sync queue + push/pull |
| 6.4 | Export JSON/CSV from Settings |
| 6.5 | Import (optional) |

**Exit criteria:** Reinstall app → sign in → data restored.

---

## Phase 7 — AI layer (Weeks 9–10)

**Goal:** Faster logging and simple Q&A.

| Order | Feature |
|-------|---------|
| 7.1 | Supabase Edge Function AI proxy |
| 7.2 | Parse text → preview food log |
| 7.3 | Simple Q&A for “calories left” |

**Exit criteria:** One confirmed AI parse flow.

---

## Phase 8 — Polish & personal release (Week 11+)

| Task | Notes |
|------|-------|
| Dark mode | If not done earlier |
| Charts (calories, strength) | v1.1 |
| Workout templates | v1.1 |
| App icon + splash | |
| EAS internal build | Install on your phone without Expo Go |
| Optional: TestFlight / Play internal testing | |

---

## Timeline overview

```
Week  1    2    3    4    5    6    7    8    9   10   11+
      ├────┤
      P0   P1──┤
               ├─────────┤
               P2 Nutrition
                         ├─────────┤
                         P3 Workouts
                                   ├─────────┤
                                   P6 Sync
                                             ├─────────┤
                                             P7 AI
                                                       ├──► P8
```

*Weeks are estimates for solo, part-time work. Adjust freely.*

---

## What to build first? (if you want the fastest daily value)

| If you care most about… | Start with |
|-------------------------|------------|
| Gym progress | Phase 3 right after Phase 1 (skip nutrition temporarily) |
| Eating / groceries | Phase 2 |
| Everything balanced | Follow order above |

**Recommended for your idea file:** Phase 2 (barcode nutrition) — it is the most distinctive feature you described.

---

## v1 release checklist (personal)

- [ ] Fitness: barcode log + food log + calorie goal  
- [ ] Fitness: workout log + history  
- [ ] Data persists locally  
- [ ] Export backup works  
- [ ] No critical crashes in 7 days of daily use  

---

## Explicitly not in v1

- Social features  
- Apple Health / Google Fit sync  
- Subscription monetization  
- Web dashboard  

---

## After v1 — backlog parking lot

| Item | Module |
|------|--------|
| Macro tracking | Fitness |
| Meal photos + AI | Fitness |
| Rest timer | Fitness |
| Widgets (home screen) | Fitness |
| PIN / biometric lock | Shared |

---

## Next action for you

1. Read `02_technology_recommendations.md` and mark your stack choices  
2. When ready to code, say **“start Phase 0”** — scaffold only, no feature code yet  
