# 11 — Friends Beta (Android) and the iPhone Version Later

**Created:** October 20, 2026 · **Updated:** October 20, 2026 (Android-only beta, $0 budget)  
**Status:** Plan, no code  
**Related:** [01 project plan](./01_project_plan.md) · [02 tech](./02_technology_recommendations.md) · [05 architecture](./05_architecture_outline.md) · [06 roadmap](./06_development_roadmap.md) · [08 October sprint](./08_october_sprint.md) · [10 body progress](./10_body_progress.md)

---

## 1. Decisions (Oct 20)

| # | Decision | Reason |
|---|----------|--------|
| D-I1 | **Android only** for me and the friends beta | My daily phone is Android; no Apple devices |
| D-I2 | **Budget: $0.** No Apple Developer Program ($99/yr), no Google Play account ($25) for now | Not spending money on this yet |
| D-I3 | **iPhone version is parked**, not cancelled | 2–3 friends have iPhones; revisit when there's budget (§6) |
| D-I4 | Code stays **cross-platform** (Expo libraries, platform code behind interfaces) | Costs almost nothing now; makes the iPhone build a later switch, not a rewrite |
| D-I5 | Friends Beta 1 starts **Nov 29**, Android only | Approved |

What this means for friends:

| Friend's phone | Beta 1 (Nov 29) |
|----------------|-----------------|
| Android | ✅ Install from an APK link |
| iPhone (2–3 friends) | ⏸ Not yet. Can give feedback by watching a demo or trying it on my phone; see §6 for when they can join |

---

## 2. Two beta stages

| | **Beta 1: local-only** | **Beta 2: accounts + sync + AI** |
|---|---|---|
| Platform | Android | Android (+ iPhone if §6 is unlocked) |
| Data | On each tester's phone (SQLite) | Also on my server (.NET API + PostgreSQL) |
| Accounts | None | Sign-in per tester |
| AI features | No | Yes, with a per-user daily limit |
| My cost | **$0** | Hosting + AI usage per tester (free tiers first) |
| My responsibility | Low: I never hold their data | Higher: their health data on my server (privacy policy, delete account, security) |
| When | **Nov 29** | After the .NET API, January at the earliest |

---

## 3. How Android friends install it ($0)

| Step | Detail |
|------|--------|
| 1. Build | `eas build --profile preview --platform android` → APK (EAS free plan; builds wait in a queue, so start them early) |
| 2. Share | Send the EAS build link (or the APK file) in our group chat |
| 3. Install | Friend allows "Install unknown apps" for their browser or file manager, then installs. A one-page install guide with screenshots helps |
| 4. Updates | JS-only fixes via **EAS Update** (no reinstall); native changes (new permissions, Health Connect) need a new APK |

**Same signing key every time:** keep using the EAS-managed Android keystore, so new APKs install as updates instead of failing or forcing an uninstall (which would delete their data).

Google Play internal testing ($25) is **not needed** for Beta 1. Consider it only if friends find sideloading too awkward.

---

## 4. What "friends can use it" adds to the app

| Need | Why | Stage |
|------|-----|-------|
| **First-run setup** | Goal, units (kg/lb, cm/in), height, sex, birth date, BMI scale (Asia-Pacific default) | Beta 1 |
| **No hard-coded "me"** | My calorie goal, Xiaomi defaults, PH products must be settings | Beta 1 |
| **Safe migrations** | Friends hold real data; a schema change must never wipe it | Beta 1 (rule already in `08`) |
| **Backup / restore** | Reinstalling shouldn't lose everything | Beta 1 (export is v1; restore becomes Must) |
| **Feedback button** | "Send feedback" (email or form) with app version and Android version | Beta 1 |
| **Crash reports** | I can't see their phones. Sentry free tier via `@sentry/react-native` and its Expo config plugin | Beta 1 |
| **Disclaimer** | Calorie, BMI and TDEE numbers are estimates, not medical advice; 18+ | Beta 1 |
| **Privacy page** | Short: "your data stays on your phone; crash reports contain no food or body data" | Beta 1 |
| Accounts, per-user server data, delete account | Their data on my server | Beta 2 |
| AI limits + monthly cost cap | AI costs money per call | Beta 2 |

