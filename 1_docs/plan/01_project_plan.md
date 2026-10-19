# 01 — Project Plan

## 1. Vision

Build personal mobile apps that support two daily-life areas:

- **Health & fitness** — know what you eat, track workouts, and improve over time  
- **Money** — see where money goes, track savings goals, and manage debt  

Both areas benefit from **AI** for faster logging, smarter suggestions, and plain-language insights — but AI is an enhancement layer, not the core product.

---

## 2. Problem statement

| Area | Pain today | What the app should solve |
|------|------------|---------------------------|
| Nutrition | Manual entry is slow; grocery products repeat; **MyFitnessPal** is cluttered with wrong foods; **ChatGPT** has no memory or barcode | Scan barcodes, save *your* products once, log in few taps; AI parses text but **you confirm** before save |
| Workouts | Hard to remember sets/reps/progress | Simple workout log with history and trends |
| Spending | Easy to lose track of small purchases | Fast expense entry with categories and summaries |
| Savings | Goals feel abstract | Visible progress toward savings targets |
| Debt | Multiple balances, unclear payoff path | One place to see debt and track payments |

---

## 3. Product shape (recommendation)

### Option A — Single “Life Hub” app (recommended)

One install with two main modules:

```
Home
├── Fitness
│   ├── Nutrition (calories, barcode, meals)
│   └── Workouts (strength, history)
└── Finance
    ├── Transactions (spend / save)
    └── Debt
```

**Pros:** one codebase, shared auth/settings, shared AI chat, one backup/sync story  
**Cons:** slightly larger app; modules must stay visually distinct  

### Option B — Two separate apps

**Pros:** simpler mental model per app, smaller individual scope  
**Cons:** duplicate infrastructure (auth, DB, AI, UI shell)  

**Recommendation:** Start with **Option A**. You can split later if needed.

---

## 4. Users and scope

| | |
|---|---|
| **Primary user** | You (single-user personal app) |
| **Platform** | Mobile only (iOS + Android) |
| **v1 audience** | Personal use — no multi-user or social features required |
| **Out of scope for now** | Web app, desktop, sharing with friends, marketplace |

Design for **single-user** first. That simplifies auth (device-local or one account), privacy, and data modeling.

---

## 5. Core principles

1. **Log fast** — barcode scan, quick-add buttons, templates, voice/text AI logging  
2. **Offline-friendly** — daily logging must work without network; sync when online  
3. **Your data, your products** — grocery items you scan are saved to *your* database, not only a public API  
4. **AI assists, you decide** — suggestions and parsing; user confirms before saving  
5. **Start small** — ship a thin v1 per module, then deepen  

---

## 6. Feature scope tiers

Use these labels in outlines `03` and `04`:

| Tier | Meaning |
|------|---------|
| **Must-have (v1)** | Minimum useful product for daily use |
| **Should-have (v1.1)** | High value, build soon after v1 |
| **Nice-to-have** | Later enhancements |
| **Future** | Explicitly deferred |

---

## 7. AI integration — high-level plan

AI should reduce friction, not replace structure.

### Fitness AI (examples)

- Parse “chicken rice broccoli ~500 cal” into a log entry  
- Suggest meals based on remaining daily calories/macros  
- Generate or adjust workout plans from goals and history  
- Answer “what did I eat most this week?” from your data  

### Finance AI (examples)

- Parse “coffee 150, grab 320” into categorized transactions  
- Summarize spending by category for a date range  
- Suggest budget adjustments from patterns  
- Debt payoff scenarios (“if I pay X extra on card A…”)  

### AI guardrails

- Always show parsed result for **user confirmation** before save  
- Keep API keys server-side or in secure env (not hardcoded in app)  
- Allow **disable AI** and use manual entry only  

---

## 8. Non-functional requirements

| Requirement | Target |
|-------------|--------|
| Performance | Barcode scan → product lookup in &lt; 2s when cached |
| Privacy | Personal financial and health data — encrypt in transit; consider local encryption |
| Backup | Cloud sync or export (CSV/JSON) so data is not trapped on one phone |
| Cost | Free tier stack where possible (see `02_technology_recommendations.md`) |

---

## 9. Open decisions (resolve before coding)

| # | Decision | Options | Notes |
|---|----------|---------|-------|
| 1 | One app vs two | Life Hub vs separate | Recommend Life Hub |
| 2 | Framework | React Native (Expo) vs Flutter | See tech doc |
| 3 | Database | Supabase / Firebase / SQLite + sync | See tech doc |
| 4 | Barcode source | Open Food Facts + manual override | Free product API; your DB for custom items |
| 5 | AI provider | OpenAI / Gemini / local model | Cost and privacy tradeoff |
| 6 | Auth | Email magic link / device-only / passcode | Single-user can start device-local |

---

## 10. Success criteria (personal)

You will know v1 is successful when:

- [ ] You can scan a grocery barcode and log a meal in under 30 seconds  
- [ ] You can log a workout with sets/reps/weight in under 1 minute  
- [ ] You can record an expense and see weekly spending summary  
- [ ] You can see total debt and log a payment  
- [ ] Data persists across app restarts and (optionally) device reinstall via backup  

---

## 11. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Scope creep (two big apps at once) | Strict v1 Must-have lists; one module at a time in roadmap |
| Barcode API missing local products | Save manual product form; build personal product library |
| AI costs | Rate limits, confirm-before-save, optional AI features |
| Framework regret | Pick one stack in week 1; prototype barcode + one CRUD screen before committing |
| Data loss | Local DB + periodic export or cloud sync from day one |

---

## 12. Document map

This plan is the anchor. Details live in:

- **Tech choices** → `02_technology_recommendations.md`  
- **Fitness features** → `03_fitness_app_outline.md`  
- **Finance features** → `04_finance_app_outline.md`  
- **Structure** → `05_architecture_outline.md`  
- **Build order** → `06_development_roadmap.md`
