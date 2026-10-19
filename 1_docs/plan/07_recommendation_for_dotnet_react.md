# 07 — Recommendation for a .NET Developer Learning React

**Context:** You are a .NET developer, may learn React.js for your career, and want a personal app because **MyFitnessPal** and **ChatGPT** do not work well for your calorie-tracking workflow.

This document updates the generic recommendations in `02_technology_recommendations.md` with a stack and product direction tailored to you.

---

## 1. Short answer

| Question | Recommendation |
|----------|----------------|
| Mobile framework | **React Native (Expo) + TypeScript** — not Flutter, not .NET MAUI for this project |
| Backend | **ASP.NET Core Minimal API** (your strength) + **PostgreSQL** or **SQLite** |
| Database (free) | **PostgreSQL** via Supabase free tier, or **SQLite** locally with optional sync later |
| AI | Your **.NET API** calls OpenAI/Gemini — structured JSON, keys stay server-side |
| What to build first | **Nutrition / calorie module only** — solve your own daily pain first |
| App shape | Fitness app; ship **nutrition v1** before everything else (Finance is planned separately in [finance_app](../../../finance_app/00_index.md)) |

**Why this stack:** You learn **React** (career), keep **C#** for API and data logic (comfort), and build something you will actually use every day.

---

## 2. Why not Flutter or .NET MAUI?

### Flutter

- Uses **Dart**, not React — does not help your stated career goal.
- Excellent framework, wrong fit for *this* learning path.

### .NET MAUI

- Stays in C# — comfortable, but **does not teach React**.
- Smaller community for barcode + mobile UX patterns than Expo.
- Fine if career React learning is not a priority; **not recommended** given your goals.

### React Native (Expo) — the sweet spot

| Skill | How it transfers |
|-------|------------------|
| React.js (web) | Same components, hooks, state, JSX — Expo is “React for mobile” |
| TypeScript | Used heavily in both RN and modern .NET APIs |
| REST / JSON | You already know this from .NET |
| C# backend | Unchanged — mobile app is just another client |

**Career path:** React (web) at work → same mental model in Expo → optional React web admin for your app later.

---

## 3. Recommended architecture for you

```
┌─────────────────────────────────────────┐
│     Expo app (React Native + TS)        │
│  Screens, forms, barcode, local cache   │
└──────────────────┬──────────────────────┘
                   │ HTTPS / JSON
                   ▼
┌─────────────────────────────────────────┐
│   ASP.NET Core Minimal API (.NET 8+)    │  ← you build this confidently
│  • Products, food log, workouts         │
│  • AI parse endpoint (proxy to LLM)     │
│  • Auth (optional, single-user)         │
└──────────────────┬──────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
  ┌─────────────┐    ┌──────────────┐
  │ PostgreSQL  │    │ Open Food    │
  │ (Supabase   │    │ Facts API    │
  │  or local)  │    └──────────────┘
  └─────────────┘
```

### Why a .NET API instead of only Supabase?

| Benefit | Explanation |
|---------|-------------|
| Plays to your strengths | EF Core, validation, auth, logging — familiar |
| Clean AI layer | C# service that returns **typed JSON** for meal parse — easier than prompt-only ChatGPT |
| Career portfolio | “Full-stack: React Native + .NET API” is a strong story |
| React learning stays focused | You learn React in the **UI layer** only, not backend patterns |

### When to use Supabase

Use Supabase as **hosted PostgreSQL** if you do not want to manage a server. Your .NET API still talks to the same database. You do **not** have to use Supabase Edge Functions for AI — your .NET API is better for you.

### Simpler v0 (first 2 weeks)

Skip the API initially:

- Expo + **expo-sqlite** on device only  
- Prove barcode → product → log flow  
- Add .NET API in Phase 2 when you need sync or AI  

---

## 4. What went wrong with MyFitnessPal and ChatGPT (design against it)

Your app should be opinionated about fixing **your** workflow, not copying MFP.

### MyFitnessPal pain → your app’s answer

| MFP struggle | Your app design |
|--------------|-----------------|
| Huge generic food database — wrong items, wrong servings | **Your product library** — barcodes from *your* groceries, edited once |
| Too many taps / ads / clutter | **Minimal UI** — home shows today’s calories; 3 taps to log |
| Hard to reuse what you eat repeatedly | **Favorites + recent products** on home screen |
| Serving sizes confusing | You define serving when saving product; same default every time |
| Does too much (social, recipes, premium) | **Single-user, no social, no premium** — only what you need |

