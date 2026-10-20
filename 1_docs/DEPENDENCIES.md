# Dependencies

**Date:** October 20, 2026
**Status:** Register of the exact packages, repos and external APIs this project uses or plans to use. Why each was picked, plus cost and alternatives: [tech_lead/02](./tech_lead/02_tools_and_services.md)
**Related:** [Architecture](./ARCHITECTURE.md) · [API](./API.md) · [05 ADR log](./plan/05_architecture_outline.md#13-architecture-decisions-log)

| Status | Meaning |
|--------|---------|
| **Installed** | Already in `apps/mobile/package.json` |
| **Now** | Add during the October sprint |
| **Later** | Add when its feature is specced |
| **Consider** | Only if a real need appears |

Versions are not pinned here. `npx expo install` picks the version that matches Expo SDK 58, and NuGet versions are set when `apps/api` is created on .NET 10.

---

## 1. npm packages: mobile app (`apps/mobile`)

Add with `npx expo install <name>` (not `npm install`), so versions match the SDK.

### Installed by the Expo template

`expo`, `expo-router`, `react`, `react-native`, `expo-constants`, `expo-font`, `expo-image`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `typescript`, `eslint`, `eslint-config-expo`.

### To add

| Package | Use | Status |
|---------|-----|--------|
| `expo-sqlite` | Local database (ADR-2) | Now |
| `expo-crypto` | `randomUUID()` for primary keys | Now |
| `zod` | Parse Open Food Facts responses; form schemas | Now |
| `react-hook-form` + `@hookform/resolvers` | Forms | Now |
| `date-fns` | Local day keys, date display | Now |
| `expo-camera` | Barcode scanning (`expo-barcode-scanner` is deprecated) | Now (Oct 24) |
| `expo-haptics` | Vibrate on scan | Now (Oct 24) |
| `expo-file-system` + `expo-sharing` | JSON export through the share sheet | Now (Oct 27) |
| `jest-expo` + `jest` + `@types/jest` | Unit tests for calculation services | Now (via `/tests`) |
| `prettier` | Formatting | Now |
| `expo-document-picker` | Pick a backup file to restore | Later (Beta 1) |
| `@sentry/react-native` | Crash reports, with its Expo config plugin | Later (Beta 1, Nov 24) |
| `expo-updates` | EAS Update for JS-only fixes | Later (Beta 1) |
| `react-native-gifted-charts` or `victory-native` | Weight and calorie charts | Later (Nov–Dec) |
| `@bryllim/workout-guide` | Exercise illustrations (ADR-20) | Later (feature 19) |
| `react-native-svg` | Only if the workout art uses SVG instead of PNG | Later (feature 19) |
| `react-native-health-connect` + `expo-health-connect` | Xiaomi scale weight through Health Connect; needs an EAS dev build | Later (feature 22) |
| `@tanstack/react-query` | Server calls once the API exists | Later (Dec) |
| `openapi-typescript` + `openapi-fetch` | Typed client generated from the API's OpenAPI | Later (feature 17) |
| `expo-secure-store` | Store the auth token | Later (Beta 2) |
| `zustand` | Global state, only if context gets messy | Consider |
| `drizzle-orm` | Typed queries and migrations over `expo-sqlite` | Consider (after v1) |
| `nativewind` | Tailwind styling | Consider |
| `@testing-library/react-native` | Component tests | Consider |

## 2. NuGet packages: API (`apps/api`, feature 16 onward)

Add with `dotnet add <project> package <id>`. Project names follow [ARCHITECTURE.md §6](./ARCHITECTURE.md#6-backend-later).

| Package ID | Project | Use | Status |
|------------|---------|-----|--------|
| `MediatR` | Application | CQRS commands, queries, pipeline behaviors (ADR-21). Community license, key in env vars | Later (Nov 30) |
| `FluentValidation` | Application | Request validators | Later (Nov 30) |
| `FluentValidation.DependencyInjectionExtensions` | Application | Register validators from the assembly | Later (Nov 30) |
| `Microsoft.EntityFrameworkCore` | Application | `IAppDbContext` (`DbSet<T>`) | Later (Nov 30) |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | Infrastructure | EF Core provider for Neon PostgreSQL | Later (Nov 30) |
| `Microsoft.EntityFrameworkCore.Design` | Api | `dotnet ef` migrations tooling | Later (Nov 30) |
| `Microsoft.AspNetCore.OpenApi` | Api | OpenAPI document at `/openapi/v1.json` | Later (Nov 30) |
| `Scalar.AspNetCore` | Api | API docs page at `/scalar` | Later (Nov 30) |
| `Serilog.AspNetCore` | Api | Structured logging, no request bodies | Later (Nov 30) |
| `Microsoft.Extensions.Http.Resilience` | Infrastructure | Retries and timeouts for outgoing HTTP | Later (Dec) |
| `Microsoft.Extensions.AI` | Application / Infrastructure | One `IChatClient` interface for any AI provider | Later (feature 18) |
| AI provider adapter (e.g. `Microsoft.Extensions.AI.OpenAI`) | Infrastructure | Picked together with the AI provider | Later (feature 18) |
| `Microsoft.AspNetCore.Identity.EntityFrameworkCore` | Infrastructure | Identity API endpoints and user store | Later (Beta 2, feature 24) |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | Api | Bearer token auth | Later (Beta 2) |
| `Sentry.AspNetCore` | Api | API crash reports | Consider |
| `xunit` + `xunit.runner.visualstudio` + `Microsoft.NET.Test.Sdk` | Tests | Test framework | Later (Nov 30) |
| `Microsoft.AspNetCore.Mvc.Testing` | Tests | In-memory API host for endpoint tests | Later (Nov 30) |
| `Testcontainers.PostgreSql` | Tests | Real Postgres in Docker for tests | Later (Nov 30) |

Built into ASP.NET Core, no package needed: rate limiting (`AddRateLimiter`), health checks (`/health`), Problem Details.

## 3. npm packages: web dashboard (`apps/web`, January)

`react`, `vite`, `typescript`, `react-router`, `@tanstack/react-query`, `tailwindcss`, shadcn/ui (copied in, not a dependency), `recharts`, `react-hook-form`, `zod`, `openapi-typescript`, `openapi-fetch`, `vitest`, `@playwright/test`. Final list is set when feature 23 is specced.

## 4. Git repositories

| Repo | Use | License |
|------|-----|---------|
| [Alxbry28/MyFitnessTrackingApp](https://github.com/Alxbry28/MyFitnessTrackingApp) | This project; public portfolio repo; APKs on GitHub Releases | Owner's choice |
| [bryllim/workout-guide](https://github.com/bryllim/workout-guide) | Source of `@bryllim/workout-guide` (302 exercises, 3 frames each) | Code MIT; art CC BY-SA 4.0 (credit on About screen and README) |
| [everkinetic/data](https://github.com/everkinetic/data) | Origin of the workout art. Credit only, not installed | CC BY-SA |

## 5. External APIs

| API | Used by | Auth | Status | Details |
|-----|---------|------|--------|---------|
| [Open Food Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/) `GET /api/v2/product/{barcode}.json` | Mobile app | None; custom `User-Agent` | Now (Oct 25) | [API.md §2](./API.md#2-open-food-facts-v1) |
| Health Connect (on-device Android API) | Mobile app | Android permission (weight; "read history" for > 30 days) | Later (feature 22) | [10 §5b](./plan/10_body_progress.md) |
| Google Gemini API | .NET API only, never the app (ADR-5) | API key in Render env | Later (Dec); free tier only for the owner's own data | [tech_lead/02 §11](./tech_lead/02_tools_and_services.md#11-ai) |
| Paid AI API (Gemini, OpenAI or Anthropic) | .NET API only | API key in Render env, monthly cost cap | Later (Beta 2) | Free tiers may train on prompts, so friends' data needs a paid API |
| USDA FoodData Central | Not yet | Free API key | Consider | Generic foods without barcodes |
| The app's own .NET API | Mobile app, web dashboard | JWT bearer (Beta 2) | Later (feature 16) | [API.md §3–4](./API.md#3-net-api-conventions-proposed) |

## 6. Hosted services (no code dependency beyond the SDKs above)

| Service | Use | Status |
|---------|-----|--------|
| Expo EAS (Build, Update) | Android APK builds, OTA fixes | Now (Oct 29) |
| GitHub (repo, Releases, Actions, Dependabot) | Code, APK hosting, CI | Now / CI in Nov |
| Sentry | Crash reports (mobile, later API and web) | Later (Beta 1) |
| Neon | PostgreSQL | Later (Dec) |
| Render | API hosting (Docker) | Later (Dec) |
| Vercel or Cloudflare Pages | Web dashboard hosting | Later (Jan) |

## 7. License and attribution notes

- **Open Food Facts:** product data is under the **ODbL** and images under CC BY-SA. Caching products locally is fine, but the app should credit Open Food Facts (for example, on the About/Credits screen next to the workout art credit). This is not yet in the plan.
- **Workout Guide art:** CC BY-SA 4.0. Use it unchanged and credit Bryl Lim and Everkinetic (ADR-20).
- **MediatR:** the Community license is free for individuals but needs a license key. Store it as an environment variable, never in the repo.
