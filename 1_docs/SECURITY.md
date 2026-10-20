# Security and Privacy

**Date:** October 20, 2026
**Status:** Draft. Sections 2-4 apply now; sections 5-6 apply when the API ships
**Related:** [Architecture](./ARCHITECTURE.md) · [API](./API.md) · [Database](./DATABASE.md) · [05 §9 security outline](./plan/05_architecture_outline.md) · [11 friends beta](./plan/11_ios_and_friends_beta.md)

---

## 1. What we protect, sized to reality

The app holds **personal health data**: what someone eats, their weight, body measurements and possibly photos. It's used by one owner and 2-5 trusted friends. Controls match that:

| Stage | Where data lives | Main risks |
|-------|------------------|------------|
| v1, Beta 1 | Only on each person's phone | Data loss, leaking data through the public repo, exports, or crash reports |
| Beta 2 | Phone + the app's server | Above, plus account takeover, one user reading another's data, secrets leaking, AI cost abuse |

Out of scope: hostile multi-tenant attackers, compliance certifications, app-level encryption at rest in v1.

## 2. Public repository rules (ADR-17)

The repo is public as a portfolio piece.

| Never commit | Instead |
|--------------|---------|
| Real food logs, weight, measurements, `BUGS.md` with personal numbers | Keep them in `personal/` (ignored) |
| JSON exports or CSV imports | `exports/`, `*.export.json` are ignored |
| Real screenshots | Screenshots use **demo seed data** |
| API keys, connection strings, Sentry DSN, keystores | Env vars, EAS secrets, Render env; commit `.env.example` with names only |
| `.env`, `*.jks`, `*.p12`, `*.key` | Already in `.gitignore` |

Turn on GitHub secret scanning and Dependabot once CI is set up (`tech_lead/02` §8). If a secret is ever committed, **rotate it first**, then clean history.

## 3. On-device data (v1, Beta 1)

| Concern | Control |
|---------|---------|
| Storage | SQLite in the app sandbox. Android app data is private to the app |
| Encryption at rest | Rely on Android full-disk encryption for now. SQLCipher is a later option (`05` §9) |
| Data loss | Additive migrations only, in a transaction; export before schema changes; restore in Beta 1 |
| Updates | Always sign with the same EAS-managed keystore, so updates never force an uninstall that wipes data |
| Exports | Created only when the user asks; the share sheet warns that the file contains health data |
| Photos | Progress photos stay on the device; excluded from export and sync by default (ADR-10) |
| Android backup | Decide in feature 14 whether to allow Android Auto Backup of the database |
| App lock | Optional PIN or biometrics: later, not planned |

## 4. Input handling

| Input | Trust | Control |
|-------|-------|---------|
| Form fields | User's own | `zod` schemas: required fields, numeric ranges (kcal 0-900 per 100 g, macros 0-100, grams > 0) |
| Barcode text | Camera | Digits only, length 8-14, before any lookup |
| Open Food Facts response | **Untrusted** | Parse with `zod`; tolerate missing fields; clamp numbers; review before save |
| Backup file on restore | **Untrusted** | Check `format` and `schemaVersion`; validate every row; preview counts; write in one transaction |
| Xiaomi CSV | **Untrusted** | Validate columns and ranges; dedupe; record `import_runs` for undo |
| AI output (later) | **Untrusted** | Treated as suggestions; always previewed; never written without user confirmation |

SQL: bound parameters only. Never concatenate user input into SQL.

## 5. Crash reports and logs (Beta 1)

- Sentry via `@sentry/react-native` with the Expo config plugin.
- **No food, body or product data in events.** Don't attach state, breadcrumbs with form values, or SQL. Scrub in `beforeSend`.
- Include app version, Android version and stack traces only.
- The privacy page says: "Your data stays on your phone. Crash reports contain no food or body data."

## 6. Server and API (Beta 2)

| Area | Control |
|------|---------|
| Transport | HTTPS only (Render TLS) |
| Auth | ASP.NET Core Identity + JWT bearer; short-lived access tokens, refresh tokens; tokens in `expo-secure-store` |
| Ownership | Every user-owned table has `user_id`. Every query filters by the user id **from the token**, never from the request body |
| Account deletion | `DELETE /v1/account` removes all of the user's server data |
| Secrets | Render env vars only; no secrets in the app bundle. The AI key never leaves the server (ADR-5) |
| Validation | FluentValidation on every request body; size limits on uploads |
| Rate limits | Built-in ASP.NET rate limiter; per-user daily caps on `/ai/*` |
| AI cost | Monthly spend cap with the provider; AI can be disabled per user |
| AI privacy | Free AI tiers may train on prompts. Use a paid tier with no training before friends' data is sent (`tech_lead/01` §8 #8) |
| CORS | Only the web dashboard's domain |
| Logging | Serilog without request bodies or health data |
| Dependencies | Dependabot, CodeQL on the public repo |
| Database | Neon connection string in env; least-privilege app role; additive EF Core migrations |

## 7. User-facing commitments

- Calorie, BMI and TDEE numbers are estimates, not medical advice. The app is for adults (18+).
- Beta 1: "Your data never leaves your phone."
- Beta 2: a short privacy policy covering what's stored on the server, AI processing, and deleting your account.

## 8. Security checklist by release

| Release | Must be true |
|---------|--------------|
| v1 | No secrets or personal data in git; inputs validated; additive migrations; export works |
| Beta 1 | Same keystore for every APK; restore works; Sentry scrubbing verified; disclaimer and privacy page shipped |
| API (feature 16) | Secrets only in env; `/health` only unauthenticated route; CORS locked; OpenAPI has no secrets |
| Beta 2 | Ownership checks tested; delete account works; AI rate limits and spend cap on; paid AI tier |

## 9. Reporting a problem

Open a private GitHub security advisory on the repo, or email the owner. Don't open a public issue for security problems.