### ChatGPT pain → your app’s answer

| ChatGPT struggle | Your app design |
|------------------|-----------------|
| No memory of your foods | Persistent **products** + **food_log** in your DB |
| Estimates vary every time | Saved products use **your** nutrition facts; AI only for unknown text |
| No barcode | **Scanner first**; AI is secondary input |
| Unstructured chat | **Parse → preview card → Confirm** — never auto-save |
| Re-explaining context daily | App sends today’s log + your favorites as context to API |
| No “calories left today” | Dashboard widget computed from your data |

### Core product principle

> **Database-first logging, AI-second.**

Barcode and saved products are the source of truth. AI is a **input assistant**, not the ledger.

---

## 5. Revised v1 scope (nutrition only — for you)

Build this before workouts if calorie tracking is the main pain.

### Must-have (your personal v1)

- [ ] Scan barcode → lookup (Open Food Facts) → save to **my products**
- [ ] Edit nutrition on product (fix wrong MFP-style data)
- [ ] Log food to a meal with quantity (default serving = 1 tap)
- [ ] Today view: eaten / goal / remaining calories
- [ ] **Recent + favorites** for one-tap re-log
- [ ] Manual add when barcode fails

### Should-have (v1.1)

- [ ] AI text parse: “2 eggs, rice” → preview → confirm → log
- [ ] Ask: “how many calories left today?” (API reads your DB, not hallucination)
- [ ] Copy yesterday’s breakfast

### Later

- Workouts module (already outlined in `03`)
- Charts, macros, photos

---

## 6. Learning path (React without overwhelm)

As a .NET dev, learn in this order:

| Step | Learn | Build |
|------|-------|-------|
| 1 | JSX, components, props | Static “Today calories” screen |
| 2 | `useState`, lists | Food log list |
| 3 | Forms (`react-hook-form` + `zod`) | Add product form |
| 4 | Navigation (`expo-router`) | Tab: Today / Log / Scan |
| 5 | `useEffect`, async | Fetch from your .NET API |
| 6 | Camera / barcode (`expo-camera`) | Scanner screen |

**Do not** start with Redux, GraphQL, or microservices. One Expo app, one API project, one database.

### Parallel .NET work (comfort zone)

| API endpoint | Purpose |
|--------------|---------|
| `GET /products` | List saved products |
| `POST /products` | Create from barcode or manual |
| `GET /food-log?date=` | Today’s entries |
| `POST /food-log` | Add entry |
| `POST /ai/parse-meal` | Text → structured items (returns DTO, user confirms in app) |

Use **EF Core** + **FluentValidation** — patterns you already know.

---

## 7. Updated stack decision table

| Layer | Choice for you | Avoid |
|-------|----------------|-------|
| Mobile | Expo + TypeScript | Flutter, MAUI |
| Web career skill | React (via RN) | Dart |
| API | ASP.NET Core 8 Minimal API | Learning Node just for this project |
| ORM | EF Core | — |
| DB | PostgreSQL (Supabase free) or SQLite → Postgres | Firestore (NoSQL awkward for reports) |
| AI | Gemini or OpenAI from C# `HttpClient` | Pasting into ChatGPT app |
| Auth v1 | API key or simple JWT for single user | Complex identity until you need multi-device |

---

## 8. What to change in other draft docs

| Document | Adjustment |
|----------|------------|
| `02_technology_recommendations.md` | Prefer .NET API over Edge Functions for AI |
| `03_fitness_app_outline.md` | Prioritize nutrition; add “anti-MFP” UX notes |
| `06_development_roadmap.md` | Option: **Nutrition-only v1** before workouts |
| `05_architecture_outline.md` | Record stack: Expo + .NET API + PostgreSQL |

---

## 9. Final recommendation summary

1. **Use Expo (React Native)** — best alignment with learning React for your career.  
2. **Use .NET for the API** — you move faster; AI and data logic live where you are strong.  
3. **Start with calorie tracking only** — build the app *you* wish MyFitnessPal was.  
4. **Replace ChatGPT with structured AI** — same convenience, your database, confirm before save.  
5. **Keep workouts in the plan** — but do not block nutrition v1 on them.

When you are ready to code, the first milestone is: **scan a grocery barcode → save product → log it → see calories remaining**. Everything else waits.
