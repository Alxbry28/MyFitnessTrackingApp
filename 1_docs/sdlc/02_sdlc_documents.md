# SDLC Documents — What You Need and What You Generate to Build an App

**Date:** October 19, 2026  
**Status:** Reference / learning note  
**Related:** [01_sdlc_roles_and_scenarios.md](./01_sdlc_roles_and_scenarios.md)  
**Note:** New standalone file. Does not change existing plan or user-story files.

---

## 1. Two kinds of documents

| Kind | Meaning | Example |
|---|---|---|
| **Needed (inputs)** | You must have this *before* a phase can start safely | “Who is this for?” vision, signed-off stories, screen designs |
| **Generated (outputs)** | The phase *produces* this for the next people | Architecture, API spec, test report, runbook |

The same file can be both. A **user story** is generated in analysis and needed in build and test.

You do **not** need every document below for a personal fitness app. A company, a regulated product, or an app with payments/health data needs more. Treat the list as a **menu**, not a homework pile.

**Rule of thumb:** write a document when someone else (including future-you) would guess wrong without it.

---

## 2. What this project already has (mapped)

This fitness draft already produced several real SDLC artifacts:

| You already wrote | Typical SDLC name |
|---|---|
| `plan/01_project_plan.md` | Vision / project charter / scope |
| `plan/02` + `07` | Technology decision record |
| `plan/03` + `04` | Product / feature outline (early PRD) |
| `plan/05_architecture_outline.md` | High-level architecture |
| `plan/06` + `08` | Roadmap / sprint plan |
| `user_story/01` + `04` | User stories / requirements |
| `user_story/02_workflow_diagrams.md` | Process / UX flow |
| `session_notes_2026-10-19.md` | Meeting / decision notes |

Still typical to add later: data model, API contract, test cases, privacy text, release notes, runbook.

---

## 3. Catalog by SDLC phase

Each item: **needed or generated**, **who usually writes it**, **what it is for**, **fitness-app example**.

Priority:

- **Must** — almost every app that ships to real users  
- **Usual** — once there is a team, cloud, or store listing  
- **Sometimes** — company, audit, payments, health, or scale  

---

### Phase 1 — Discover / analyze

| Document | Need / generate | Who | Priority | What it does | Scenario |
|---|---|---|---|---|---|
| **Problem / vision brief** | Generate | PO, founder | Must | Why the app exists, who it is for, success looks like | “MFP is too heavy; I want barcode → remaining calories on my phone.” |
| **Project charter / plan** | Generate | PO, PM | Usual | Scope, out of scope, dates, budget, risks | October = nutrition only; workouts later |
| **Stakeholder list** | Generate | PM, BA | Usual | Who decides, who uses, who pays | You are user + builder; later a dietitian SME |
| **Current-state notes** | Generate | BA | Must | How people do it today | ChatGPT food list → macros |
| **User research / interviews** | Generate | UX research | Sometimes | Evidence, not opinions | Five people abandon serving-size screens |
| **Personas** | Generate | UX, PO | Sometimes | Named user types | “Daily logger” vs “weekend meal-prepper” |
| **User stories / use cases** | Generate | BA, PO | Must | Buildable slices with acceptance criteria | “Given 250 kcal/100 g, when I log 220 g, then 550 kcal is added.” |
| **Business rules** | Generate | BA, SME | Must | Non-negotiable calculations and limits | Remaining = target − food − supplements (or not) |
| **Process / workflow diagrams** | Generate | BA, UX | Must | Order of screens and decisions | Scan → save product → log → remaining |
| **Backlog / requirement list** | Generate | PO | Must | Ordered work | Must / later tags on features |
| **Non-functional requirements (NFRs)** | Generate | Architect, security, PO | Usual | Speed, offline, privacy, devices | “Log a meal in airplane mode”; “delete my data” |
| **Risk / assumption log** | Generate | PM, tech lead | Usual | What might be wrong | Open Food Facts may miss local brands |
| **Decision log / ADR (light)** | Generate | PO, tech lead | Must | Why we chose X not Y | Expo + SQLite this month; .NET API in November |
| **Meeting / session notes** | Generate | Anyone | Usual | What was agreed that day | Oct 19: no backend this month |

**Needed to start this phase:** a problem, a user, and someone who can say yes/no.

