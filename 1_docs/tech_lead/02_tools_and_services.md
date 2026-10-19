# 02 — Tools, Libraries and Services for This App

**Date:** October 20, 2026  
**Status:** Proposed (reference list; locked sprint choices in `08` §1 are unchanged)  
**Related:** [01 backend, hosting, web, portfolio](./01_backend_hosting_web_and_portfolio.md) · [08 October sprint](../plan/08_october_sprint.md) · [02 technology recommendations](../plan/02_technology_recommendations.md) · [sdlc/04 tools by role](../sdlc/04_tools_by_role.md) (general reference by IT role)

---

## 1. How to read this

`sdlc/04` lists what each IT role uses in general. **This doc lists the actual tools for this app**, by layer and by when you need them.

| Tag | Meaning |
|-----|---------|
| ✅ **Now** | Use in the October sprint |
| 🔜 **Later** | When the phase in `06` / `08` §6 starts |
| 💡 **Consider** | Nice to have, add only if a real need appears |
| ❌ **Skip** | Not worth it for this project |

| Cost | Meaning |
|------|---------|
| **Free** | $0, no card |
| **Budget** | One-time or roughly ≤ $10/month |
| **Premium** | Recurring subscription, above budget |

> Prices are approximate as of Oct 2026 and change often. Check before paying.

---

## 2. The stack at a glance

| Layer | Pick | Cost | When |
|-------|------|------|------|
| Mobile app | Expo + React Native + TypeScript + Expo Router | Free | ✅ Now |
| Local DB | `expo-sqlite` | Free | ✅ Now |
| Backend | ASP.NET Core Minimal API (**.NET 10 LTS**) | Free | 🔜 Nov 30 |
| Server DB | PostgreSQL on Neon | Free | 🔜 Dec |
| API hosting | Render (Docker) | Free | 🔜 Dec |
| Web dashboard | React + Vite + TypeScript | Free | 🔜 Jan |
| Web hosting | Vercel or Cloudflare Pages | Free | 🔜 Jan |
| Builds | EAS Build (free plan) | Free | ✅ Oct 29 |
| Crash reports | Sentry (free) | Free | 🔜 Nov 24 |
| CI | GitHub Actions | Free | 🔜 Nov |
| AI | Gemini API free tier → paid with a cap | Free → Budget | 🔜 Dec |

**Total now: $0.**

---

## 3. Development environment

| Tool | Use | Cost | When |
|------|-----|------|------|
| **VS Code** (or Cursor free tier) | Editor for Expo, React, docs | Free | ✅ Now |
| **Visual Studio 2026 Community** | .NET API, debugging | Free | 🔜 Nov 30 |
| JetBrains **Rider** / WebStorm | Alternative IDEs | Free for non-commercial use | 💡 |
| **Node.js LTS** + npm | Expo toolchain | Free | ✅ Now |
| **.NET 10 SDK** | API | Free | 🔜 Nov 30 |
| **Git** + **GitHub** (public repo) | Version control, portfolio | Free | ✅ Now |
| **Expo Go** (Android) | Run the app on your phone | Free | ✅ Now |
| **EAS CLI** | Builds, updates | Free | ✅ Oct 29 |
| Android Studio | Emulator, Logcat (only if a native bug needs it) | Free | 💡 |
| **scrcpy** | Mirror and **record** your phone on the PC (demo video, bug evidence) | Free | ✅ Now |
| **Docker Desktop** | Run Postgres locally, build the API image | Free (personal use) | 🔜 Nov 30 |
| **DB Browser for SQLite** | Open the exported SQLite / inspect data | Free | ✅ Now |
| **DBeaver** or pgAdmin | Inspect Postgres | Free | 🔜 Dec |
| **Bruno** (or Postman free) | Call the API; Bruno saves requests as files in git | Free | 🔜 Nov 30 |

---

## 4. Mobile app libraries (Expo)

