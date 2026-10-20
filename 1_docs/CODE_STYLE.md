# Code Style

**Date:** October 20, 2026
**Status:** Draft. Applies from the first line of app code. AI agents read the matching rules in [`blueprint/context/coding-standards.md`](../blueprint/context/coding-standards.md); keep both in sync
**Related:** [Architecture](./ARCHITECTURE.md) · [Design system](./DESIGN_SYSTEM.md) · [Security](./SECURITY.md) · [AGENTS.md](../AGENTS.md)

---

## 1. Tooling

| Tool | Setting |
|------|---------|
| TypeScript | `strict: true`. No `any`; use `unknown` and narrow |
| ESLint | Expo config (`npx expo lint`); no unused vars or imports |
| Prettier | Defaults, 2-space indent, double quotes, trailing commas, 100-char lines (*Proposed*) |
| Typecheck | `npx tsc --noEmit` before every commit |
| Tests | Jest with `jest-expo` once `/tests` sets it up |

Exact commands live in the Commands section of [AGENTS.md](../AGENTS.md).

## 2. Project layout

Follow [ARCHITECTURE.md §4](./ARCHITECTURE.md#4-folder-structure).

- `app/` holds routes only. A route file composes components and hooks and owns navigation.
- Feature code lives in `src/modules/<module>/{components,hooks,repositories,services,types}`.
- Shared UI goes in `src/components/`, shared helpers in `src/lib/`.
- Tests sit next to the file they test: `nutritionCalc.ts` and `nutritionCalc.test.ts`.

## 3. Naming

| Thing | Style | Example |
|-------|-------|---------|
| Components and their files | PascalCase | `CalorieSummary.tsx` |
| Hooks | camelCase with `use` | `useDayTotals.ts` |
| Repositories | camelCase object, `Repo` suffix | `productRepo.findByBarcode()` |
| Services | camelCase module of pure functions | `nutritionCalc.forGrams()` |
| Types and interfaces | PascalCase, no `I` prefix | `Product`, `FoodLogEntry` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_KCAL_PER_100G` |
| Zod schemas | camelCase with `Schema` | `productSchema` |
| SQLite tables and columns | snake_case | `food_log_entries.kcal_per_100g` |
| Units in names | Always suffix | `grams`, `weightKg`, `heightCm`, `kcalPer100g` |

Map snake_case rows to camelCase types inside repositories only.

## 4. React and React Native

- Function components and hooks only.
- One job per component. Extract a hook when logic is reused or a component passes ~150 lines.
- Props are typed with an interface named `<Component>Props`.
- Use React Native primitives (`View`, `Text`, `Pressable`, `FlatList`). Use `FlatList` for any list that can grow.
- Derived values (totals, remaining) are computed, not stored in state.
- Styling: `StyleSheet.create` with theme tokens. No raw colors, font sizes or spacing numbers (see the Design System).
- Accessibility: `accessibilityLabel` on icon-only buttons; touch targets at least 48 dp.
- Android is the only target. Keep platform-specific code behind an interface (ADR-12).

## 5. Data access

- Screens and hooks never write SQL. Repositories own every query.
- Bound parameters only.
- Repositories set `id` (`randomUUID()`), `created_at`, `updated_at`, and use `deleted_at` for deletes.
- Multi-table writes (eat from pantry, restore) run in one transaction.
- Schema changes are new migration files, additive only. See [DATABASE.md §5](./DATABASE.md#5-migrations).
- Log entries copy nutrition values. Never recompute history from the current product.

## 6. Validation and errors

- Forms use `react-hook-form` with a `zod` resolver; errors show under the field.
- External data (Open Food Facts, backup files, CSV, AI) is parsed with `zod` before use.
- Wrap database and network calls. Show a short message (snackbar) and keep the app usable.
- Never swallow a failed write silently. Data loss is the main risk.
- Network failures fall back to manual entry; they never block logging.

## 7. Numbers, dates and units

- Store grams, kg and cm. Convert units only for display.
- Round only for display (kcal to whole numbers). Keep full precision in storage and math.
- Store timestamps as UTC ISO strings. Group logs by the local day key. Use `date-fns` helpers in `src/lib/dates.ts`.

## 8. Testing

- Unit-test pure logic where a wrong answer is possible: per-100 g scaling, day totals, remaining calories, normalization of Open Food Facts values, stock sums, BMI, trends.
- Don't unit-test layout. Verify UI on the phone with a screenshot.
- Once a test command exists, a step that adds logic ships its test in the same change, and tests must pass before commit.
- An empty test suite fails.

## 9. Comments and writing

- Comment the *why*, not the *what*. No banner comments or narration.
- A one-line doc comment on exported functions is enough.
- No commented-out code.
- No em dashes in code comments, docs or commit messages. Use a hyphen, comma, colon or parentheses.

## 10. Git

- Blueprint workflow: one branch per feature (`feature/<kebab-title>`) or fix (`fix/<kebab-title>`), reviewed, then squash-merged by `/complete`.
- Commit messages: imperative, short subject (`feat: add product search`). Conventional prefixes (`feat`, `fix`, `chore`, `docs`, `test`, `refactor`).
- Never commit secrets or personal data (see [SECURITY.md §2](./SECURITY.md#2-public-repository-rules-adr-17)).

## 11. .NET API (later)

- Clean Architecture + CQRS with MediatR (ADR-21; layers in [ARCHITECTURE.md §6](./ARCHITECTURE.md#6-backend-later)). Dependencies point inward only: Api → Application → Domain; Infrastructure → Application.
- One folder per use case: `Application/Features/Sync/PushChanges/` holds `PushChangesCommand`, `PushChangesHandler`, `PushChangesValidator`. Names end in `Command` or `Query`.
- Minimal API endpoints grouped per feature (`MapGroup("/v1/sync")`). An endpoint only sends the request through `ISender` and maps the result. No logic in endpoints.
- Queries never change state. Use `AsNoTracking()` and project to DTOs; never return EF entities.
- FluentValidation validators run in a MediatR `ValidationBehavior`; Problem Details for errors.
- MediatR Community license key comes from configuration (`MediatR__LicenseKey`), never committed.
- EF Core with additive migrations; async all the way; `CancellationToken` passed through.
- Nullable reference types on; warnings as errors.
- xUnit + Testcontainers for tests against real PostgreSQL.