**Generated for later:** stories, rules, scope, and decisions developers can implement without guessing.

---

### Phase 2 — Design (product + technical)

| Document | Need / generate | Who | Priority | What it does | Scenario |
|---|---|---|---|---|---|
| **PRD (Product Requirements Document)** | Generate | PO, BA | Usual | One place: problem, stories, metrics, launch bar | Nutrition v1 definition of done |
| **Information architecture** | Generate | UX | Usual | What lives where in the app | Tabs: Log, Products, History, Settings |
| **Wireframes** | Generate | UX | Must | Layout without final colors | Home: remaining calories as the largest number |
| **UI mockups / design system** | Generate | UI designer | Usual | Visual source of truth | Buttons, empty scan state, error text |
| **UX copy deck** | Generate | Content | Sometimes | Labels and empty states | “Calories left today” not “macro deficit” |
| **Prototype** | Generate | UX | Sometimes | Clickable demo before code | Stakeholder taps scan on Figma |
| **Solution / system architecture** | Generate | Architect | Must | Boxes: app, DB, APIs, cloud | Phone SQLite now; API later |
| **C4 / context diagrams** | Generate | Architect | Usual | Who talks to whom | App → Open Food Facts; later App → .NET API |
| **Data model / ERD** | Generate | Architect, DBA, backend | Must | Tables, keys, relationships | `products`, `food_logs`, `daily_targets` |
| **API specification (OpenAPI)** | Generate | Backend, tech lead | Usual once there is a server | Contracts for every endpoint | `POST /logs` body and error codes |
| **Sequence diagrams** | Generate | Architect, backend | Usual | Order of calls | Scan → lookup cache → OFF API → save local |
| **Security design / threat model** | Generate | AppSec, architect | Usual | What can go wrong | Diary IDs must not be guessable across users |
| **Privacy / data map** | Generate | Legal, DPO, BA | Usual if personal data | What you store, why, how long | Food photos: retain 90 days or none |
| **Environment design** | Generate | Cloud, DevOps | Usual | Dev / stage / prod | Staging never shares prod database |
| **Infrastructure diagram** | Generate | Cloud, infra | Usual | Network, DNS, certs, regions | `southeastasia` for latency |
| **ADR (Architecture Decision Record)** | Generate | Tech lead, architect | Must | Dated technical choice + reason | “Local-first SQLite so grocery stores work offline” |

**Needed here:** signed-off stories, NFRs, and stack direction.

**Generated for build:** screens, schema, API contract, security constraints.

---

### Phase 3 — Build

These are both “documents” and living files in the repo.

| Document | Need / generate | Who | Priority | What it does | Scenario |
|---|---|---|---|---|---|
| **Repo README** | Generate | Tech lead | Must | How to run the app | `npx expo start`; how to open on phone |
| **Coding standards / CONTRIBUTING** | Generate | Tech lead | Usual | How PRs should look | TypeScript strict; no API keys in the app |
| **Build tickets (from stories)** | Generate | Tech lead, PO | Must | One implementable slice | “Save scanned product to `products` table” |
| **Schema / migration notes** | Generate | Backend, DBA | Must | How the DB changes | Add `serving_grams`; never divide by zero |
| **Interface comments / XML docs** | Generate | Developers | Usual | Code-level intent | Why remaining calories exclude water |
| **Secrets / config checklist** | Generate | DevOps, security | Must | What must not be committed | OFF is public; future API keys in env only |
| **CI pipeline definition** | Generate | DevOps | Usual | Lint, test, build artifact | PR must pass tests before merge |
| **Changelog (Keep a Changelog)** | Generate | Developers | Usual | What each version did | “Fix crash on 0 g serving” |
| **Pull request descriptions** | Generate | Developers | Usual | Review context | Screenshots of log screen before/after |

**Needed here:** stories, mockups or wireframes, data model, ADRs.

**Generated:** working software **plus** the trail that lets others run, review, and change it.

---

### Phase 4 — Test

