# User Story — Personal Fitness Tracker (Food, Lifts, Supplements)

**Date:** October 19, 2026
**Status:** Draft, no code
**Related:** [02_workflow_diagrams.md](./02_workflow_diagrams.md), [session_notes_2026-10-19.md](../session_notes_2026-10-19.md), [plan/03](../plan/03_fitness_app_outline.md), [plan/07](../plan/07_recommendation_for_dotnet_react.md), [plan/08](../plan/08_october_sprint.md)

---

## 1. The user (me)

| | |
|---|---|
| **Who** | A .NET developer who works out and tracks food every day |
| **Goal** | Know the calories and macros (protein, carbs, fat) for each day, track lifts and exercise, keep track of my supplement stock, and look back at past days |
| **Tried** | Bitalyze and MyFitnessPal: too hard to understand and use |
| **Currently uses** | ChatGPT: types the day's food as a list, and the AI works out the macros |
| **Device** | Phone, used daily |

### How I log today

```
Breakfast:
220g taho

Lunch:
250g white rice
110g boiled eggs
250g boiled chicken breast
50g okra

Pre-Workout:
7g Wake Pre workout
5g creatine

Dinner:
250g white rice
110g boiled eggs
250g boiled chicken breast
50g okra

Post-workout:
30g just whey
```

### Why ChatGPT isn't working

| Problem | Effect |
|---------|--------|
| Yesterday's data isn't saved | No history and no way to compare days |
| The conversation hits its memory limit | The AI forgets earlier context and I have to explain it again |
| Macros come from internet estimates | The same food can get different numbers on different days |
| No packaging scan | Branded products (Wake, Just Whey) are guessed instead of read from the label |

---

## 2. What my log tells us (design insights)

These come straight from the sample log above. Some of them **change the current October plan**.

| # | Observation | What the app should do |
|---|-------------|------------------------|
| 1 | **Most foods have no barcode**: taho, rice, eggs, chicken, okra | The barcode scanner isn't the main way I'll add food. A **personal food library** with quick search matters more |
| 2 | **Everything is in grams** | Store nutrition **per 100 g** and log in grams. Servings like "1 scoop" are optional extras |
| 3 | **Five meal slots**: Breakfast, Lunch, Pre-Workout, Dinner, Post-Workout | Meal slots need to be **customizable**, not just breakfast/lunch/dinner/snack |
| 4 | **Dinner = Lunch**, and meals repeat day to day | **Copy a meal** (to another slot or day) and **saved meal templates** are must-haves |
| 5 | **Foods are logged cooked** ("boiled chicken breast", cooked rice) | Each food entry names its state (cooked/raw) so the numbers always match what I weigh |
| 6 | **Supplements** (creatine, pre-workout, whey) | Treat them as normal foods (zero-calorie is fine) **and** as stock in an inventory: logging 5 g of creatine also takes 5 g out of the tub |
| 7 | **Local Filipino foods and brands** (taho, local products) | Open Food Facts may not have them, so **scanning the nutrition label** is important |
| 8 | **I already type a clean text format** | The app can **read that same text** with simple rules, no AI needed (see §5) |

---

## 3. Epics and user stories

Priority: **Must** = v1 (Oct 31) · **Should** = v1.1 (early Nov) · **Could** = later

### Epic A — My food library (the source of truth)

| ID | Story | Priority |
|----|-------|----------|
| A1 | As me, I want to save a food with its calories, protein, carbs and fat **per 100 g**, so the numbers stay the same every time I use it | Must |
| A2 | As me, I want to search my saved foods by name (e.g. "chick" finds "Chicken breast, boiled"), so adding food is fast | Must |
| A3 | As me, I want to edit a food's nutrition once and have every future log use the corrected values | Must |
| A4 | As me, I want an optional serving size (e.g. "1 scoop = 30 g") for supplements | Should |
| A5 | As me, I want past logs to keep the numbers they were logged with, so editing a food later doesn't change my history | Must |

**Acceptance criteria (A1–A3)**
- A food has a name, a state (cooked/raw/packaged), kcal, protein, carbs and fat per 100 g, and an optional brand and barcode
- Search returns matches as I type
- Editing a food changes only future logs (see A5)

### Epic B — Daily logging

| ID | Story | Priority |
|----|-------|----------|
| B1 | As me, I want to add a food to a meal slot with a gram amount | Must |
| B2 | As me, I want my own meal slots (Breakfast, Lunch, Pre-Workout, Dinner, Post-Workout) in my order | Must |
| B3 | As me, I want to **copy a whole meal** to another slot or day (Lunch → Dinner) | Must |
| B4 | As me, I want to see recent and favorite foods first, so re-logging is one tap plus grams | Must |
| B5 | As me, I want to save a meal as a template ("Rice + eggs + chicken + okra") and log it in one tap | Should |
| B6 | As me, I want to edit or delete a logged item | Must |

