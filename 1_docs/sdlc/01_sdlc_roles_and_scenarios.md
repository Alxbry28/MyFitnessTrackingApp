# Software Development Life Cycle (SDLC) — Who Builds an App

**Date:** October 19, 2026  
**Status:** Reference / learning note  
**Scope:** Roles in making a software application, what they do, and realistic scenarios  
**Note:** This is a new standalone document. It does not change any existing plan or user-story files.

---

## 1. What SDLC is

The **Software Development Life Cycle (SDLC)** is the repeatable path from “we have a problem” to “people can use the app, and we can keep it running.”

A common phase list:

| Phase | Plain English |
|---|---|
| **1. Discover / analyze** | Who is this for? What must it do? What must it not do? |
| **2. Design** | Screens, data, APIs, security, and how the pieces connect |
| **3. Build** | Write code, set up databases, cloud, and pipelines |
| **4. Test** | Prove it works, fails safely, and is usable |
| **5. Release** | Put it in users’ hands (store, web, internal install) |
| **6. Operate / support** | Keep it up, fix incidents, answer users |
| **7. Improve** | New features, tech debt, cost, and risk |

Not every company uses every title below. On a **small team** (or a solo app), one person wears several hats. On a **company app**, roles split so work and risk stay clear.

Your list is a solid core. This document adds the people who usually sit around that core.

---

## 2. How to read this list

- **Always involved** = almost every app that ships to real users.  
- **Usually involved** = common once the app leaves a laptop and goes to a company, cloud, or store.  
- **Sometimes involved** = depends on domain (payments, health data, AI, regulated industry).

A **scenario** is a short story of that role in a real situation — including a fitness / nutrition app when it helps.

---

## 3. Role catalog

### 3.1 Product and business

#### Product Owner / Product Manager (PO / PM)

**When:** Always involved (even if the founder does it).  
**What they do:** Decide *what* to build and in what order. Own the backlog, success metrics, and trade-offs (time vs scope vs quality). Not the same as a Business Analyst: the BA clarifies requirements; the PO *chooses*.

**Scenario:** Users want recipes, pantry, lifts, and finance. The PO says: “October ships barcode → log food → remaining calories. Recipes wait.” That decision unblocks the whole team.

---

#### Business Analyst (BA)

**When:** Always involved on company projects; on solo apps you do this yourself.  
**What they do:** Turn messy business talk into clear requirements: user stories, rules, edge cases, acceptance criteria. Map current vs future process. Ask “what happens if the barcode is missing?” until the team can build it.

**Scenario:** A coach says “log meals.” The BA splits that into: scan barcode, manual search, custom food, edit serving size, leftover calories. They write: “Given a scanned product with 250 kcal per 100 g, when the user logs 220 g, then the diary adds 550 kcal.”

---

#### Project Manager / Delivery Manager

**When:** Usually involved when more than a few people work in parallel.  
**What they do:** Track dates, dependencies, budget, vendors, and risk. Make sure design, build, test, and infra land in the same week. Not the same as a Scrum Master (process) or PO (product).

**Scenario:** Store screenshots, Apple review, and a database migration all need the same Friday. The PM puts a calendar on it so QA is not testing a moving target.

---

#### Scrum Master / Agile Coach

**When:** Usually involved on Scrum/Kanban teams.  
**What they do:** Keep the team’s way of working healthy: standups, sprint planning, retros, removing blockers. They do not assign tasks like a boss.

**Scenario:** Backend is blocked waiting for a cloud account. The Scrum Master escalates to IT instead of letting standup become a 40-minute status meeting.

---

#### Subject Matter Expert (SME) / Business Stakeholder

**When:** Always involved (the person who knows the domain).  
**What they do:** Confirm that the app matches real life: gym habits, food labels, accounting rules, hospital workflow, etc. Sign off User Acceptance Testing (UAT).

**Scenario:** A dietitian checks whether “calories remaining” should include supplements. Engineering cannot guess that correctly without an SME.

---

#### Compliance, Legal, Privacy (DPO / GRC)

**When:** Usually involved if you store personal data; always if health, payments, or kids.  
**What they do:** Privacy notices, consent, data retention, cookies, contracts with vendors (Open Food Facts, cloud, analytics). “Can we store this?” is their question.

**Scenario:** The app wants to save food photos. Legal asks: photos can identify people and kitchens. They require a retention period and a delete-account path.