| Document | Need / generate | Who | Priority | What it does | Scenario |
|---|---|---|---|---|---|
| **Test plan** | Generate | QA | Must | Scope, devices, what “done” means | Android Expo Go + one small phone; offline scan |
| **Test cases / checklist** | Generate | QA, BA | Must | Step-by-step from acceptance criteria | Scan known barcode → grams → remaining drops |
| **Traceability matrix** | Generate | QA, BA | Sometimes | Story ↔ test ↔ result | Story US-04 has tests TC-12 and TC-13 |
| **Bug reports** | Generate | QA, anyone | Must | Steps, expected, actual, device | Crash when serving is empty |
| **Test evidence / report** | Generate | QA | Usual | What passed, what is open | 18 passed, 2 deferred, 0 blockers |
| **UAT script + sign-off** | Generate | BA, SME, PO | Usual | Real-life confirmation | You log yesterday’s actual meals for 3 days |
| **Performance test notes** | Generate | Perf tester | Sometimes | Load and slowness | 5,000 lunch logs at 12:05 |
| **Security test / pen-test report** | Generate | AppSec, vendor | Sometimes | Authorized break-and-report | IDOR on another user’s diary |
| **Accessibility audit** | Generate | A11y specialist | Sometimes | WCAG gaps | 44px tap targets with large font |

**Needed here:** frozen (or clearly versioned) build, stories, known devices.

**Generated:** proof, bugs, and a go/no-go for release.

---

### Phase 5 — Release

| Document | Need / generate | Who | Priority | What it does | Scenario |
|---|---|---|---|---|---|
| **Release plan / go-live checklist** | Generate | Release mgr, PM | Must | Order of steps and owners | Build APK → smoke test → publish |
| **Version / tagging notes** | Generate | Tech lead, DevOps | Must | What git tag is in the store | `v0.1.0-nutrition` |
| **Store listing** (Play / App Store) | Generate | PO, mobile, copy | Usual | Name, screenshots, privacy answers | “Personal calorie log; data stays on device” |
| **Release notes** | Generate | PO, tech lead | Must | User-facing what changed | “Scan barcodes and see calories left today.” |
| **Rollback plan** | Generate | DevOps, SRE, DBA | Usual | How to undo | Keep previous API; do not force-migrate yet |
| **Known issues list** | Generate | QA, support | Usual | What we ship anyway | Some local brands missing from OFF |
| **Privacy policy / terms** | Generate | Legal | Usual if accounts or stores | What you collect and user rights | Local-only v1 still needs a short policy if you publish |
| **Data processing / vendor list** | Generate | Legal, DPO | Sometimes | Third parties | Open Food Facts; later Azure |
| **Training / admin guide** | Generate | Tech writer, CS | Sometimes | How a company uses it | Gym coach dashboard walkthrough |

**Needed here:** passing test report (or explicit risk accept), store assets, legal text if publishing.

**Generated:** a shipped version people can install, and a way to undo it.

---

### Phase 6 — Operate / support

| Document | Need / generate | Who | Priority | What it does | Scenario |
|---|---|---|---|---|---|
| **Runbook / operations guide** | Generate | SRE, DevOps, backend | Usual | What to do at 2 a.m. | API 5xx → rollback deploy → page backend |
| **Monitoring / alert catalog** | Generate | SRE | Usual | What fires, who is on-call | Crash-free sessions < 99% |
| **Incident report (postmortem)** | Generate | Tech lead, SRE | Usual after incidents | What broke, fix, prevention | Prod DB was staging; split accounts |
| **Support macros / FAQ** | Generate | Support, writer | Usual | First-line answers | “Scan does nothing” → camera permission |
| **SLA / SLO sheet** | Generate | SRE, PO | Sometimes | Uptime promise | API 99.9% excluding planned windows |
| **Backup / restore procedure** | Generate | DBA, cloud | Must once data is shared | How to get data back | Monthly restore drill from snapshot |
| **Access / IAM register** | Generate | IAM, security | Usual in companies | Who can touch prod | Contractors: time-bound only |
| **Cost / bill notes** | Generate | Cloud, finance | Sometimes | Why the bill moved | Debug logging left on in Azure |

**Needed here:** architecture, credentials process, support contact path.

**Generated:** the app stays alive; the next incident is cheaper.

---

### Phase 7 — Improve

