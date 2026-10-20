# UX Flows

**Date:** October 20, 2026
**Status:** Draft. v1 flows follow the locked sprint; later flows are summaries until their feature is specced
**Related:** [PRD](./PRD.md) · [Design system](./DESIGN_SYSTEM.md) · [Database](./DATABASE.md) · [BA workflow diagrams](./business_analyst/user_story/02_workflow_diagrams.md)

---

## 1. Screen map

```mermaid
flowchart TB
    subgraph Tabs["Bottom tabs (v1)"]
        T[Today]
        L[Log]
        P[Products]
        S[Settings]
    end

    T --> ADD[Add to meal sheet]
    T --> SCAN[Scanner]
    L --> ADD
    L --> EDIT[Edit entry sheet]
    P --> PF[Product form]
    P --> SCAN
    SCAN --> PREV[Open Food Facts preview]
    SCAN --> PF
    PREV --> ADD
    PF --> ADD
    S --> GOAL[Calorie goal]
    S --> EXP[Export backup]
```

| Route (Expo Router) | Screen | Feature |
|---------------------|--------|---------|
| `src/app/(tabs)/index.tsx` | Today | 3, 6 |
| `src/app/(tabs)/log.tsx` | Log (by day) | 2, 7 |
| `src/app/(tabs)/products.tsx` | Product library | 1 |
| `src/app/(tabs)/settings.tsx` | Settings | 3, 7 |
| `src/app/scan.tsx` | Scanner (full screen modal) | 4, 5 |
| `src/app/product/[id].tsx` | Product form (new or edit) | 1, 5 |
| `src/app/add/[productId].tsx` | Add to meal sheet | 2 |

Routes are relative to `apps/mobile/`. Route names are *Proposed*; final names are set in each feature spec.

## 2. Daily logging (v1)

Target: a repeat food in **≤ 3 taps plus grams**.

```mermaid
flowchart TD
    A([Open app: Today]) --> B{How to add?}
    B -->|Eaten recently| R[Tap a Recent or Favorite chip]
    B -->|Know the name| S[Search the library]
    B -->|Packaged item| SC[[Scan: section 3]]
    S --> F{Found?}
    F -->|Yes| PICK[Pick product]
    F -->|No| NEW[[Add a product: section 4]]
    R --> SHEET
    PICK --> SHEET[Add to meal sheet:<br/>meal + grams, live kcal]
    NEW --> SHEET
    SC --> SHEET
    SHEET --> SAVE[Save entry with copied values]
    SAVE --> TOT[Today totals update]
```

**Logic**

| Step | Rule |
|------|------|
| Default meal | Pre-select by time of day: before 10:30 breakfast, before 15:00 lunch, before 20:00 dinner, else snack (*Proposed*) |
| Default grams | The last grams used for this product, else its serving size in grams, else 100 |
| Save | `kcal = kcal_per_100g * grams / 100`, same for P, C, F. Values are **copied** onto the entry (ADR-6) |
| Recents | Distinct products logged in the last 7 days, newest first |

## 3. Scan to logged (v1)

Target: **< 30 s**.

```mermaid
flowchart TD
    A([Tap Scan]) --> P{Camera permission?}
    P -->|Denied| D[Explain + Open settings<br/>or Enter manually] --> M
    P -->|Granted| B[Read barcode, haptic tick]
    B --> C{In my library?}
    C -->|Yes| SHEET[Add to meal sheet]
    C -->|No| ON{Online?}
    ON -->|No| M[Product form,<br/>barcode prefilled]
    ON -->|Yes| OFF[Fetch Open Food Facts]
    OFF --> F{Found with kcal?}
    F -->|Yes| PRE[Preview: values per 100 g,<br/>Open Food Facts badge] --> E{Edit?}
    E -->|Save as is / after edits| LIB[(Save to library)]
    F -->|No, error, or timeout| M
    M --> LIB
    LIB --> SHEET
    SHEET --> LOG([Entry saved])
```

| Case | Behavior |
|------|----------|
| Same barcode scanned twice quickly | Ignore reads for 2 s after a hit |
| Open Food Facts timeout | 8 s timeout, then the manual form with an `OfflineNotice` |
| Found but no kcal | Treat as not found; prefill name and brand only |
| Values per serving only | Convert to per 100 g using serving grams when present; else show the manual form with a note |

## 4. Add or edit a product (v1)