| Library | Use | When |
|---------|-----|------|
| `expo-router` | File-based navigation (tabs) | ✅ Now |
| `expo-sqlite` | Local database | ✅ Now |
| `expo-camera` | Barcode scanning | ✅ Oct 24 |
| `expo-haptics` | Vibrate on scan | ✅ Oct 24 |
| `react-hook-form` + `zod` + `@hookform/resolvers` | Forms + validation | ✅ Now |
| `date-fns` | Dates (store UTC, show local) | ✅ Now |
| `expo-crypto` (`randomUUID`) | UUID primary keys (sync-ready) | ✅ Now |
| `expo-file-system` + `expo-sharing` | JSON export via share sheet | ✅ Oct 27 |
| `expo-document-picker` | Pick a backup file to restore | 🔜 Nov (Beta 1) |
| `@sentry/react-native` | Crash reports | 🔜 Nov 24 |
| `expo-updates` (EAS Update) | JS-only fixes without reinstall | 🔜 Nov (Beta 1) |
| `react-native-health-connect` + `expo-health-connect` plugin | Xiaomi scale weight via Health Connect | 🔜 Dec |
| `@tanstack/react-query` | Server calls + caching once the API exists | 🔜 Dec |
| `expo-secure-store` | Store the auth token | 🔜 Dec |
| `react-native-gifted-charts` (or `victory-native`) | Weight / calorie charts | 🔜 Nov–Dec |
| `zustand` | Small global state, **only if** context gets messy | 💡 |
| `drizzle-orm` (expo-sqlite driver) | Typed queries + migrations | 💡 After v1 (not this sprint) |
| NativeWind (Tailwind for RN) | Styling | 💡 After Oct 28 ("ugly is fine" until then) |

---

## 5. Backend (.NET)

| Library / tool | Use | When |
|----------------|-----|------|
| **ASP.NET Core Minimal API** on **.NET 10 LTS** | API | 🔜 Nov 30 |
| **EF Core** + `Npgsql.EntityFrameworkCore.PostgreSQL` | ORM + migrations | 🔜 Nov 30 |
| **FluentValidation** | Request validation | 🔜 Nov 30 |
| `Microsoft.AspNetCore.OpenApi` + **Scalar** | OpenAPI document + API docs page (portfolio) | 🔜 Nov 30 |
| **ASP.NET Core Identity** (API endpoints) + JWT bearer | Accounts for Beta 2 | 🔜 Dec–Jan |
| **Serilog** | Structured logging | 🔜 Nov 30 |
| `Microsoft.Extensions.AI` | One interface for Gemini / OpenAI / others | 🔜 Dec |
| `Microsoft.Extensions.Http.Resilience` | Retries / timeouts for AI and Open Food Facts calls | 🔜 Dec |
| Built-in rate limiting (`AddRateLimiter`) | Per-user AI daily limits | 🔜 Beta 2 |
| Health checks (`/health`) | Render health check | 🔜 Dec |

**Auth alternatives:** Clerk, Auth0 and Supabase Auth have free tiers, but ASP.NET Core Identity is free with no vendor lock-in, and it shows .NET skill. 💡 Only if Identity takes too long.

---

## 6. Web dashboard (January)

| Library | Use |
|---------|-----|
| **React** + **Vite** + TypeScript | App |
| **React Router** | Pages |
| **TanStack Query** | API data + caching |
| **Tailwind CSS** + **shadcn/ui** | Styling and ready-made components (free, copy-in) |
| **Recharts** | Charts |
| `react-hook-form` + `zod` | Same form pattern as mobile |
| **openapi-typescript** (+ `openapi-fetch`) | TS types generated from the .NET OpenAPI spec (replaces sharing zod schemas with Node) |

All free. The web app also uses **openapi-typescript** for the mobile sync client.

---

## 7. Data sources

| Source | Use | Cost | When |
|--------|-----|------|------|
| **Open Food Facts API** | Barcode → product | Free (send a custom `User-Agent`) | ✅ Oct 25 |
| **USDA FoodData Central** | Generic foods without barcodes (rice, egg, chicken) | Free API key | 💡 |
| **Philippine Food Composition Tables (FNRI)** | Local dishes and ingredients | Free to view; check terms before importing | 💡 |
| Your own `products` table | Source of truth after the first scan | Free | ✅ Now |

---

## 8. Testing and code quality