**Acceptance criteria**
- Logging a food I've used before takes **3 taps or fewer** plus typing the grams
- Copying Lunch to Dinner takes **2 taps or fewer**

### Epic C — Daily summary and history (fixes the ChatGPT memory problem)

| ID | Story | Priority |
|----|-------|----------|
| C1 | As me, I want to see today's total **calories, protein, carbs and fat** | Must |
| C2 | As me, I want subtotals per meal slot | Must |
| C3 | As me, I want to see calories eaten / goal / remaining | Must |
| C4 | As me, I want to go to any previous day and see exactly what I ate | Must |
| C5 | As me, I want macro targets (e.g. protein goal) with remaining amounts | Should |
| C6 | As me, I want a weekly average view | Could |

**Acceptance criteria**
- All data is saved on the phone right away and is still there after closing the app or restarting the phone
- Totals are calculated from **my saved foods**, never from an internet estimate

### Epic D — Paste my text log

| ID | Story | Priority |
|----|-------|----------|
| D1 | As me, I want to paste the same text I used to give ChatGPT, and have the app turn it into log entries | Should (Must if time allows) |
| D2 | As me, I want a **preview** before saving: each line shows which food it matched, or "not found" | Should |
| D3 | As me, I want to fix an unmatched line by choosing a food or creating a new one, and have the app remember that match next time | Should |

**Acceptance criteria**
- A line ending in `:` (e.g. `Pre-Workout:`) starts a meal slot
- A line like `250g white rice` becomes an amount (250 g) and a food name to look up
- Nothing is saved until I press **Confirm**

### Epic E — Scan the nutrition label on the packaging

| ID | Story | Priority |
|----|-------|----------|
| E1 | As me, I want to take a photo of a Nutrition Facts label and have the app fill in kcal, protein, carbs, fat and serving size | Should |
| E2 | As me, I want to check and correct the scanned values before saving | Should |
| E3 | As me, I want the app to convert "per serving" values to "per 100 g" automatically | Should |
| E4 | As me, I want to attach the barcode to the same product so a later scan finds it right away | Should |

**Acceptance criteria**
- The scan result always opens a **review form**; it's never saved automatically
- If the label only shows values per serving, the app uses the serving size in grams to work out the per-100 g values

### Epic F — Barcode lookup

| ID | Story | Priority |
|----|-------|----------|
| F1 | As me, I want to scan a barcode and get the product from **my library first**, then Open Food Facts | Must (already in sprint) |
| F2 | As me, if the barcode isn't found, I want to go straight to the label scan or the manual form with the barcode filled in | Must |

### Epic G — Keep my data safe

| ID | Story | Priority |
|----|-------|----------|
| G1 | As me, I want to export everything to a backup file | Must |
| G2 | As me, I want to restore from that file on a new phone | Should |
| G3 | As me, I want the data synced to my own server | Could (November API) |


### Epic H — Lift tracking (strength training)

| ID | Story | Priority |
|----|-------|----------|
| H1 | As me, I want to start a workout session and add exercises with **sets, reps and weight (kg)** | Must |
| H2 | As me, I want to see **what I lifted last time** for that exercise while logging (e.g. "Last: 60 kg × 8, 8, 7") | Must |
| H3 | As me, I want my own **exercise library** (create once, reuse; search by name) | Must |
| H4 | As me, I want to view any past session by date | Must |
| H5 | As me, I want **workout templates** (e.g. Push / Pull / Legs) that pre-fill the exercises | Should |
| H6 | As me, I want the app to flag a **personal record (PR)** when I beat my best weight or reps | Should |
| H7 | As me, I want an optional rest timer between sets | Should |
| H8 | As me, I want to log bodyweight exercises (pull-ups, dips) with reps only, or with added weight | Must |
| H9 | As me, I want a progress chart per exercise (best set / volume over time) | Could |
| H10 | As me, I want to paste a text workout (e.g. `Bench press: 60kg x 8, 8, 6`) and preview it before saving | Could |

