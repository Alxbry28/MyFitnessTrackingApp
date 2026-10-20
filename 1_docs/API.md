# API

**Date:** October 20, 2026
**Status:** Section 2 is in use for v1. Sections 3-6 are *Proposed* contracts for the .NET API (feature 16 onward) and get final shapes in their feature specs
**Related:** [Architecture](./ARCHITECTURE.md) · [Database](./DATABASE.md) · [Security](./SECURITY.md) · [Backend plan](./tech_lead/01_backend_hosting_web_and_portfolio.md)

---

## 1. Overview

| Interface | Used by | When | Auth |
|-----------|---------|------|------|
| Open Food Facts REST | Mobile app | v1 | None (custom `User-Agent`) |
| App's own .NET API | Mobile app, web dashboard | Feature 16 onward | None for `/health`; JWT bearer from Beta 2 |
| Health Connect (on device) | Mobile app | Feature 22 | Android permission |
| Workout Guide package | Mobile app | Feature 19 | None (bundled, offline) |

There is no messaging bus or push channel. The app talks to servers over HTTPS request/response only. Sync is client-initiated polling (section 4).

## 2. Open Food Facts (v1)

```http
GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json?fields=code,product_name,brands,nutriments,serving_size,serving_quantity,product_quantity
User-Agent: MyFitnessTrackingApp/1.0 (Android; github.com/Alxbry28/MyFitnessTrackingApp)
```

| Response | Meaning | App behavior |
|----------|---------|--------------|
| `200`, `status: 1` | Found | Parse, normalize, show preview |
| `200`, `status: 0` or `404` | Not found | Manual form, barcode prefilled |
| Network error or > 8 s | Offline or slow | Manual form plus offline notice |

Fields used (all optional, parsed with `zod`):

| Field | Maps to |
|-------|---------|
| `product_name` | `name` |
| `brands` | `brand` (first item) |
| `nutriments["energy-kcal_100g"]` | `kcal_per_100g` |
| `nutriments.proteins_100g`, `carbohydrates_100g`, `fat_100g` | macros per 100 g |
| `serving_size`, `serving_quantity` | `serving_size`, `serving_grams` |
| `product_quantity` | `net_weight_g` |

Rules: one request per scan, no bulk downloads, cache every saved product locally so the same barcode never calls again. Read-only; the app never writes to Open Food Facts.

## 3. .NET API conventions (*Proposed*)

| Topic | Convention |
|-------|------------|
| Base URL | `https://<service>.onrender.com/v1` |
| Format | JSON, `camelCase` fields, UTC ISO 8601 timestamps, UUID ids |
| Versioning | Path prefix `/v1`; breaking changes go to `/v2` |
| Auth | `Authorization: Bearer <access token>` (Beta 2) |
| Errors | RFC 7807 Problem Details (ASP.NET default) |
| Validation errors | `400` with `errors: { field: [messages] }` |
| Rate limits | `429` with `Retry-After`; per-user limits on `/ai/*` |
| Docs | OpenAPI at `/openapi/v1.json`, Scalar UI at `/scalar` |
| Types | Clients generate TypeScript types with `openapi-typescript` |

Error example:

```json
{
  "type": "https://httpstatuses.io/422",
  "title": "Meal text could not be parsed",
  "status": 422,
  "detail": "No food items were recognized.",
  "traceId": "00-…"
}
```

Status codes: `200`/`201` success, `204` no content, `400` invalid input, `401` no or bad token, `403` not your data, `404` not found, `409` conflict, `422` valid but unprocessable, `429` rate limited, `503` AI provider unavailable.

## 4. Endpoints (*Proposed*)

### Health (feature 16)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/health` | None | `200 { "status": "ok" }`. Used by Render's health check. Not versioned |

### Auth (feature 24, Beta 2)

ASP.NET Core Identity API endpoints, mapped under `/v1/auth`.

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/v1/auth/register` | `{ email, password }` | `200` |
| POST | `/v1/auth/login` | `{ email, password }` | `200 { accessToken, expiresIn, refreshToken }` |
| POST | `/v1/auth/refresh` | `{ refreshToken }` | `200` new tokens |
| DELETE | `/v1/account` | - | `204`; deletes all of the user's server data |

Tokens are stored with `expo-secure-store` on the phone.

### Sync (feature 17)

```http
POST /v1/sync/push
{
  "deviceId": "uuid",
  "changes": [
    { "table": "products", "op": "upsert", "row": { "id": "uuid", "updatedAt": "…", "...": "…" } },
    { "table": "food_log_entries", "op": "delete", "row": { "id": "uuid", "deletedAt": "…" } }
  ]
}
→ 200 { "accepted": ["uuid", …], "rejected": [{ "id": "uuid", "reason": "…" }] }
```

```http
GET /v1/sync/pull?since=2026-12-01T00:00:00Z&limit=500
→ 200 { "changes": [ … ], "nextSince": "…", "hasMore": false }
```

| Rule | Detail |
|------|--------|
| Conflict | Last-write-wins on `updatedAt` (ADR-4) |
| Ownership | Server sets `userId` from the token; a client-sent `userId` is ignored |
| Idempotent | Re-pushing the same change is safe (upsert by `id`) |
| Batches | At most 500 changes per request |

### AI (feature 18 and later)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/v1/ai/parse-meal` | `{ text, locale }` | `200 { items: [{ line, name, grams?, matchedProductId?, estimate?: { kcalPer100g, proteinPer100g, carbsPer100g, fatPer100g }, confidence }] }` |
| POST | `/v1/ai/lookup-product` | `{ brand, name }` | `200 { estimate, sourceUrl? }` |
| POST | `/v1/ai/read-label` | multipart image | `200 { perServing, servingGrams, per100g }` |

AI responses are **suggestions**. The client always shows a preview and saves only what the user confirms. Responses never write to the database directly.

### Web dashboard reads (feature 23)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/days/{day}` | Food log for one day |
| GET | `/v1/stats/daily?from=&to=` | Calorie and macro totals per day |
| GET | `/v1/products?search=` | Product library |
| GET | `/v1/body/weights?from=&to=` | Weight entries |

Scope for the web dashboard (read-only first, or editing) is open (Q-T5).

## 5. Client behavior

- Every request has a timeout (8 s Open Food Facts, 15 s API, 30 s AI).
- Retries only for idempotent calls (`GET`, sync push), with backoff.
- The app never blocks logging on a network call. Failed sync stays queued.
- Render's free tier sleeps. The first request after idle can take 30-60 s, so sync runs in the background with no spinner on the main flow.

## 6. Open items

- Final route names and payloads are set in features 16-18 and 23-24.
- Pull pagination by timestamp vs an opaque cursor.
- Whether the web dashboard gets write endpoints in January.