Scale sync for friends uses **Health Connect** (Android), same as for me ([10 §5b](./10_body_progress.md#5b-importing-weight-from-my-xiaomi-scale)). Friends with other scale brands can use it too if their scale's app writes to Health Connect.

---

## 5. Timeline

| Dates | Work |
|-------|------|
| Oct 20–31 | v1 Android sprint (`08`), unchanged |
| Nov 1–23 | Pantry + weight/BMI + Xiaomi CSV import (`09`, `10`) |
| **Nov 24–28** | **Beta 1 prep:** first-run setup, settings instead of constants, backup restore, feedback button, Sentry, disclaimer + privacy page, install guide; preview APK |
| **Nov 29** | **Beta 1 starts** (Android friends) |
| Nov 30 – Dec 13 | .NET API + sync + AI; fix beta bugs in between |
| December | Workouts, Health Connect scale sync, measurements, calorie stats |
| January+ | Beta 2 (accounts, sync, AI) if Beta 1 went well |

---

## 6. The iPhone version: parked until there's budget

### Why it can't be free right now

| Option | Why not (for now) |
|--------|-------------------|
| TestFlight | Needs the Apple Developer Program, **$99/year** |
| Sideloading with a free Apple ID | Needs Xcode on a Mac (or AltStore on each friend's computer), apps expire every 7 days. Too fragile for testers |
| Expo Go on their iPhones | Only works while connected to my laptop's dev server. OK for a sit-down demo, not for daily use |
| Testing it myself | I have no iPhone or Mac; EAS can build in the cloud, but I'd depend on friends to test every iOS build |

### Free option for iPhone friends later (optional, not planned)

A **web version** (Expo can export to web) hosted for free, opened in Safari and "Added to Home Screen". It would cover logging and viewing, but barcode scanning, local database and Apple Health support on the web are limited, so it's a separate project-sized decision. Not in the plan unless iPhone friends really want to test.

### When to unlock iOS

Revisit when **any** of these is true:
- I'm ready to spend $99/year (e.g. Beta 1 went well and friends keep using it)
- I plan to publish on the App Store
- I get access to a Mac or iPhone for testing

### What's ready when it's unlocked (because of D-I4)

| Already done | Still to do then |
|--------------|------------------|
| Same Expo codebase and screens | Apple Developer enrollment |
| `healthService` interface (Health Connect today) | Apple Health (HealthKit) implementation + entitlement |
| Safe-area layout, cross-platform libraries | First iOS build via EAS, TestFlight setup, Beta App Review |
| Privacy page | Make it a proper privacy policy (Apple requires one for HealthKit apps) |

Estimate: about **1 week** of work after enrollment.

---

## 7. Stories (Epic O — Friends beta)

| ID | Story | Priority |
|----|-------|----------|
| O1 | As an Android tester, I want to install the app from a link with a short guide, without help | Should |
| O2 | As a tester, I want a short first-run setup (goal, units, height, BMI scale), so the app fits me | Should |
| O3 | As a tester, I want to send feedback from inside the app, with the app version attached | Should |
| O4 | As a tester, I want to back up and restore my data, so reinstalling doesn't lose it | Should |
| O5 | As the owner, I want crash reports from testers' phones, so I can fix bugs I can't reproduce | Should |
| O6 | As a tester, I want updates to install over my current app without losing data | Should |
| O7 | As a tester, I want my own account so my data syncs and I can use AI features | Could (Beta 2) |
| O8 | As an iPhone friend, I want to try the app on my iPhone | Won't for now (parked, §6) |

**Acceptance (core):**
- **O2:** **Given** a fresh install, **when** I open the app, **then** setup asks for goal, units and height before Today; skipping uses safe defaults that can be changed in Settings.
- **O4:** **Given** a backup file from the same app version or older, **when** I restore on a new install, **then** all products, logs, pantry, weights and measurements are back.
- **O6:** **Given** I have the previous beta APK with data, **when** I install the new APK, **then** it installs as an update and my data is still there.
- **O3:** Feedback includes app version and Android version, never my food log unless I attach it.

---

## 8. Definition of done (Beta 1)

- [ ] At least 2 Android friends installed the app from the link without my help
- [ ] Fresh install → setup → scan → log works on their phones
- [ ] A new APK installs over the old one with data kept
- [ ] Backup on one phone → restore on another works
- [ ] A test crash shows up in Sentry
- [ ] Feedback collected in one list (`BETA_FEEDBACK.md` or the Notion board)

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| iPhone friends feel left out | Show them a demo; ask what they'd want; collect their interest as a reason to unlock §6 |
| Friends hesitate to install an APK | One-page guide with screenshots; explain why the "unknown apps" warning appears |
| Update fails because of a different signing key | Always build with the EAS-managed keystore; never delete it |
| Testers lose data after an update | Migration runner + backup restore before Beta 1; never ship a destructive migration |
| Feedback grows the scope | Only bugs get fixed during the beta; feature ideas go to the parking lot in `06` |
| EAS free build queue is slow | Start builds early in the day; EAS Update for JS-only fixes |

---

## 10. Open questions

| # | Question | Status |
|---|----------|--------|
| Q-I1 | Mac / iPhone for testing? | **Answered: none** |
| Q-I2 | How many friends, iPhone vs Android? | **Answered: 2–3 on iPhone**; Android count still open |
| Q-I3 | APK link or Google Play internal testing? | **APK link** ($0) |
| Q-I4 | Beta 1 on Nov 29? | **Answered: yes** |
| Q-I5 | Apple Developer account? | **Answered: no budget**, so iOS is parked (§6) |
| Q-I6 | How many Android friends will join Beta 1? | Open (target 2–5) |