---

### 3.2 Experience (what the user sees)

#### UX Researcher

**When:** Sometimes involved; more common at product companies.  
**What they do:** Interviews, usability tests, journey maps. Find *why* people abandon MyFitnessPal-style apps.

**Scenario:** Five people try to log breakfast. Four never find serving size. Research reports that before any “redesign the home screen” debate.

---

#### UI / UX Designer

**When:** Always involved (even if a developer copies a design system).  
**What they do:** Information architecture, wireframes, visual design, empty/error states, accessibility contrast. UX is the flow; UI is the look.

**Scenario:** Designer specifies: barcode scanner is one tap from home; “calories remaining” is the largest number; failed scan offers “type the name” immediately — not a generic error.

---

#### Content Designer / Copywriter

**When:** Sometimes involved.  
**What they do:** Button labels, empty states, onboarding, emails, store listing text. Bad copy is a bug.

**Scenario:** “Macro deficit” is replaced with “Calories left today.” Support tickets drop because people understand the screen.

---

#### Accessibility Specialist

**When:** Sometimes involved; legally required in many public-sector and large-company apps.  
**What they do:** Screen readers, font scale, color contrast, focus order. WCAG checks.

**Scenario:** A user with large text on Android cannot tap “Log.” The specialist requires 44px tap targets and retests.

---

### 3.3 Engineering leadership and architecture

#### Solution Architect / Software Architect

**When:** Usually involved once there is more than one system (app + API + DB + cloud).  
**What they do:** Choose the shape: mobile vs web, .NET API vs BaaS, SQLite on device vs Postgres in cloud, auth, how modules talk. Draw the boxes so teams do not invent conflicting designs.

**Scenario:** v1 stores food only on the phone. The architect writes: “No API in October. When sync arrives, the phone remains source of truth until first login.” That prevents a rewrite later.

---

#### Tech Lead

**When:** Always involved on a team of developers.  
**What they do:** Day-to-day technical direction: coding standards, PR review, splitting work, unblocking people, protecting quality without becoming a bottleneck. Still writes code on most teams.

**Scenario:** Two developers both create a `Food` type that disagrees. The tech lead sets one model, a shared validation library, and a review checklist for API contracts.

---

#### Engineering Manager

**When:** Usually involved in companies with multiple teams.  
**What they do:** People, hiring, performance, career, capacity. Not the same as tech lead (code) or PM (dates).

**Scenario:** QA is drowning because every sprint dumps work on Friday. The EM changes capacity so testing starts mid-sprint.

---

### 3.4 Developers (build the product)

#### Frontend / Client Developer (Web)

**When:** Always involved if there is a browser app.  
**What they do:** HTML/CSS/JS (often React, Vue, Angular). Talk to APIs, handle loading/error states, forms, routing.

**Scenario:** Web dashboard shows weekly calories. Frontend paginates history so opening 6 months of logs does not freeze the tab.

---

#### Mobile Developer (iOS / Android / Cross-platform)

**When:** Always involved if there is a phone app. Often grouped with “frontend.”  
**What they do:** Native (Swift/Kotlin) or cross-platform (React Native, Flutter, .NET MAUI). Camera, barcodes, offline storage, app store builds.

**Scenario:** Grocery store has no signal. Mobile dev keeps scans in SQLite and syncs later — the log still works in the aisle.

---

#### Backend / API Developer

**When:** Always involved once data leaves the device or multiple clients share it.  
**What they do:** APIs, business rules, auth, jobs (nightly summaries), integration with other systems. In your stack this is often **.NET**.

**Scenario:** Two phones log the same banana. Backend applies last-write rules and rejects a diary entry dated in 2099.

---

#### Full-stack Developer

**When:** Common on small teams.  
**What they do:** Both client and API. Faster for small features; risk is becoming a bottleneck and skipping depth (security, performance).

**Scenario:** Solo builder ships barcode + diary end to end because one person owns the screen *and* the table.

---

#### Data Engineer

**When:** Sometimes involved; more when analytics, warehouses, or ML exist.  
**What they do:** Pipelines from app DB to reporting (warehouse, dashboards). Not the same as DBA (keep the live DB healthy).

**Scenario:** Product wants “average protein by weekday.” Data engineer copies anonymized diary events to a warehouse each night so the live app DB is not used for heavy reports.

