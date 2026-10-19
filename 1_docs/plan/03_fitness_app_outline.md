# 03 — Fitness App Outline

Covers **calorie / nutrition tracking** (with barcode scanner) and **workout / strength tracking**, including AI-assisted logging.

Parent context: [01_project_plan.md](./01_project_plan.md) · Tech: [02_technology_recommendations.md](./02_technology_recommendations.md)

---

## 1. Module overview

```
Fitness
├── Dashboard (today's calories, workout status)
├── Nutrition
│   ├── Food log (meals / snacks)
│   ├── Barcode scanner
│   ├── Product library (your saved groceries)
│   └── Daily goals (calories, optional macros)
├── Pantry (v1.1, see 09)
│   ├── Groceries in stock (scan → how many?)
│   ├── Supplements (grams left)
│   └── Recipes + cooked batches
├── Progress (v1.1, see 10)
│   ├── Body weight + trend, BMI, waist-to-height
│   ├── Body measurements (arms, chest, waist, legs…)
│   └── Calorie stats (averages, TDEE, suggested target)
├── Workouts
│   ├── Workout log (session)
│   ├── Exercise library
│   └── History & progress
└── AI Assistant (optional entry point)
```

---

## 2. User stories

### Nutrition

| ID | Story | Priority |
|----|-------|----------|
| N1 | As a user, I scan a product barcode and see nutritional info so I can log it quickly | Must-have |
| N2 | As a user, I save products I buy often so I do not rescan every time | Must-have |
| N3 | As a user, I log food to breakfast/lunch/dinner/snacks with quantity | Must-have |
| N4 | As a user, I see remaining calories for today vs my goal | Must-have |
| N5 | As a user, I edit wrong nutritional facts for a saved product | Should-have |
| N6 | As a user, I duplicate yesterday's meal | Should-have |
| N7 | As a user, I track protein/carbs/fat in addition to calories | Nice-to-have |
| N8 | As a user, I take a photo of a meal and AI estimates calories | Future |

### Pantry (inventory)

Full stories: Epic L (pantry and groceries) and Epic M (recipes and batches) in [04_recipes_and_pantry.md](../business_analyst/user_story/04_recipes_and_pantry.md). Plan: [09_pantry_inventory.md](./09_pantry_inventory.md).

| ID | Story | Priority |
|----|-------|----------|
| L1 | As a user, I add scanned groceries to my pantry with how many units I bought | Should-have |
| L4 | As a user, I log food from my pantry and the stock goes down by the same amount | Should-have |
| L7 | As a user, I remove stock without eating it (shared, discarded) and it never counts toward my macros | Should-have |
| M2 | As a user, I log a cooked batch from a recipe without it counting toward today's macros | Should-have |
| M5 | As a user, I log a portion in grams from a batch | Should-have |

### Body progress

Full plan and stories (Epic J extended, J5–J16): [10_body_progress.md](./10_body_progress.md).

| ID | Story | Priority |
|----|-------|----------|
| J1 | As a user, I log my body weight and see a 7-day trend | Should-have |
| J6 | As a user, I see my BMI and category, together with waist-to-height | Should-have |
| J8 | As a user, I log arm, chest, waist, thigh and other measurements in one session | Should-have |
| J9 | As a user, I see how each measurement changed since I started | Should-have |
| J11 | As a user, I see weekly calorie and protein averages | Should-have |
| J12 | As a user, I see my estimated maintenance calories, learned from my own data | Should-have |

### Workouts

| ID | Story | Priority |
|----|-------|----------|
| W1 | As a user, I start a workout and add exercises with sets, reps, and weight | Must-have |
| W2 | As a user, I see my last performance for an exercise when logging | Must-have |
| W3 | As a user, I browse my exercise library | Must-have |
| W4 | As a user, I view workout history by date | Must-have |
| W5 | As a user, I use workout templates (e.g. Push Day) | Should-have |
| W6 | As a user, I see charts for strength progress per exercise | Nice-to-have |
| W7 | As a user, AI suggests a workout based on my history | Nice-to-have |
| W8 | As a user, I track cardio (duration, distance) | Future |

### AI (Fitness)

| ID | Story | Priority |
|----|-------|----------|
| A1 | As a user, I type “2 eggs and toast” and AI proposes a log entry I confirm | Should-have |
| A2 | As a user, I ask “how many calories left today?” | Should-have |
| A3 | As a user, AI suggests meals fitting my remaining macros | Nice-to-have |

---

## 3. Screens (wireframe-level)

| Screen | Purpose | v1? |
|--------|---------|-----|
| Fitness Home | Summary: calories in/out, today's workout | Yes |
| Daily food log | List meals; add food | Yes |
| Barcode scanner | Camera scan → product detail | Yes |
| Product detail | Edit serving, nutrition, save to log | Yes |
| Product library | Search saved products | Yes |
| Add / edit product | Manual product when scan fails | Yes |
| Goals settings | Daily calorie target (+ macros later) | Yes |
| Start workout | Pick template or empty session | Yes |
| Active workout | Add sets, rest timer optional | Yes |
| Exercise picker | Search/create exercise | Yes |
| Workout history | Past sessions list | Yes |
| Workout detail | Exercises and sets for one session | Yes |
| Progress charts | Volume/weight over time | Later |
| AI chat | Natural language logging | v1.1 |
| Pantry list / item detail | What I have at home and its history | v1.1 (see 09 §4) |
| Progress (weight, BMI, measurements, calorie stats) | Body and calorie trends | v1.1 (see 10 §9) |
| Recipes / cook a batch | Recipe ingredients, cooked weight | v1.1 (see 09 §4) |

