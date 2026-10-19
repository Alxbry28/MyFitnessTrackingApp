# 02 — Technology Recommendations

This document answers the open questions from [project_idea.md](../project_idea.md): **React Native vs Flutter**, **free database**, and supporting tools for a **mobile-only** personal app.

---

## 1. Executive recommendation

| Layer | Recommendation | Why |
|-------|----------------|-----|
| **Mobile framework** | **React Native with Expo** | Fast iteration, strong barcode/camera libraries, large community, TypeScript, easy OTA updates for personal builds |
| **Database** | **Supabase (free tier)** + **local SQLite cache** | Free PostgreSQL, auth, REST/Realtime; offline-first via on-device cache |
| **Barcode / nutrition lookup** | **Open Food Facts API** + your own `products` table | Free; you persist scanned items locally when API misses |
| **AI** | **OpenAI API** or **Google Gemini** (free tier) via a thin backend or Supabase Edge Function | Keeps API keys off the device |
| **State management** | **Zustand** or **TanStack Query** | Simple for personal-scale apps |
| **Navigation** | **Expo Router** (file-based) | Matches Expo ecosystem |

**Runner-up stack:** Flutter + Firebase + Firestore — excellent if you prefer Dart and Google’s mobile toolchain.

---

> **If you are a .NET developer learning React for your career**, read **[07_recommendation_for_dotnet_react.md](./07_recommendation_for_dotnet_react.md)** — it recommends **Expo + ASP.NET Core API** instead of Supabase Edge Functions, and nutrition-first v1 to replace MyFitnessPal / ChatGPT calorie workflows.

## 2. React Native vs Flutter

### Comparison

| Criteria | React Native (Expo) | Flutter |
|----------|---------------------|---------|
| Language | JavaScript / TypeScript | Dart |
| Learning curve (if you know web JS) | Lower | Medium (new language) |
| Barcode scanning | `expo-camera` + `expo-barcode-scanner` | `mobile_scanner`, `flutter_barcode_scanner` |
| UI consistency | Good; some platform nuance | Excellent cross-platform pixel control |
| Performance | Very good for this use case | Slightly better for heavy animations |
| Ecosystem for APIs/AI | Huge npm ecosystem | Growing; fewer AI helper libs |
| Free backend pairing | Supabase, Firebase both excellent | Firebase very common |
| Build & deploy | EAS Build (Expo) | Flutter build + store signing |
| Hot reload / dev speed | Excellent with Expo | Excellent |

### When to choose React Native (Expo)

- You know or want **JavaScript/TypeScript**  
- You want the fastest path to **barcode + camera + push** with managed tooling  
- You may add a small **web admin** later (same React skills)  

### When to choose Flutter

- You want **maximum UI control** and enjoy Dart  
- You are starting fresh with no JS preference  
- You plan heavy custom charts/animations  

### Recommendation

**React Native (Expo)** — best fit for a solo personal project with barcode scanning, CRUD-heavy screens, and AI API calls. Prototype in week 1: one screen that scans a barcode and saves to local storage.

---

## 3. Free database options

### Option A — Supabase (recommended)

| | |
|---|---|
| **What** | Hosted PostgreSQL + Auth + Storage + Edge Functions |
| **Free tier** | Generous for personal use (500MB DB, 50K monthly active users — far more than you need) |
| **Pros** | Real SQL, relational data (products, meals, workouts), Row Level Security, easy REST |
| **Cons** | Requires internet for sync; need local cache for offline |

**Fit:** Fitness (products, meals, workouts) maps cleanly to SQL tables.

### Option B — Firebase (Firestore)

| | |
|---|---|
| **What** | NoSQL document database + Auth + Cloud Functions |
| **Free tier** | Spark plan — limited but OK for personal use |
| **Pros** | Excellent mobile SDKs, realtime, offline persistence built-in |
| **Cons** | NoSQL modeling for reports (aggregations) can get awkward; query limits |

**Fit:** Great if you choose Flutter; still viable with React Native.

### Option C — SQLite only (local-first)

| | |
|---|---|
| **What** | `expo-sqlite` or `drift` (Flutter) on device |
| **Cost** | Free |
| **Pros** | Full offline, no server, maximum privacy |
| **Cons** | No automatic multi-device sync; you must build export/import |

**Fit:** Good for v0 prototype; add Supabase sync in v1.1.

### Option D — PocketBase (self-hosted)

| | |
|---|---|
| **What** | Single binary backend with SQLite |
| **Cost** | Free (you host) |
| **Pros** | Full control, simple admin UI |
| **Cons** | You maintain a server; overkill for solo mobile-only unless you want learning |