---

#### ML / AI Engineer

**When:** Sometimes involved.  
**What they do:** Models, prompts, evaluation, cost, hallucination controls. “AI that guesses macros from a food list” is this role plus backend.

**Scenario:** User types “taho 220g.” The model returns macros. The engineer adds: never overwrite a barcode-scanned product, and show confidence so the user can edit.

---

#### Integration / API Specialist

**When:** Sometimes involved (payments, ERPs, Open Food Facts, fitness watches).  
**What they do:** Map external APIs, retries, rate limits, webhooks, versioning.

**Scenario:** Open Food Facts is slow. Integration work adds timeout, cache, and “save product locally so the next scan is instant.”

---

### 3.5 Data, infrastructure, cloud, security (your list, expanded)

#### Database Administrator (DBA)

**When:** Usually involved once there is a shared database.  
**What they do:** Schema review, indexes, backups, restore drills, users/permissions, query performance, replication. Developers *use* the DB; DBAs *keep it alive and recoverable*.

**Scenario:** The diary table hits 10 million rows. “Calories remaining” takes 4 seconds. DBA adds an index on `(user_id, date)` and a restore test so a bad migration can be rolled back.

---

#### IT Infrastructure and Network

**When:** Usually involved in companies; cloud-native startups lean on Cloud/DevOps instead.  
**What they do:** Servers, VPN, office Wi-Fi, firewalls, DNS, load balancers, certificates, “can the office reach the staging API?” Physical and network plumbing.

**Scenario:** QA cannot hit staging because the office firewall blocks the cloud IP. Infra opens the path and documents it so the next hire is not stuck.

---

#### Cloud Administrator / Cloud Engineer

**When:** Usually involved if the app runs on AWS, Azure, GCP, etc.  
**What they do:** Accounts, IAM roles, VMs/containers, storage, cost alerts, region choice, landing zone. Overlaps with DevOps; cloud admin often owns *the platform*, DevOps owns *how apps land on it*.

**Scenario:** Production must live in `southeastasia` for latency. Cloud admin creates isolated dev/stage/prod subscriptions so a test script cannot delete prod.

---

#### DevOps / Platform Engineer / CI-CD Engineer

**When:** Usually involved as soon as more than one person ships code.  
**What they do:** Build pipelines, environments, infrastructure as code, secrets, automated deploys, rollback. “Merge to main → tests → deploy staging” is their factory.

**Scenario:** A developer used to copy files by hand. DevOps adds a pipeline: lint, unit tests, build APK/IPA, deploy API. A bad commit never reaches users.

---

#### Site Reliability Engineer (SRE)

**When:** Sometimes involved; more at scale.  
**What they do:** Uptime, SLOs, on-call, incident response, capacity, error budgets. Close to DevOps, more focused on *running* production.

**Scenario:** API error rate hits 2%. SRE pages the on-call, rolls back, then adds an alert so the team hears about it before Twitter does.

---

#### System Administrator

**When:** Sometimes involved (VMs, Windows/Linux boxes, AD, patching). Overlaps with Infra.  
**What they do:** OS patching, accounts, file shares, print/VPN, servers that are not “serverless.”

**Scenario:** The build agent Windows VM is out of disk. Sysadmin expands the disk and patches it on the maintenance window.

---

#### Cybersecurity / Security Engineer / AppSec

**When:** Always involved in some form (even a checklist). Dedicated team at companies.  
**What they do:** Threat model, auth/session, secrets, dependency scanning, encryption, secure SDLC gates, security review of PRs and cloud IAM. **Cybersecurity** is the umbrella; **AppSec** sits next to developers.

**Scenario:** The app stores food logs. Security requires HTTPS, hashed passwords (or OAuth), no API keys in the mobile binary, and “delete my data.” They block a feature that logged calories in a public URL.

---

#### Identity and Access Management (IAM) Specialist

**When:** Sometimes involved in enterprises.  
**What they do:** SSO, Active Directory / Entra ID, roles, least privilege, who can enter prod.

**Scenario:** Contractors could SSH into prod. IAM switches them to time-bound, audited access.

---

#### Security Operations (SOC) Analyst

**When:** Sometimes involved once the app is live.  
**What they do:** Watch alerts, phishing, unusual logins, malware. They do not design the app; they watch it.