| Tool | Use | Cost | When |
|------|-----|------|------|
| **TypeScript strict mode** | Catch bugs at compile time | Free | ✅ Now |
| **ESLint** + **Prettier** | Lint + format | Free | ✅ Now |
| **Jest** (`jest-expo`) | Unit tests for calculations (`05` §12) | Free | ✅ Now |
| `@testing-library/react-native` | Component tests | Free | 💡 |
| **Maestro** (CLI) | E2E: scan → log → Today on a real phone or emulator | Free locally | 💡 After v1 |
| **xUnit** + **Testcontainers** | API tests against real Postgres in Docker | Free | 🔜 Nov 30 |
| **Vitest** + **Playwright** | Web unit + E2E | Free | 🔜 Jan |
| **Dependabot**, secret scanning, **CodeQL** | Dependency + security checks | Free on public repos | 🔜 Nov |
| SonarQube Cloud | Code-quality badge | Free for public repos | 💡 Portfolio |

---

## 9. CI/CD, builds and distribution

| Tool | Use | Cost | When |
|------|-----|------|------|
| **GitHub Actions** | Typecheck, lint, test (app + API + web) on push | Free (public repo) | 🔜 Nov |
| **EAS Build** (free plan) | Android APK; limited builds per month, queue waits | Free | ✅ Oct 29 |
| **EAS Update** | OTA JS fixes for testers | Free tier | 🔜 Beta 1 |
| **GitHub Releases** | Host the APK + release notes (portfolio) | Free | ✅ Oct 31 |
| Local build (`eas build --local`) | Skip the EAS queue; needs Android SDK (WSL/Linux or macOS only) | Free | 💡 If the queue hurts |
| Render auto-deploy from GitHub | API deploy on push to `main` | Free | 🔜 Dec |
| Vercel / Cloudflare Pages Git integration | Web deploy + preview per PR | Free | 🔜 Jan |

---

## 10. Hosting, data and monitoring

