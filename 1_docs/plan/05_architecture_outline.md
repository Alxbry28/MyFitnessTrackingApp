# 05 — Architecture Outline

High-level structure for the **Fitness** mobile app. (Finance is planned separately in [finance_app](../../../finance_app/00_index.md).) No code yet — structure only.

Related: [02_technology_recommendations.md](./02_technology_recommendations.md)

---

## 1. Record your final stack choices here

| Decision | Your choice | Date decided |
|----------|-------------|--------------|
| Framework | _TBD: Expo (RN) recommended_ | |
| Local DB | _TBD: SQLite_ | |
| Cloud DB | _TBD: Supabase_ | |
| AI provider | _TBD_ | |
| Auth | _TBD_ | |

---

## 2. System context diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Mobile App (Expo)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │  Fitness   │                  │  Shared (Settings) │  │
│  │  Module    │                  │  Profile, Backup   │  │
│  └─────┬──────┘                  └─────────┬──────────┘  │
│        │                                    │              │
│        └───────────────┬────────────────────┘              │
│                        ▼                                   │
│              ┌─────────────────┐                           │
│              │  Data Layer      │                           │
│              │  SQLite (local)  │                           │
│              │  + Sync Service  │                           │
│              └────────┬────────┘                           │
└───────────────────────┼──────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
   ┌────────────┐ ┌───────────┐ ┌──────────────┐
   │  Supabase  │ │ Open Food │ │ AI Proxy     │
   │  Postgres  │ │ Facts API │ │ Edge Function│
   └────────────┘ └───────────┘ └──────────────┘
```

---

## 3. App navigation structure

```
Root (Tab or Drawer)
│
├── Home (optional unified dashboard)
│
├── Fitness Tab
│   ├── fitness/index          → Fitness dashboard
│   ├── fitness/log            → Food log
│   ├── fitness/scan           → Barcode scanner
│   ├── fitness/products       → Product library
│   ├── fitness/workout        → Active / start workout
│   └── fitness/history        → Workout history
│
└── Settings
    ├── goals (calorie target)
    ├── units
    ├── backup & export
    └── about
```

**Alternative:** Bottom tabs = `Nutrition | Workouts | Settings` with stacks inside each.

---

## 4. Layered architecture (frontend)

```
┌─────────────────────────────────────┐
│           UI Screens                │  React components, forms, lists
├─────────────────────────────────────┤
│           Hooks / ViewModels        │  useFoodLog, useWorkouts, etc.  
├─────────────────────────────────────┤
│           Domain Services           │  nutritionCalc, volumeCalc     
├─────────────────────────────────────┤
│           Repositories              │  ProductRepo, WorkoutRepo    
├─────────────────────────────────────┤
│     Local DB (SQLite)  │  Remote   │  Supabase client, sync queue
└─────────────────────────────────────┘
```

**Principle:** Screens never call Supabase directly — go through repositories so offline/sync stays consistent.

---

## 5. Module boundaries

| Module | Owns | Does not own |
|--------|------|--------------|
| **Fitness** | products, food_log, exercises, workouts | — |
| **Shared** | auth, settings, sync engine, AI client, theme | domain-specific business rules |

**Shared AI client:** one service with a `fitness` system-prompt context.

---

## 6. Data model relationships (ER sketch)

```
products ──────< food_log_entries

exercises ─────< workout_sets >────── workout_sessions
```

---

## 7. Sync strategy (when Supabase is added)

### Phase 1 — Local only

- All reads/writes to SQLite  
- Export JSON manually from Settings  

### Phase 2 — Background sync

| Step | Behavior |
|------|----------|
| Write | Save to SQLite immediately; mark row `sync_status = pending` |
| Online | Push pending rows to Supabase |
| Pull | Fetch `updated_at > last_sync` per table |
| Conflict | **Last-write-wins** (acceptable for single-user) |

### Sync queue table (local)

| Field | Purpose |
|-------|---------|
| table_name | which entity |
| record_id | uuid |
| operation | insert / update / delete |
| payload | JSON |
| created_at | ordering |

---

## 8. API integrations

| Integration | Direction | Auth |
|-------------|-----------|------|
| Open Food Facts | App → REST | None (public) |
| Supabase | App ↔ Postgres | Anon key + RLS (single user) |
| AI proxy | App → Edge Function → LLM | Function secret |

### Open Food Facts usage

- Endpoint: product lookup by barcode  
- Cache every successful response in `products`  
- Rate limit: batch rarely; personal use is fine  

---

## 9. Security outline (single-user)

| Concern | Approach |
|---------|----------|
| API keys | Only in Edge Functions / env |
| Supabase RLS | Policies scoped to `auth.uid()` |
| Local data | SQLite file on device; optional SQLCipher later |
| Backup export | User-triggered; warn if file contains sensitive data |
| App lock | Optional PIN / biometrics (Later) |

---

## 10. Folder structure (future repo sketch)

```
personal_project/
├── app/                    # Expo Router screens
│   ├── (tabs)/
│   │   └── fitness/
│   └── settings/
├── src/
│   ├── components/         # shared UI
│   ├── modules/
│   │   └── fitness/
│   │       ├── repositories/
│   │       ├── services/
│   │       └── types/
│   ├── db/                 # SQLite schema, migrations
│   ├── sync/
│   ├── ai/
│   └── lib/                # utils, constants
├── supabase/
│   ├── migrations/
│   └── functions/          # AI proxy
├── assets/
└── draft/                  # planning docs (this folder)
```

---

## 11. Cross-cutting concerns

| Concern | Where handled |
|---------|---------------|
| Theming (light/dark) | `src/lib/theme` + context |
| Date handling | `date-fns`, store UTC, display local |
| Validation | `zod` schemas per form |
| Error toasts | shared `Toast` component |
| Loading states | skeleton lists on dashboard |
| Empty states | “No workouts yet — start one” CTA |

---

## 12. Testing strategy (when building)

| Level | Focus |
|-------|-------|
| Unit | calorie totals, sync merge |
| Integration | repository + SQLite |
| E2E (optional) | Detox / Maestro for critical flows |

For personal app, prioritize **unit tests on calculations** over full E2E.

---

## 13. Architecture decisions log

| # | Decision | Rationale | Status |
|---|----------|-----------|--------|
| ADR-1 | Fitness-only app; finance split into its own plan | Keep scope focused | Accepted |
| ADR-2 | SQLite first, Supabase second | Offline logging day 1 | Proposed |
| ADR-3 | Repository pattern | Clean sync boundary | Proposed |
| ADR-4 | Last-write-wins sync | OK for single user | Proposed |
| ADR-5 | AI via server proxy | Protect API keys | Proposed |
