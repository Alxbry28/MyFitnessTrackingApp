# Build Process and Notion Tracker — How Not to Get Lost

**Date:** October 19, 2026  
**Status:** Reference / working method  
**Related:** [01_sdlc_roles_and_scenarios.md](./01_sdlc_roles_and_scenarios.md), [02_sdlc_documents.md](./02_sdlc_documents.md)  
**Note:** New standalone file. Does not change existing plan or user-story files.

---

## 1. Direct answers

**What should you do?**  
Do not start from “open the editor and invent screens.” Work in **thin slices**: one user outcome at a time. Write down the slice, the data it needs, how you will know it is done, then code **only that**. When you stop, the tracker still knows where you are.

**Can you keep track in a Notion database?**  
Yes. Notion is a good **status board** (what is in progress, blocked, done). It is a weak **source of truth** for long specs. Keep durable writing in this repo (`1_docs`). Put tickets, status, and links in Notion.

If you duplicate the whole user story into Notion *and* Markdown, you will update one and forget the other. Link instead of copy.

---

## 2. Why “just code” leaves you in the middle of nowhere

Typical trap:

1. Scaffold the app.  
2. Add a screen.  
3. Add another screen.  
4. Realize calorie math, tables, and navigation disagree.  
5. No list of what is done, what is left, or what “done” meant.

You are not missing talent. You are missing a **loop** and a **board**.

The loop is always the same, whether you are a company or one person:

```
Pick one outcome
  → write the rule and the done-check
    → sketch data + one screen path
      → build the smallest thing that can be used
        → test it on the phone
          → mark the ticket Done (or Bug)
            → pick the next outcome
```

Code is step 4, not step 1.

You already did a lot of step-0 work: vision, outline, architecture, stories, October sprint. The missing piece is turning that into **tickets with status**, so a two-day gap does not wipe the map.

---

## 3. The process (do this every feature, every session)

### Before any new feature (15–40 minutes)

Write or confirm, in this order:

| Step | Question | Enough answer for this app |
|---|---|---|
| 1. Outcome | What can I **do** when this is done? | “Scan a barcode and see remaining calories.” |
| 2. Out of scope | What am I **not** doing? | No recipes, no .NET, no AI this slice. |
| 3. Rule | How is the number calculated? | remaining = goal − sum(logged kcal). Empty grams = error, not crash. |
| 4. Data | Which tables/fields? | `products`, `food_log_entries`, `settings.calorie_goal` |
| 5. Path | What taps, what if it fails? | Scan → local hit / OFF / manual form → log → Today updates |
| 6. Done-check | How do I prove it on the phone? | Log breakfast from a real barcode in under 30s. |

If you cannot fill row 1 and row 6, do not write code yet.

### During a coding session (same day)

1. Open Notion → **This week** view → one card in **Doing** (never five).  
2. Open the linked doc in `1_docs` if the rule is unclear.  
3. Build until the done-check passes **or** you hit a wall.  
4. If you stop mid-way, write **3 lines** on the card: *done so far / next command / blocker*.  
5. Move the card: Done, Blocked, or leave Doing with those 3 lines.

That 3-line note is the “track” you were missing. Git commit messages help; they do not replace “what is the next human step.”

### After the slice works

- Tick the done-check on the card.  
- Log bugs as **new cards**, not as comments you will lose.  
- Only then start the next outcome.

---

## 4. Slice size (so you never “build the app”)

Bad ticket: “Fitness app” or “Nutrition module.”  
Good ticket: one sentence a phone can demonstrate.

Examples in the order you already planned (October sprint):

1. App opens on my phone (scaffold).  
2. I can insert and read a product in SQLite.  
3. I can add 5 kitchen products by hand.  
4. I can log a full day by picking products.  
5. Today shows eaten / goal / remaining.  
6. Scan finds a product I already saved.  
7. Scan misses → Open Food Facts or manual form.  
8. Re-log in a few taps.  
9. Export JSON backup.  
10. Preview APK installed.

Each of those is one Notion card. Coding without a card is how you get lost.

---

## 5. Notion: yes — use it as a database, not as a second wiki

### What Notion is good at

- Tables with **Status**, **Type**, **Sprint**, filters, calendars  
- “What am I doing today?”  
- Bugs, decisions (short), questions  
- Relations (a Story has many Tasks; a Task has many Bugs)

### What Notion is bad at

- Long architecture and stories (your Markdown is already better)  
- History that belongs with git (PRs, diffs)  
- Being the only copy of calorie rules (those must live next to the code/docs)

### Source of truth

| Thing | Lives in |
|---|---|
| Why, rules, flows, architecture | `1_docs/` in this repo |
| Code | git |
| Status of work, bugs, daily next step | **Notion** |
| Deep spec copied into Notion | **Don’t.** Put a URL/path on the card instead |

---

## 6. Notion setup you can copy (about 30 minutes)

Create one Notion **page** called `Fitness App`. Inside it, create **four linked databases** (or four tables on one page). You do not need more.

### Database A — Work (main board)

This is the one you open every session.