**Scenario:** 500 failed logins from one IP. SOC blocks the IP and tells AppSec to add rate limiting.

---

#### Penetration Tester / Ethical Hacker (often a vendor)

**When:** Sometimes involved before a big launch or audit.  
**What they do:** Authorized attempts to break the app. Report holes. Not the same as the internal security engineer who *fixes* them.

**Scenario:** Tester intercepts the API and changes `calories` on another user’s diary. Backend must check user id on every request — that finding becomes a P0 bug.

---

### 3.6 Quality

#### QA Tester / Manual QA

**When:** Always involved (if nobody else tests, users will).  
**What they do:** Test cases from stories, exploratory testing, regression, devices (small Android phone, iOS, slow network). File bugs with steps, expected vs actual.

**Scenario:** QA scans a barcode with 0 g serving. The app divides by zero and crashes. Bug filed before release: “empty serving must show an error, not a crash.”

---

#### QA Automation Engineer

**When:** Usually involved after the app has a stable core.  
**What they do:** Automated UI and API tests in CI so every build reruns the critical path.

**Scenario:** “Scan → save product → log 100 g → remaining calories drop” runs on every pull request. A refactor cannot silently break logging.

---

#### Performance / Load Tester

**When:** Sometimes involved.  
**What they do:** How the system behaves with many users or large data.

**Scenario:** 5,000 users log lunch at 12:05. API CPU spikes. Test shows the need for caching product lookups.

---

#### User Acceptance Tester (UAT) — often the SME or PO, not IT

**When:** Always involved before a business go-live.  
**What they do:** Confirm the app matches real work, not just “the ticket.”

**Scenario:** You log yesterday’s real meals on a preview APK. If remaining calories feel wrong, the story is not done.

---

### 3.7 Release, support, and “after go-live”

#### Release Manager

**When:** Usually involved in larger orgs.  
**What they do:** Change calendar, go/no-go, store submissions, rollback plan, communication to support.

**Scenario:** Apple review takes days. Release manager does not cut a backend that the old app cannot talk to until the new app is approved.

---

#### Technical Writer

**When:** Sometimes involved.  
**What they do:** User help, API docs, runbooks for on-call.

**Scenario:** Support keeps answering “how do I edit a serving?” Writer adds an in-app help article with screenshots.

---

#### Customer Support / Helpdesk / IT Service Desk

**When:** Usually involved once other people use the app.  
**What they do:** First line: password reset, “app won’t open,” known issues. Escalate bugs to engineering with logs.

**Scenario:** Ten tickets say “scan does nothing.” Support finds they denied camera permission and publishes a short fix article.

---

#### Customer Success / Account Manager

**When:** Sometimes involved (B2B apps).  
**What they do:** Onboard companies, training, renewals. Not the same as L1 helpdesk.

**Scenario:** A gym chain buys the coach dashboard. Success runs a 30-minute training so coaches actually log clients.

---

### 3.8 Roles people forget

| Role | What they do | Typical scenario |
|---|---|---|
| **Product Designer (broader than UI)** | End-to-end experience including onboarding and metrics | First-run: ask weight/goal without a 12-screen quiz |
| **Mobile Release / App Store specialist** | Certificates, signing, Play/App Store listing, review rejection | Apple rejects “health” wording; listing is rewritten |
| **Payment specialist / Fintech engineer** | PCI, wallets, receipts | Premium subscription receipt validation |
| **Localization / i18n** | Translations, date/number formats | 220 g vs 7.8 oz; calorie vs kilojoule |
| **Data Protection Officer (DPO)** | GDPR-style accountability | User requests export of all food logs |
| **Vendor / Third-party manager** | Contracts with cloud, SMS, food databases | Open Food Facts usage terms |
| **Finance / Billing ops (internal)** | Invoices, cost of cloud | Azure bill jumped after leaving debug logging on |
| **Executive sponsor** | Budget and political cover | Unblocks hiring a DBA instead of “developers will handle backups” |

---

## 4. Your original list — where it sits