| Service | Use | Free limit (approx.) | When |
|---------|-----|----------------------|------|
| **Render** web service | .NET API (Docker) | Sleeps after ~15 min idle | 🔜 Dec |
| **Neon** | PostgreSQL | ~0.5 GB, scales to zero | 🔜 Dec |
| **Vercel** / **Cloudflare Pages** | Web dashboard | Generous for personal use | 🔜 Jan |
| **Sentry** | Crashes (mobile + API + web) | Small monthly event quota | 🔜 Nov 24 |
| **UptimeRobot** | Check `/health`, alert if down | Free plan | 💡 |
| Cloudflare R2 / Supabase Storage | Files (only if progress photos ever sync; ADR-10 says they don't) | Free tier | ❌ For now |
| Azure App Service F1 / Koyeb | Backup choice for the API | Free | 💡 |

---

## 11. AI

| Option | Use | Cost | When |
|--------|-----|------|------|
| **Google Gemini API** (free tier) | Meal text parse while it's only your data | Free; prompts **may be used for training** | 🔜 Dec |
| Gemini / OpenAI / Anthropic **paid** API | Beta 2 (friends' data) with a monthly cost cap | Pay per use, a few $/month at small scale | 🔜 Beta 2 |
| **Ollama** (local models) | Free dev/testing on your PC, no data leaves it | Free | 💡 |
| Coding assistants (Copilot free, Cursor free, Claude Code) | Help while building | Free tiers / Premium | See §13 |

Rule (ADR-5): the AI key lives only on the .NET API, never in the app.

---

## 12. Design, docs, planning and portfolio media

| Tool | Use | Cost |
|------|-----|------|
| **Mermaid** (in Markdown) | Architecture, flows, Gantt | Free |
| **Excalidraw** / draw.io | Quick sketches | Free |
| **Figma** (free) or **Penpot** | Screens, app icon | Free |
| **Notion** (free) | Work tracker (`sdlc/03`) | Free |
| **Canva** (free) | README banner, app icon, feature graphic | Free |
| **scrcpy** + **OBS Studio** | Record the demo video | Free |
| **ScreenToGif** | README GIFs | Free |
| Icons: **Lucide** / `@expo/vector-icons` | App icons | Free |

---

## 13. Budget-friendly (small or one-time cost)

Pay only when the trigger happens.

| Item | Cost (approx.) | Trigger | Why |
|------|----------------|---------|-----|
| **Custom domain** (e.g. `.dev` / `.app`) | ~$10–15/year | Web dashboard goes live (Jan) | Looks better in a portfolio than `*.onrender.com`; point it at Vercel + Render |
| **Google Play Console** | **$25 one-time** | Friends find sideloading hard, or you want a Play Store listing | Play internal testing; later public release |
| AI API paid usage | ~$1–5/month with a hard cap | Beta 2 (friends' data) | No training on prompts; more reliable limits |
| **Render Starter** | ~$7/month | Cold starts annoy testers in Beta 2 | API always on |
| GitHub Copilot Pro | ~$10/month | Free tier limits get in the way | Coding help in VS Code / Visual Studio |

---

## 14. Premium (subscriptions)

Not needed now. Each one has a clear trigger, so you don't pay early.

| Service | Cost (approx.) | What you get | Worth it when |
|---------|----------------|--------------|---------------|
| **Apple Developer Program** | **$99/year** | TestFlight, App Store, HealthKit | iPhone is unlocked (`11` §6) |
| **Expo EAS** Starter / Production | ~$19 → ~$199/month | Faster builds, more builds and updates | Build queue blocks releases often |
| **Supabase Pro** | ~$25/month | No pausing, backups, more storage | Only if you move the DB to Supabase |
| **Neon** paid plans | Usage-based | More storage/compute, longer history (point-in-time restore) | DB grows past the free size, or real users depend on it |
| **Render** Standard and up | ~$25/month+ | More RAM/CPU | Many active users |
| **Sentry Team** | ~$26/month | More events, longer retention | Free event quota runs out |
| **Cursor Pro** / **Claude Pro** / Max | ~$20/month and up | More AI coding help | You use AI coding daily and hit free limits |
| **Figma Professional** | ~$15/editor/month | Unlimited files, shared libraries | Only with a designer or team |
| **Notion Plus** | ~$10/month | Bigger uploads, more history | Rarely needed solo |
| **RevenueCat** | Free until meaningful revenue, then % of revenue | In-app subscriptions | Only if the app ever becomes paid |

---

## 15. Skip for this project

| Tool | Why skip |
|------|----------|
| Firebase / Firestore | NoSQL fits reports badly; you already have SQL + Postgres |
| Supabase Edge Functions | AI and logic live in the .NET API (ADR-5, `07`) |
| Redux | Too heavy; component state + React Query (+ maybe Zustand) is enough |
| GraphQL | REST + OpenAPI is simpler for one API with two clients |
| Kubernetes / microservices | One API, one DB |
| Expo web as the web version | See `01` §5; separate Vite app instead |
| Fly.io / Railway | No longer free |
| Google Cloud Run / Oracle Always Free | Good, but need a credit card |
| Detox | Maestro is simpler for one solo dev |
| Jira / TestRail / ServiceNow | Notion + Markdown cover a solo project |

---

## 16. Cost scenarios

| Stage | Monthly cost | What you're paying for |
|-------|--------------|------------------------|
| **Now → Beta 1** (Oct–Nov) | **$0** | Nothing |
| API + web live (Dec–Jan) | **$0** (+ ~$1/month if you buy a domain) | Domain only |
| Beta 2, budget | **~$10–15/month** | Render Starter + AI with a cap + domain |
| Public release, premium | **~$50+/month + $99/year + $25 once** | Apple, Play, always-on API, Sentry, bigger DB |

---

## 17. Findings and open questions

| # | Item | Type |
|---|------|------|
| T-1 | `07` says **.NET 8**. .NET 8 support ends **Nov 2026**, so build the API on **.NET 10 LTS** | Fix in `07` (proposed ADR-19) |
| T-2 | `02` §6 lists `expo-barcode-scanner`, which is deprecated; scanning is in `expo-camera` | Fix in `02` |
| T-3 | Install **Jest + ESLint + Prettier** during scaffold (Oct 20), so calculation tests exist from the start | Recommendation |
| T-4 | Start Google Play ($25) only if sideloading blocks Beta 1 friends | Open question for owner |
| T-5 | Buy a domain in January for the web dashboard? | Open question for owner |