| Property | Type | Values / notes |
|---|---|---|
| Name | Title | One outcome, e.g. `Today screen: eaten / goal / remaining` |
| Status | Status | `Backlog` · `Ready` · `Doing` · `Blocked` · `Done` |
| Type | Select | `Story` · `Task` · `Bug` · `Chore` · `Decision` |
| Slice | Select | `Scaffold` · `Data` · `Products` · `Log` · `Today` · `Scan` · `OFF` · `Relog` · `Backup` · `Ship` |
| Sprint | Select | `Oct v1` · `Nov API` · `Later` |
| Priority | Select | `P0` · `P1` · `P2` |
| Done-check | Text | Phone proof, one sentence |
| Out of scope | Text | What this card will **not** do |
| Doc | URL | Path or link to `1_docs/...` |
| Next step | Text | The 3-line parking note |
| Blocker | Text | Empty unless Status = Blocked |
| Estimate | Number | Hours, optional |
| Completed | Date | When Status became Done |

**Views to create**

1. **Doing** — filter Status = Doing (this is your daily home).  
2. **Oct v1 board** — Board grouped by Status, filter Sprint = Oct v1.  
3. **Ready queue** — Status = Ready, sorted by Priority.  
4. **Bugs** — Type = Bug, Status is not Done.  
5. **By slice** — Board grouped by Slice (see holes: e.g. Scan has no Ready cards).

**Card template (Notion template button)**

```
Outcome:
Out of scope:
Rule / data:
Done-check (on phone):
Doc link:
Next step:
```

### Database B — Decisions (tiny ADR log)

So you do not re-debate Expo vs Flutter every weekend.

| Property | Type | Values |
|---|---|---|
| Name | Title | `Local-only SQLite in October` |
| Status | Select | `Proposed` · `Accepted` · `Superseded` |
| Date | Date | |
| Context | Text | Why it came up |
| Choice | Text | What you picked |
| Rejected | Text | What you did not pick |
| Consequence | Text | What this forces later |
| Doc | URL | e.g. `plan/08_october_sprint.md` |

Seed it with decisions you already made: Expo, SQLite local, no API this month, OFF for barcodes, nutrition only.

### Database C — Glossary / rules (optional, small)

Only for numbers and names that must not drift.

| Property | Type | Example |
|---|---|---|
| Name | Title | `Calories remaining` |
| Rule | Text | `goal − sum(kcal of today's logs)` |
| Tables | Text | `settings`, `food_log_entries` |
| Status | Select | `Current` · `Deprecated` |

Do not paste whole stories here. Ten rows is plenty.

### Database D — Sessions (optional daily log)

If you like a diary. Not required if every Work card has **Next step**.

| Property | Type |
|---|---|
| Name | Title (`2026-10-20 Data layer`) |
| Date | Date |
| Work | Relation → Database A |
| Did | Text |
| Next | Text |
| Mood / energy | Select (optional) |

---

## 7. Seed the Work database from the October sprint

Create these cards as **Ready** (or Done if you already did them). Sprint = `Oct v1`.

| Name | Type | Done-check |
|---|---|---|
| Scaffold Expo app; opens on phone | Task | App opens in Expo Go; first git commit |
| SQLite + products / food_log / settings | Task | Debug button inserts and reads a product |
| Manual product form + list | Story | 5 real kitchen products saved |
| Log a day by meal + quantity | Story | Full day logged by hand |
| Today: eaten / goal / remaining | Story | Real breakfast counted; start daily use |
| Scan finds local product | Story | Scan a saved item; product opens |
| OFF fetch or manual on miss | Story | 10 real groceries end to end, including one miss |
| Recent + favorite re-log | Story | Breakfast in ≤ 3 taps |
| Day nav + JSON export | Story | Export opens and contains today's food |
| EAS preview APK on phone | Chore | Installed without Expo Go |
| Oct 31 definition of done | Story | All boxes in `plan/08` §2 ticked |

Add a **Bug** card the moment something eats data or crashes. P0 if logs can vanish.

---

## 8. How a week looks in Notion + repo

```
Sunday evening (20 min)
  Notion: pick 3–5 Ready cards for the week. Only one may be Doing at a time.

Each coding session
  1. Doing view
  2. Code toward the done-check
  3. Commit in git
  4. Update Next step or Status
  5. Close laptop

If you disappear for 4 days
  Open Doing + Next step. You are not lost.
  If Doing is empty, open Ready queue.

Saturday
  Move finished cards to Done.
  Write one Decision if you changed stack/scope.
  Do not start Finance because the board looks exciting.
```

---

## 9. If you do not want Notion

Same process, different board:

- GitHub **Issues** + a Project board (best if the repo is on GitHub)  
- A `TRACKER.md` table in this repo (Status column)  
- Paper kanban: Backlog / Doing / Done  

The tool is optional. **One Doing item, a done-check, and a next-step note** are not.

Notion wins when you want filters, relations, and a phone-friendly inbox for bugs. It loses if you spend a weekend decorating the board instead of filling done-checks.

---

## 10. What you should do next (concrete)

You already have analysis docs. Next is **not** “write more vision.” Next is **install the tracker, then execute the first Ready card.**

1. Create the Notion page and **Database A (Work)** with the properties in §6.  
2. Add the seed cards in §7. Link each to `plan/08_october_sprint.md` or the matching user story.  
3. Add **Database B (Decisions)** and log the locked October choices.  
4. Put **one** card in Doing: *Scaffold Expo app; opens on phone* — unless that is already true.  
5. After the app opens on the phone, mark Done, write Next step on the SQLite card, stop or continue.  
6. Never start a feature that has no done-check.

That is the whole method: **docs for truth, Notion for motion, git for history, phone for proof.**