**Acceptance criteria**
- Logging a set takes **2 taps or fewer** when weight and reps are the same as the last set (pre-filled)
- An unfinished workout is never lost if the app is closed (it's saved after every set)
- Previous performance is shown from **my own history**, not guessed

### Epic I — Other exercise (cardio and activity)

| ID | Story | Priority |
|----|-------|----------|
| I1 | As me, I want to log cardio (walk, run, bike, etc.) with **duration** and optional **distance** | Should |
| I2 | As me, I want to add a cardio entry to the same session as my lifts, or on its own | Should |
| I3 | As me, I want an optional calories-burned number I enter myself (from a watch or machine) | Could |

### Epic J — Body weight and the link between food and training

| ID | Story | Priority |
|----|-------|----------|
| J1 | As me, I want to log my body weight (kg) on any day | Should |
| J2 | As me, I want the Today screen to show both **food totals** and **today's workout** (done / not done) | Should |
| J3 | As me, I want different calorie or protein goals on **training days and rest days** | Could |
| J4 | As me, I want a weekly view: average calories, average protein, workouts done and body weight trend | Could |

### Epic K — Supplement inventory

| ID | Story | Priority |
|----|-------|----------|
| K1 | As me, I want to add a supplement container (e.g. Just Whey 2 kg, creatine 300 g, Wake pre-workout) with its **starting amount in grams** | Should |
| K2 | As me, I want logging a supplement in my food log to **automatically subtract** that amount from its container | Should |
| K3 | As me, I want to see **how much is left** and **how many days it will last** at my usual daily use | Should |
| K4 | As me, I want a **low-stock warning** (e.g. under 7 days left), so I can reorder in time | Should |
| K5 | As me, I want to **restock** (open a new container) and keep the old one in history | Should |
| K6 | As me, I want to manually adjust the amount (spilled, gave some away, scoop was off) | Should |
| K7 | As me, I want to save the **price** and see **cost per serving and per month** | Could |
| K8 | As me, I want an **expiry date** and a warning when it's close | Could |
| K9 | As me, I want to track supplements I don't log as food (e.g. vitamin or fish oil capsules) by **count** instead of grams | Could |

**Acceptance criteria**
- A supplement product can be linked to one **active container**; when I log it, the active container goes down by the same grams
- Deleting or editing a log entry puts the amount back or corrects it
- "Days left" = amount left ÷ average daily use over the last 14 days (or my set daily dose if there isn't enough history yet)
- The amount left can't go below zero; if it would, the app asks whether I opened a new container

---

## 4. A day in the app (target experience)

1. **Morning:** open the app → Today → Breakfast → type "taho" → pick it → 220 g → done.
2. **Lunch:** tap the "Rice + eggs + chicken + okra" template → adjust grams if needed → done.
3. **Pre-workout:** recent foods show Wake and creatine → one tap each. Both containers go down automatically.
4. **Dinner:** "Copy Lunch → Dinner".
5. **Post-workout:** Just Whey favorite → 30 g. Today shows a small warning: "Just Whey: ~6 days left".
6. **New product at the store:** scan the barcode → not found → photo of the label → review → save. From then on it's in my library.
7. **Gym:** start workout → pick the "Push" template → each exercise shows last session's numbers → tap ✓ for each set, change weight or reps when needed → PR badge if I beat my best → finish.
8. **Optional cardio:** add "Treadmill walk, 20 min" to the same session.
9. **Any time:** swipe to yesterday or last week; food and workouts are still there.

---

## 5. Recommendations

### R1 — The database comes first; the internet and AI only help with input
Every number comes from **my food library**. Open Food Facts, label scanning and (later) AI are only ways to **fill in a new food once**. After that the stored values are used. This directly fixes "different numbers every day".

### R2 — Seed the library with my regular foods on day one
Most of my foods are whole foods without barcodes. Before using the app, enter the ~10–15 foods I eat most (rice, eggs, chicken breast, okra, taho, whey, creatine, pre-workout…). Good free sources for the values:
- **Philippine Food Composition Tables (FNRI-DOST)**: local foods such as taho
- **USDA FoodData Central**: generic foods (rice, eggs, chicken), including cooked versions
- **The product's own label**: anything branded

Make sure each one says **cooked or raw** to match how I weigh it.

### R3 — Read the text format with rules instead of AI
My log format is already structured: `<number>g <food name>` under `<Meal>:` headings. Simple rules can handle it with **no AI, no internet and no cost**, and they never "forget". Save every confirmed match (e.g. "boiled chicken breast" → my "Chicken breast, cooked") so it works automatically next time. Use AI later only for messy free text.

### R4 — Label scanning options

| Option | How | Pros | Cons | When |
|--------|-----|------|------|------|
| **A. Manual form** | Type values from the label | Works now, 100% accurate | ~1 min per product | v1 (already planned) |
| **B. On-device text recognition (OCR)** | Phone reads the label text, rules pick out the numbers | Free, offline, private | Doesn't run in Expo Go (needs a dev build); labels vary, so it needs a review step | v1.1 |
| **C. AI vision through my .NET API** | Send the photo to a vision model; it returns structured values | Handles messy and varied labels best | Needs the November API, costs a little per scan, needs internet | November, with the API |

**Suggestion:** ship **A** in October. In November, go straight to **C** through the .NET API, since the API is already planned and it handles real-world labels best. Option B is only worth doing if you want it to work offline. In every case, the result goes to the **review form** first.

### R5 — Changes to the October sprint (plan/08)

| Change | Why | Effort |
|--------|-----|--------|
| Store nutrition **per 100 g** and log in **grams** | Matches how I actually log | None if decided before Day 2 (database setup) |
| Use **custom meal slots** instead of the fixed breakfast/lunch/dinner/snack | I use 5 slots, including pre-/post-workout | Small |
| Move **Copy meal** from "if extra time" to **Must** | Dinner = Lunch on my sample day | Small |
| Move **Show P/C/F totals** from "if extra time" to **Must** | Macros are the reason I track at all | Small (the data is already stored) |
| Save a **snapshot** of the numbers on each log entry | Editing a food doesn't change my history | Small |
| Add a **"Seed my foods"** task on Day 3 | The library is useless if it's empty | ~1 hour |

Keep deferred: AI, sync, label OCR, macro *targets*, charts.

### R6 — Workouts come after nutrition, but plan the data now
Keep the order from [plan/08](../plan/08_october_sprint.md): **food in October, workouts Nov 15–28**. Food is the daily pain, and finishing one feature beats two half-finished ones. For workouts, keep these ideas:
- **Weight in kg, reps as whole numbers.** Bodyweight exercises allow an empty weight (or added kg).
- **Each set is saved straight away**, not only when the workout is finished. Phones kill apps at the gym.
- **"Last time" is the most important feature.** It's the main reason to track lifts in an app instead of a notebook.
- **Templates come from real sessions:** "Save this workout as a template" is easier than building templates from scratch.
- **Cardio is a separate entry type** (time and distance), not a set with fake reps.
- Use the same **"my library first"** idea as food: I make my own exercise list instead of browsing a huge built-in one.

### R7 — Day-one exercise library
Like the food library (R2), enter the 10–20 exercises I actually do before the first workout, and group them by body part or by template (Push / Pull / Legs or Upper / Lower).

### R8 — Supplement inventory: one product, separate containers
- A supplement is a normal **food product** (for macros) with **containers** attached (for stock). Logging it does both jobs, so I never enter it twice.
- Count everything in **grams** like the food log. Capsules or tablets use a count (K9).
- Keep **used-up containers** in history; that gives real numbers for "how long does a 2 kg tub last" and cost per month.
- Build it **after** the food log works (it needs log entries to subtract from). Good fit: v1.1 in early November, before workouts, since it's small and builds on the food log.

### R9 — Keep the UI to three main tabs
**Today** (totals + meal slots + today's workout + low-stock warnings) · **Food** (library / add / scan / paste / supplement stock) · **Workout** (start / history / exercises). No social feed, no ads, no extra settings. That's what made Bitalyze and MFP hard to use.

---

## 6. Things to decide

- [ ] Are rice and chicken weighed **cooked**? (The sample log suggests yes.)
- [ ] Final meal slot names and order. Are pre- and post-workout always used, or only on training days?
- [ ] Daily calorie goal, and protein target (for v1.1)
- [ ] What's in "Wake Pre workout" and "Just Whey" per serving? Copy it from the labels when seeding
- [ ] Is offline label scanning important, or is the November AI option enough?
- [ ] What's my training split? (Push / Pull / Legs, Upper / Lower, full body…) This decides the first templates
- [ ] What "exercise" besides lifting: walking, running, basketball, sports? This decides how much of Epic I is needed
- [ ] Track RPE / RIR (how hard a set felt), or keep it to weight × reps?
- [ ] Should workouts move earlier than Nov 15 if the food app is stable early?
- [ ] Which supplements, container sizes and usual daily doses? Is anything taken that isn't logged as food (vitamins, fish oil)?
- [ ] How many days ahead should the low-stock warning appear? (Depends on delivery time, e.g. Shopee/Lazada)

---

## 7. Definition of success

- I stop using ChatGPT for food logging
- A typical day (5 meals) takes **under 2 minutes** to log
- I can open any past day and see exact totals
- The same food always gives the same numbers
- At the gym I can see last session's numbers for every exercise without scrolling through notes
- Logging a set takes a couple of taps, and nothing is lost if the app closes mid-workout
- I never run out of whey, creatine or pre-workout by surprise
