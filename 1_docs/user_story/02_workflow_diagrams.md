# Workflow Diagrams — Personal Fitness Tracker

**Date:** October 19, 2026
**Status:** Draft, no code
**Goes with:** [01_user_story.md](./01_user_story.md) (story IDs like `B3`, `H2` and `K2` refer to that file)

> **Viewing the diagrams:** they're written in Mermaid. They render automatically on GitHub. In VS Code, install the **"Markdown Preview Mermaid Support"** extension, then open the preview (`Ctrl+Shift+V`).

---

## Contents

1. [The big picture](#1-the-big-picture)
2. [Daily food logging](#2-daily-food-logging)
3. [Adding a new food (barcode, label, manual)](#3-adding-a-new-food)
4. [Paste my text log](#4-paste-my-text-log)
5. [Supplement inventory](#5-supplement-inventory)
6. [Workout session (lifts and cardio)](#6-workout-session)
7. [Where the numbers come from](#7-where-the-numbers-come-from)
8. [How the data fits together](#8-how-the-data-fits-together)
9. [Build timeline](#9-build-timeline)

---

## 1. The big picture

Three tabs. **Today** is the home screen and pulls everything together.

```mermaid
flowchart TB
    APP([Fitness app]) --> TODAY[Today tab]
    APP --> FOOD[Food tab]
    APP --> WORK[Workout tab]

    TODAY --> T1[Calories and macros: eaten / goal / remaining]
    TODAY --> T2[Meal slots: Breakfast, Lunch, Pre-Workout, Dinner, Post-Workout]
    TODAY --> T3[Today's workout: done / not done]
    TODAY --> T4[Low-stock warnings for supplements]

    FOOD --> F1[My food library]
    FOOD --> F2[Add food: search / scan barcode / scan label / paste text]
    FOOD --> F3[Meal templates]
    FOOD --> F4[Supplement stock]

    WORK --> W1[Start workout: empty or template]
    WORK --> W2[Workout history]
    WORK --> W3[My exercise library]
```

---

## 2. Daily food logging

The everyday path. The goal is **3 taps or fewer plus the grams** for a food I've eaten before (B4), and **2 taps** to copy a meal (B3).

```mermaid
flowchart TD
    A([Open app: Today]) --> B[Tap a meal slot, e.g. Lunch]
    B --> C{How do I add it?}

    C -->|Eaten before| D[Pick from Recent / Favorites]
    C -->|Same as another meal| E[Copy meal: e.g. Lunch to Dinner]
    C -->|Usual combo| F[Use meal template]
    C -->|Type a name| G[Search my food library]
    C -->|Packaged item| H[Scan barcode]
    C -->|Many items at once| P[Paste text log]

    G --> G1{Found?}
    G1 -->|Yes| D
    G1 -->|No| NEW[[Add a new food: see section 3]]
    H --> NEW
    P --> PASTE[[Paste flow: see section 4]]

    D --> Q[Enter grams]
    Q --> SAVE[Save log entry with a snapshot of the nutrition values]
    E --> SAVE
    F --> SAVE
    NEW --> Q
    PASTE --> SAVE

    SAVE --> SUP{Is it a supplement with stock?}
    SUP -->|Yes| INV[[Subtract from container: see section 5]]
    SUP -->|No| TOT
    INV --> TOT[Update Today's totals]
    TOT --> A
```

---

## 3. Adding a new food

Every new food goes through this **once**. After that it lives in my library and the stored numbers are always used (R1). **Nothing is saved without the review step.**

```mermaid
flowchart TD
    START([New food needed]) --> TYPE{What kind?}

    TYPE -->|Packaged, has barcode| SCAN[Scan barcode]
    TYPE -->|Packaged, no barcode / not found| LABEL
    TYPE -->|Whole food: rice, eggs, taho| MANUAL

    SCAN --> L1{In my library?}
    L1 -->|Yes| DONE([Use it: back to logging])
    L1 -->|No| OFF{Found on Open Food Facts?}
    OFF -->|Yes| REVIEW
    OFF -->|No| LABEL

    LABEL[Photo of Nutrition Facts label] --> READ[App reads the values]
    READ --> CONV[Convert per serving to per 100 g]
    CONV --> REVIEW

    MANUAL[Manual form: values from FNRI / USDA / label] --> REVIEW

    REVIEW[Review form: name, cooked/raw, kcal, P, C, F per 100 g, serving size, barcode] --> OK{Values look right?}
    OK -->|Fix| REVIEW
    OK -->|Save| LIB[(My food library)]
    LIB --> DONE
```

**When each path arrives**

| Path | October v1 | November |
|------|-----------|----------|
| Manual form | ✅ | ✅ |
| Barcode + Open Food Facts | ✅ | ✅ |
| Label photo | ❌ (type it in manually) | ✅ via the .NET API and AI vision (R4) |

---

## 4. Paste my text log

This reads the same text I used to give ChatGPT, using simple rules (R3). It needs no AI and no internet.

```mermaid
flowchart TD
    A([Paste text]) --> B[Split into lines]
    B --> C{Line type?}
    C -->|Ends with ':' e.g. Lunch:| D[Set current meal slot]
    C -->|'250g white rice'| E[Read grams + food name]
    C -->|Blank / unknown| F[Skip]

    E --> G{Matched before?}
    G -->|Yes| H[Use remembered match]
    G -->|No| I{Close name in my library?}
    I -->|Yes| J[Suggest match]
    I -->|No| K[Mark as NOT FOUND]

    D --> PREV
    H --> PREV
    J --> PREV
    K --> PREV
    F --> PREV

    PREV[Preview: each line shows meal, grams, matched food, kcal] --> FIX{All lines OK?}
    FIX -->|Fix a line| PICK[Choose food or create new]
    PICK --> REM[Remember this match for next time]
    REM --> PREV
    FIX -->|Confirm| SAVE([Save all entries to the log])
```

**Example**

| Pasted line | Meal slot | Grams | Matched to |
|-------------|-----------|-------|------------|
| `Breakfast:` | Breakfast | | |
| `220g taho` | Breakfast | 220 | Taho |
| `250g boiled chicken breast` | Lunch | 250 | Chicken breast, cooked |
| `5g creatine` | Pre-Workout | 5 | Creatine monohydrate (also subtracted from stock) |

---

## 5. Supplement inventory

A supplement is a normal food (for macros) **plus** a container (for stock). Logging it does both jobs (R8).

### 5a. Normal use

```mermaid
flowchart TD
    A([Log supplement, e.g. 30 g Just Whey]) --> B[Food log entry saved: macros counted]
    B --> C[Active container: subtract 30 g]
    C --> D{Would it go below 0?}
    D -->|Yes| E[Ask: opened a new container?]
    E -->|Yes| RS[[Restock: see 5b]]
    E -->|No| F[Set to 0 and flag for check]
    D -->|No| G[Work out days left = amount left / average daily use]
    G --> H{Below warning level? e.g. 7 days}
    H -->|Yes| W[Show warning on Today: 'Just Whey ~6 days left']
    H -->|No| OK([Done])
    W --> OK
```

### 5b. Container life cycle

```mermaid
stateDiagram-v2
    [*] --> Unopened: Bought (size, price, expiry)
    Unopened --> Active: Opened / set as active
    Active --> Active: Logged use subtracts grams
    Active --> Active: Manual adjust (spill, scoop off)
    Active --> Low: Days left below warning level
    Low --> Active: Adjusted upward
    Low --> Empty: Reaches 0 g
    Active --> Empty: Marked finished
    Empty --> [*]: Kept in history (how long it lasted, cost per month)
```

**Edits and deletes:** if I delete or change a supplement log entry, the container gets the difference back (K acceptance criteria).

---

## 6. Workout session

Every set is saved **straight away**, so closing the app at the gym loses nothing (R6). "Last time" numbers are always shown (H2).

```mermaid
flowchart TD
    A([Workout tab]) --> B{Start how?}
    B -->|Template, e.g. Push| C[Exercises pre-filled]
    B -->|Empty| D[Add exercise]
    B -->|Unfinished session exists| R[Resume it]

    D --> D1{In my exercise library?}
    D1 -->|Yes| E
    D1 -->|No| D2[Create exercise: name, body part, type] --> E
    C --> E
    R --> E

    E[Exercise screen shows LAST TIME: e.g. 60 kg x 8, 8, 7] --> F{Exercise type?}
    F -->|Weights| G[Set: kg + reps, pre-filled from last set]
    F -->|Bodyweight| G2[Set: reps, optional added kg]
    F -->|Cardio| G3[Entry: minutes + optional distance]

    G --> S[Tap check: set saved immediately]
    G2 --> S
    G3 --> S
    S --> PR{Beat my best?}
    PR -->|Yes| PRB[PR badge]
    PR -->|No| T
    PRB --> T[Optional rest timer]
    T --> N{Next?}
    N -->|Another set| G
    N -->|Next exercise| E
    N -->|Add exercise| D
    N -->|Finish| FIN[Finish workout: duration, notes]
    FIN --> TPL{Save as template?}
    TPL -->|Yes| TP[(Templates)]
    TPL -->|No| H
    TP --> H([History + Today shows 'Workout done'])
```

---

## 7. Where the numbers come from

Outside sources only **fill in** my library. Totals are always worked out from **my** data, which fixes ChatGPT's "different numbers every day" and lost-memory problems.

```mermaid
flowchart LR
    subgraph Sources["Used only when adding a new food"]
        OFF[Open Food Facts]
        LBL[Label photo]
        REF[FNRI / USDA tables]
        ME[My own typing]
    end

    Sources --> REVIEW[Review and confirm]
    REVIEW --> LIB[(My food library)]
    LIB --> LOG[(Food log: snapshot per entry)]
    LOG --> TOT[Daily totals: kcal, P, C, F]
    LOG --> INV[(Supplement containers)]
    WK[(Workout sessions and sets)] --> TODAY
    TOT --> TODAY[Today screen]
    INV --> TODAY
    LOG --> HIST[History: any past day]
    WK --> HIST
```

---

## 8. How the data fits together

A conceptual view of what the app remembers. **Not a database design**; the field-level design comes later.

```mermaid
erDiagram
    FOOD ||--o{ LOG_ENTRY : "is logged as"
    MEAL_SLOT ||--o{ LOG_ENTRY : "groups"
    FOOD ||--o{ CONTAINER : "supplement stock"
    LOG_ENTRY |o--o| CONTAINER : "subtracts from"
    MEAL_TEMPLATE }o--o{ FOOD : "contains"
    TEXT_MATCH }o--|| FOOD : "remembered match"

    EXERCISE ||--o{ WORKOUT_SET : "performed as"
    WORKOUT_SESSION ||--o{ WORKOUT_SET : "contains"
    WORKOUT_TEMPLATE }o--o{ EXERCISE : "contains"

    DAY ||--o{ LOG_ENTRY : "has"
    DAY ||--o{ WORKOUT_SESSION : "has"
    DAY ||--o| BODY_WEIGHT : "has"
```

| Thing | What it holds (in plain words) |
|-------|-------------------------------|
| Food | Name, cooked/raw, brand, barcode, kcal/P/C/F per 100 g, optional serving size |
| Log entry | Day, meal slot, food, grams, **copy of the values at the time of logging** |
| Meal slot | My own names and order (Breakfast … Post-Workout) |
| Meal template | A saved group of foods + grams |
| Text match | "boiled chicken breast" → my food "Chicken breast, cooked" |
| Container | Supplement, size, grams left, price, opened date, expiry, status |
| Exercise | Name, body part, type (weights / bodyweight / cardio) |
| Workout session | Date, start/finish time, notes |
| Workout set | Exercise, set number, kg, reps (or minutes / distance for cardio) |
| Body weight | Date, kg |

---

## 9. Build timeline

Based on [plan/08](../plan/08_october_sprint.md), with the changes suggested in [01_user_story.md §5](./01_user_story.md#5-recommendations).

```mermaid
gantt
    title Build order (2026)
    dateFormat YYYY-MM-DD
    axisFormat %b %d

    section Food (v1)
    Setup, database, food library      :a1, 2026-10-19, 3d
    Food log, meal slots, Today         :a2, after a1, 2d
    Start using it daily                :milestone, m1, 2026-10-23, 0d
    Barcode + Open Food Facts           :a3, 2026-10-24, 2d
    Copy meal, macros, history, backup  :a4, after a3, 3d
    Build + release v1.0                :a5, 2026-10-29, 3d
    v1.0                                :milestone, m2, 2026-10-31, 0d

    section v1.1 (November)
    .NET API + sync                     :b1, 2026-11-01, 8d
    Paste text log + label photo scan   :b2, after b1, 4d
    Supplement inventory                :b3, after b1, 4d

    section Workouts
    Exercise library + sessions + sets  :c1, 2026-11-15, 7d
    Last time, templates, PRs, cardio   :c2, after c1, 7d
```