### Recommended data strategy

```
┌─────────────────────────────────────┐
│           Mobile App                │
│  ┌─────────────┐   ┌─────────────┐  │
│  │ SQLite cache │◄─►│  UI / State │  │
│  └──────┬──────┘   └─────────────┘  │
└─────────┼───────────────────────────┘
          │ sync when online
          ▼
┌─────────────────────────────────────┐
│     Supabase (PostgreSQL)           │
│  products, meals, workouts,         │
│  ai_logs                            │
└─────────────────────────────────────┘
```

Start with **SQLite on device** for offline logging; add **Supabase** when you want backup and second-device sync.

---

## 4. Barcode and nutrition data

| Source | Role | Cost |
|--------|------|------|
| **Open Food Facts** | Lookup barcode → name, calories, macros | Free API |
| **Your `products` table** | Store scanned + manual products you buy repeatedly | Your DB |
| **Manual entry form** | When barcode unknown or wrong | Required fallback |

Flow:

1. Scan barcode  
2. Check local DB cache  
3. If miss → Open Food Facts API  
4. If still miss → manual form → save to your DB  
5. User can edit nutritional facts before saving (grocery labels differ)

---

## 5. AI integration — technical approach

### Pattern: “parse → preview → confirm → save”

```
User input (text/voice/photo)
        │
        ▼
   Edge Function / API route
   (holds API key)
        │
        ▼
   Structured JSON response
   { items: [...], confidence }
        │
        ▼
   App shows preview UI
        │
        ▼
   User taps Confirm → SQLite + Supabase
```

### Provider options

| Provider | Free tier | Good for |
|----------|-----------|----------|
| **Google Gemini** | Generous free API quota | Parsing, summaries |
| **OpenAI** | Limited free / pay-as-you-go | Reliable structured output |
| **On-device (future)** | Free | Privacy; weaker for complex parsing |

### Where AI runs

- **Do not** embed API keys in the mobile app  
- Use **Supabase Edge Function** or a tiny **Cloudflare Worker** as proxy  
- Log prompts/responses optionally in `ai_interactions` table for debugging  

---

## 6. Supporting libraries (Expo stack)

| Need | Library |
|------|---------|
| Navigation | `expo-router` |
| Local DB | `expo-sqlite` + Drizzle ORM (optional) |
| Barcode | `expo-camera` |
| Charts | `victory-native` or `react-native-gifted-charts` |
| Forms | `react-hook-form` + `zod` |
| Date/time | `date-fns` |
| Secure storage | `expo-secure-store` (tokens) |
| Backend client | `@supabase/supabase-js` |

---

## 7. Supporting libraries (Flutter stack — if chosen)

| Need | Package |
|------|---------|
| Local DB | `drift` or `sqflite` |
| Barcode | `mobile_scanner` |
| State | `riverpod` |
| Backend | `supabase_flutter` or `firebase_core` |
| Charts | `fl_chart` |

---

## 8. Development environment

| Tool | Purpose |
|------|---------|
| **Node.js LTS** | Expo / React Native |
| **Android Studio** | Android emulator |
| **Xcode** (Mac only) | iOS simulator / device builds |
| **EAS CLI** | Cloud builds for iOS without daily Mac use |
| **Supabase CLI** | Local migrations, edge functions |
| **Git** | Version control |

---

## 9. Cost estimate (personal use)

| Service | Expected monthly cost |
|---------|----------------------|
| Supabase | $0 (free tier) |
| Open Food Facts | $0 |
| AI API | $0–5 depending on usage |
| Apple Developer | $99/year — **needed for TestFlight** (friends on iPhone) and the App Store |
| Google Play | $25 one-time — only for Play testing tracks or publishing; an APK link is free |
| EAS Build | $0 on free tier for limited builds |

For **Android-only personal use** (APK sideload), you can stay at **$0**. **Any iPhone install outside Expo Go, including TestFlight, needs the $99/year Apple Developer Program**, so the iPhone version is parked for now (see `11` §6).

---

## 10. Decision checklist

Before scaffolding the project, tick your choices:

- [ ] **Framework:** Expo (RN) / Flutter  
- [ ] **Primary DB:** Supabase / Firebase / SQLite-only  
- [ ] **Offline:** SQLite cache yes/no  
- [ ] **AI provider:** Gemini / OpenAI / none for v1  
- [ ] **Auth:** Supabase email / device passcode only / none  
- [ ] **Distribution:** Expo Go dev → EAS internal build → store (later)  

Record final choices at the top of `05_architecture_outline.md` when decided.