```mermaid
flowchart LR
    A([New or Edit]) --> F[Product form]
    F --> V{Valid?}
    V -->|No| ERR[Inline errors] --> F
    V -->|Yes| S[(Save product)]
    S --> N[Future logs use new values;<br/>past entries unchanged]
```

Validation: name required; kcal per 100 g required, 0-900; P, C, F optional, 0-100 each; barcode digits only, unique in the library.

## 5. Edit or delete an entry (v1)

```mermaid
flowchart LR
    A[Tap entry] --> E[Edit sheet: grams, meal]
    E --> S[Save: recompute copied values<br/>from the entry's stored per-100 g copy]
    A2[Swipe / long-press] --> D[Delete] --> U{Undo within 5 s?}
    U -->|Yes| R[Restore entry]
    U -->|No| G[Gone]
```

Editing grams scales the entry's own stored values; it never re-reads the product, so history stays fixed.

## 6. Day navigation and export (v1)

- Log screen: `‹ date ›` changes the day; tapping the date opens a picker; "Today" returns.
- Settings → Export: build one JSON file (see [DATABASE.md](./DATABASE.md) §6), write it to the cache directory, open the share sheet. Show the file size and row counts on success.

## 7. Set the calorie goal (v1)

Settings → Calorie goal → number input (800-6000) → save → Today recalculates remaining. Until a goal is set, Today shows eaten only, with a "Set your goal" prompt.

## 8. Later flows (summaries)

Each becomes a full flow in its `/feature` spec.

| Flow | Feature | Summary |
|------|---------|---------|
| Add groceries to pantry | 8 | After scan or save: "Add to pantry?" → units → `bought` movement. Stock only, no calories |
| Eat from pantry | 8 | Pantry item → Eat → grams → creates a food log entry **and** an `eaten` movement in one transaction |
| Edit or delete a pantry log | 8 | Changing or deleting the entry adjusts or reverses its movement |
| Opened can | 9 | First eat from a sealed can marks it opened; grams left tracked |
| Supplement scoop | 10 | Log 30 g whey → container down 30 g; days-left estimate |
| Cook a batch | 12 | Recipe → raw grams → batch (not counted) → portions logged → settle cooked weight → per-100 g fixed |
| Log weight | 11 | Today shortcut or Progress → kg → trend and BMI update |
| First run | 13 | Goal, units, height, sex, birth date, BMI scale → app opens on Today |
| Restore backup | 14 | Pick file → validate version → preview counts → confirm → replace or merge (decide in spec) |
| AI meal parse | 18 | Paste text → API parses → preview lines matched to my products → fix unmatched → confirm → save. Nothing saved without confirm |
| Workout session | 19 | Start → pick exercise (illustration from `@bryllim/workout-guide`) → sets with "Last: 60 kg × 8" hints → finish |

See the BA diagrams for detailed pantry, supplement, paste and workout logic: [`02_workflow_diagrams.md`](./business_analyst/user_story/02_workflow_diagrams.md).

## 9. Logic map

Where each user action lands in the code and data.

| Action | Screen | Service / hook | Repository | Tables written |
|--------|--------|----------------|------------|----------------|
| Add product | Product form | `productSchema` | `productRepo.create` | `products` |
| Edit product | Product form | `productSchema` | `productRepo.update` | `products` |
| Scan hit | Scanner | `useBarcodeLookup` | `productRepo.findByBarcode` | - |
| Open Food Facts save | Preview | `openFoodFacts.fetch`, `normalizePer100g` | `productRepo.create` | `products` |
| Log food | Add to meal | `nutritionCalc.forGrams` | `foodLogRepo.create` | `food_log_entries` |
| Edit entry | Edit sheet | `nutritionCalc.rescale` | `foodLogRepo.update` | `food_log_entries` |
| Delete entry | Log | - | `foodLogRepo.softDelete` | `food_log_entries` |
| Today totals | Today | `useDayTotals`, `nutritionCalc.sum` | `foodLogRepo.listByDay` | - |
| Recents | Today | `useRecentProducts` | `foodLogRepo.recentProducts` | - |
| Favorite | Products | - | `productRepo.setFavorite` | `products` |
| Set goal | Settings | `goalSchema` | `settingsRepo.set` | `settings` |
| Export | Settings | `backupService.export` | all repos (read) | - |

Names are *Proposed* and follow [CODE_STYLE.md](./CODE_STYLE.md).