---

## 4. Data entities (conceptual)

### `products`

Personal grocery / food items (from barcode or manual).

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| barcode | string? | nullable for manual items |
| name | string | |
| brand | string? | |
| serving_size | string | e.g. "100g", "1 cup" |
| calories_per_serving | number | |
| protein_g | number? | |
| carbs_g | number? | |
| fat_g | number? | |
| source | enum | `open_food_facts`, `manual`, `ai_estimate` |
| created_at | timestamp | |

### `food_log_entries`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| logged_at | date/time | |
| meal_type | enum | breakfast, lunch, dinner, snack |
| product_id | uuid? | or custom name |
| quantity | number | servings |
| calories | number | computed |
| notes | string? | |

### `daily_nutrition_goals`

| Field | Type |
|-------|------|
| user_id | uuid |
| calorie_target | number |
| protein_target_g | number? |
| effective_date | date |

### Pantry tables

`pantry_items`, `stock_movements`, `recipes`, `recipe_ingredients`, `batches`, `batch_ingredients`, plus new fields on `products` and `food_log_entries`. See [09 §5](./09_pantry_inventory.md#5-data-model-additions).

> **Note:** store product nutrition **per 100 g** and copy values onto each log entry (09 §3), so the pantry can be added later without migrating history.

### Body progress tables

`body_profile`, `body_weight_entries`, `measurement_sessions`, `body_measurements`. BMI, trends and TDEE are calculated. See [10 §8](./10_body_progress.md#8-data-model-additions).

### `exercises`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| name | string | e.g. "Bench Press" |
| muscle_group | string? | chest, legs, etc. |
| equipment | string? | |

### `workout_sessions`

| Field | Type |
|-------|------|
| id | uuid |
| started_at | timestamp |
| ended_at | timestamp? |
| name | string? |
| notes | string? |

### `workout_sets`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| session_id | uuid | |
| exercise_id | uuid | |
| set_number | int | |
| reps | int? | |
| weight_kg | number? | |
| duration_sec | int? | for timed exercises |
| rpe | number? | optional effort |

---

## 5. Barcode scanner flow

```
[Scan barcode]
      │
      ├─► Found in local products ──► Product detail ──► Add to log
      │
      ├─► Not local ──► Open Food Facts API
      │                      │
      │                      ├─► Hit ──► Preview ──► Save to products + log
      │                      └─► Miss ──► Manual product form
      │
      └─► User cancels
```

**UX notes**

- Vibrate on successful scan  
- Show last scanned product for quick re-add  
- Allow “favorite” products on home  

---

## 6. Workout logging flow

```
[Start workout]
      │
      ▼
[Add exercise] ──► Pick from library or create new
      │
      ▼
[Log sets] ──► Show previous: "Last: 60kg x 8"
      │
      ▼
[Complete workout] ──► Save session
      │
      ▼
[History] ──► View / duplicate as template (later)
```

---

## 7. AI integration points

| Feature | Input | AI output | User action |
|---------|-------|-----------|-------------|
| Meal parse | Free text | `{ items, meal_type, calories }` | Confirm / edit |
| Nutrition Q&A | Question + today's log context | Text answer | Read only |
| Workout suggest | Goal + recent history | Exercise list | Add to session |

**v1:** Skip AI or ship only meal text parse in v1.1.

---

## 8. Metrics & dashboard (Fitness Home)

| Widget | v1 | Later |
|--------|----|-------|
| Calories eaten / goal | Yes | |
| Meal list shortcut | Yes | |
| Quick-add favorite food | Should-have | |
| Workout streak | | Yes |
| Weekly calorie chart | | Yes (10 B3) |
| Weight trend + log weight shortcut | | Yes (10 B1) |
| BMI / measurements card | | Yes (10 B1–B2) |
| PR highlights | | Yes |

---

## 9. v1 scope boundary (recommended)

**In v1**

- Barcode scan + manual product + food log  
- Daily calorie goal and remaining calories  
- Workout session with exercises, sets, reps, weight  
- Exercise library (create + reuse)  
- Workout history list  

**Defer to v1.1+**

- Macro tracking  
- Templates and duplicate meal  
- AI meal parsing  
- Charts and PR tracking  
- Photo-based meal AI  
- Pantry inventory, recipes and cooked batches (v1.1, see `09`)  
- Body weight, BMI, measurements and calorie stats (v1.1, see `10`)  

---

## 10. Open questions

- [ ] Units: kg vs lbs (recommend **user setting**, default based on locale)  
- [ ] Meal structure: fixed 4 meals vs custom meal slots  
- [ ] Integrate with Apple Health / Google Fit? (Future)  
- [ ] Rest timer between sets in v1? (Nice-to-have)