| Document | Need / generate | Who | Priority | What it does | Scenario |
|---|---|---|---|---|---|
| **Retrospective notes** | Generate | Scrum master, team | Usual | What to change in how you work | Testing started too late; move QA mid-sprint |
| **Metrics / analytics review** | Generate | PO, data | Sometimes | What users actually do | 40% never complete first scan |
| **Tech-debt backlog** | Generate | Tech lead | Usual | Planned repairs | Product table has no unique barcode |
| **Roadmap update** | Generate | PO | Must | Next slice | Recipes after diary is daily-usable |
| **Version comparison / RFC** | Generate | Architect | Sometimes | Propose a big change | “Add .NET API and accounts” |

---

## 4. Documents by role (who owns the pen)

| Role | Typically writes | Typically reads / signs |
|---|---|---|
| Product Owner | Vision, PRD, backlog, release notes, roadmap | Stories, UAT, metrics |
| Business Analyst | Stories, rules, workflows, UAT scripts | Designs, test cases |
| Designer / UX | Wireframes, mockups, IA, prototype | Stories, research |
| Architect / Tech Lead | Architecture, ADRs, data model, standards | NFRs, security review |
| Developers | README, PRs, changelog, code comments | Stories, API spec, mockups |
| DBA | Schema review, backup/restore, index notes | Data model, load test |
| Cloud / DevOps | Env design, pipeline, rollback, secrets checklist | Architecture |
| Infra / Network | Network/DNS/firewall notes | Environment design |
| Cybersecurity | Threat model, secure checklist, pen-test actions | Architecture, privacy map |
| QA | Test plan, cases, bugs, test report | Stories, builds |
| Legal / Privacy | Policy, terms, DPIA | Data map |
| Support / SRE | FAQ, runbook, incidents | Known issues, release notes |
| Release manager | Go-live checklist, store submission pack | Test report, rollback |

---

## 5. Minimum set vs company set

### 5.1 Solo / personal app (your October nutrition v1)

Write these or you will rebuild from memory:

1. **Vision + scope** — what ships, what waits  
2. **User stories + business rules** — especially calorie math  
3. **Workflow / screens** — scan → save → log → remaining  
4. **Architecture + data model** — tables on the phone  
5. **Decisions (ADR-style)** — Expo, SQLite, no API this month  
6. **Definition of done / test checklist** — real meals on a real phone  
7. **README** — how to run it in six months  

Optional until you publish or add accounts: privacy policy, store listing, CI, runbook.

### 5.2 Small product team

Add: PRD, mockups, OpenAPI, CI, test report, changelog, release checklist, short privacy policy.

### 5.3 Company / audited product

Add: charter, NFRs, threat model, data map, DPIA, pen-test, UAT sign-off, IAM register, SLA, postmortems, vendor list.

---

## 6. One path through a feature (barcode log)

How documents chain for a single feature:

```
Vision: “log food from a barcode”
    → Story + rules: grams × kcal/100g; empty serving is an error
        → Wireframe: scanner, serving field, remaining calories
            → ADR + ERD: products + food_logs in SQLite
                → Ticket + PR: implement scan and save
                    → Test case + bug: 0 g serving crashed
                        → Test report: blocker fixed
                            → Release notes: “Scan and log a product”
                                → FAQ: camera permission
```

If any box is missing, the next person invents it. That is how calorie math and empty-serving crashes disagree.

---

## 7. Living files vs frozen files

| Living (keep updating) | Frozen at a point in time (version them) |
|---|---|
| Backlog, README, changelog, runbook, ADRs (append new ones) | Signed UAT, pen-test report, store screenshot pack for v1.2, incident report |
| Data model (with migrations) | “Schema as of v0.1.0” export if you need an audit trail |
| Test cases | Test report for build `2026-10-31` |

Do not rewrite history of a go-live pack. Add a new version.

---

## 8. Practical takeaway

Documents exist so **intent survives** from one phase (and one person) to the next.

- **Analyze** generates stories and rules.  
- **Design** generates screens, schema, and API contracts.  
- **Build** generates the app and the README/changelog around it.  
- **Test** generates proof and bugs.  
- **Release** generates the store pack and rollback.  
- **Operate** generates runbooks and incident notes.

For this fitness app, you already have the analysis and high-level design pack. The next documents that usually appear when code starts are: **ERD / table list**, **test checklist**, **README**, and **short ADRs** for each stack choice. Store, privacy, and runbooks wait until something leaves your phone.