| Your title | Closest full name | Neighbors you may also meet |
|---|---|---|
| Business Analyst | BA | Product Owner, SME |
| Tech Lead | Tech Lead | Architect, Engineering Manager |
| Developers Front/Back | Frontend, Mobile, Backend | Full-stack, Integration, AI |
| QA Testers | Manual QA | Automation, Performance, UAT |
| IT-DBA | Database Administrator | Data Engineer |
| IT-Infra and Network | Infrastructure / Network | Sysadmin, Network engineer |
| Cloud Admin | Cloud Engineer | DevOps, SRE |
| Cybersecurity | Security / AppSec | SOC, IAM, Pen test, GRC |

Nothing on your list is wrong. The extras are mostly **product**, **design**, **devops/SRE**, **support**, and **legal** — the people who decide *what*, how it *feels*, how it *ships*, and whether it is *allowed*.

---

## 5. Who shows up in each SDLC phase

R = responsible / heavy work, C = consult / review.

| Role | Analyze | Design | Build | Test | Release | Operate |
|---|---|---|---|---|---|---|
| Product Owner | R | C | C | C | C | R (priority) |
| Business Analyst | R | R | C | C | | |
| Designer / UX | C | R | C | C | | |
| Architect | C | R | C | | C | C |
| Tech Lead | C | R | R | C | C | C |
| Frontend / Mobile | | C | R | C | C | C |
| Backend | | C | R | C | C | C |
| DBA | C | C | C | C | C | R |
| Cloud / DevOps | | C | R | C | R | R |
| Infra / Network | | C | C | | C | R |
| Cybersecurity | C | R | C | C | C | R |
| QA | C | C | C | R | C | C |
| Support | | | | C | C | R |
| Legal / Privacy | C | C | | | C | C |

---

## 6. Two full stories (same app, different company size)

### 6.1 Solo / tiny team (personal fitness tracker)

One person may be PO, BA, designer, frontend, backend, QA, and “cloud admin” (or no cloud at all).

1. **You (PO + BA):** Barcode → product → log → remaining calories this month.  
2. **You (designer + mobile):** Expo screens, SQLite on device.  
3. **You (QA):** Log real breakfast for a week.  
4. **Later:** When accounts and sync appear, you start needing **backend, DBA thinking, cloud, and security** even if you still do them yourself.

Lesson: titles are jobs, not headcount. The work still exists.

### 6.2 Company building the same product

1. **PO** sets the October scope. **BA** writes stories. **Designer** delivers flows.  
2. **Architect** says phone-first SQLite now, API later. **Tech lead** splits tickets.  
3. **Mobile** builds scan + diary. **Backend** (later) builds accounts. **DBA** reviews schema and backups.  
4. **Cloud + DevOps** make staging/prod. **Security** reviews auth and data deletion.  
5. **QA** tests devices and bad barcodes. **You (UAT)** log real food.  
6. **Release manager** ships the store build. **Support** handles “camera permission.” **SRE** watches crash rate.

---

## 7. Mini-scenarios by theme (quick reference)

**Requirements fight**  
PO wants pantry + recipes. BA shows it doubles test cases. Tech lead estimates 6 weeks. PO cuts pantry. BA rewrites stories. QA updates the test plan.

**Production is down**  
SOC or monitoring alerts. SRE/DevOps roll back. Backend finds a bad query. DBA kills the lock. Cloud checks if a region failed. Support posts a status note. PO decides whether to keep the feature off.

**Security review before launch**  
AppSec: “API keys in the app.” Mobile moves keys to the backend. IAM: least privilege on the database. Legal: privacy policy. Pen test: IDOR on diary entries. QA retests login and delete-account.

**“It works on my machine”**  
Developer’s laptop has the API. QA’s phone does not. Infra/network DNS was wrong. Cloud admin forgot the staging firewall rule. DevOps adds the URL to the pipeline so it cannot drift.

**Data loss scare**  
Someone drops a table in staging that was actually prod. After that, Cloud + DBA split accounts, backups are tested, and developers lose standing prod write access.

---

## 8. Practical takeaway

If you remember only one picture:

```
Business / product     → what and why
Design                 → how it feels
Engineering            → how it works
QA                     → proof it works
DBA / cloud / infra    → where it runs and how it survives
Security / legal       → how it stays allowed and safe
Support / SRE          → how it stays usable after launch
```

Your eight roles cover **requirements, build, test, data, hosting, and security**. Add **product owner, designer, architect, DevOps, and support** and you have the usual full cast for a real app.

For a personal fitness app in draft, you are most of those people. The list still matters: it is a checklist of work that must happen, whether or not a separate person is hired to do it.
