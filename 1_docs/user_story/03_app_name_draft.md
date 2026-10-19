# App Name — Draft

**Date:** October 19, 2026
**Status:** Draft, nothing chosen yet
**Goes with:** [01_user_story.md](./01_user_story.md) · [02_workflow_diagrams.md](./02_workflow_diagrams.md)

---

## 1. What the name should say

From the user story, the app is:

| Trait | Comes from |
|-------|-----------|
| **Remembers everything** | The fix for ChatGPT forgetting past days |
| **Food + lifts + supplements** | Epics A–K |
| **Grams and exact numbers, my own library** | "Database first" (R1) |
| **Simple, just for me** | The fix for MyFitnessPal and Bitalyze being hard to use |
| **Filipino daily life** | Taho, local brands, FNRI food tables |

**Criteria for a good name**
1. Short: 1–2 words, easy to say and type
2. Hints at food **and** training, or at "a log that remembers"
3. Sounds good on a phone's home screen (about 12 characters or fewer, so it isn't cut off)
4. Not already used by a well-known fitness app

---

## 2. Name ideas

### A. Filipino names

| Name | Meaning | Why it fits | Watch out |
|------|---------|-------------|-----------|
| **Talaan** | "record / list / log" | Exactly what the app is: a record that doesn't forget | Doesn't say "fitness" by itself |
| **KainBuhat** | *kain* = eat, *buhat* = lift (gym slang) | Says both halves of the app; sounds local and fun | Two words joined; could be written "Kain & Buhat" |
| **Buhat** | Lifting / carrying (gym slang) | Short, strong, very Pinoy gym culture | Only the lifting side |
| **Lakas** | Strength | Short and positive | Generic; probably used by other apps |
| **Sigla** | Energy, vigor | Nice feel; covers food + training | Doesn't say "tracking" |
| **Tibay** | Durability, toughness | Fits consistency and long-term progress | Abstract |
| **Lista** | "List" (as in *ilista mo*, "write it down") | Everyday word, feels like a notebook | Very generic |

### B. English names

| Name | Idea | Why it fits | Watch out |
|------|------|-------------|-----------|
| **Plate & Rep** | Plate (food, and a weight plate) + rep | A double meaning that covers both modules | "&" is awkward in some places; write "PlateRep" |
| **Fuel & Iron** | Food = fuel, lifting = iron | Clear and gym-flavored | Common phrase; may be taken |
| **Per100** | Everything is stored per 100 g | A nerdy nod to the core design | Means nothing to anyone else |
| **Gramline** | Grams + a daily timeline | Fits the gram-based logging | Doesn't say "lifting" |
| **Ledger Fit** | A ledger: exact entries, never forgotten | Database-first idea; also fits the future Finance module | Sounds a bit like a finance app |
| **Stack** | Supplement stack + stacking plates + stacking days | Covers all three modules | Very common word in tech |

### C. "Life Hub" names (if Finance joins later)

[plan/00](../plan/00_index.md) describes one app with Fitness + Finance modules. If that still holds, the name could be broader:

| Name | Idea |
|------|------|
| **Talaan** | Also works for money: *talaan ng gastos* (a record of expenses) |
| **Ledger** | Food ledger, lift ledger, money ledger |
| **Araw-araw** | "Every day": the daily habits app |

---

## 3. Shortlist

| Rank | Name | Best for |
|------|------|----------|
| 1 | **Talaan** | One app for everything (food, lifts, supplements, and Finance later); meaning = "the record that remembers" |
| 2 | **KainBuhat** | A fitness-only app; the most fun and the clearest about what it does |
| 3 | **PlateRep** | An English name with the food/weights double meaning |

**My pick:** **Talaan** if Finance will be part of the same app. **KainBuhat** if it stays a fitness app.

Possible taglines:
- *Talaan — Every gram. Every rep. Remembered.*
- *KainBuhat — Log what you eat. Log what you lift.*

---

## 4. Practical notes

- **Use a code name for now.** The October sprint doesn't depend on the name, so don't let it slow down Day 1.
- **Decide before the standalone build (Oct 29).** The app's internal ID (package or bundle identifier) is set in the first installable build, and it's annoying to change afterwards. The name shown on screen can change any time.
- **Check before committing:**
  - Search Google Play and the App Store for the name
  - Check whether a GitHub repo name or domain is available, if you care about that
  - Search for an existing fitness brand with the same name (even for a personal app, it avoids confusion if you ever share it)
- **Icon idea:** short names give easy icons, e.g. a "T" made from a barbell (Talaan) or a bowl + dumbbell (KainBuhat).

---

## 5. To decide

- [ ] Will Finance be part of the same app? (This decides between a broad name and a fitness-only name)
- [ ] Filipino or English name?
- [ ] Pick 1 from the shortlist, or add your own ideas here:
  - …
  - …
