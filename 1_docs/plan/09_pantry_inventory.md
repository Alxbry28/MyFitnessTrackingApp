# 09 — Pantry Inventory: Groceries, Supplements and Cooked Batches

**Created:** October 20, 2026  
**Status:** Plan, no code  
**Stories and details:** [business_analyst/user_story/04_recipes_and_pantry.md](../business_analyst/user_story/04_recipes_and_pantry.md) (Epic L pantry and groceries, Epic M recipes and batches, scenarios, math, acceptance criteria)  
**Related:** [03 outline](./03_fitness_app_outline.md) · [05 architecture](./05_architecture_outline.md) · [06 roadmap](./06_development_roadmap.md) · [08 October sprint](./08_october_sprint.md)

---

## 1. What this adds

An **inventory of the food I have at home**, tied to the nutrition tracker:

- Groceries I bought (scan barcode → saved to my library → "how many did I buy?" → in stock)
- Supplements (whey tub, creatine) counted in grams
- Home-cooked batches (chopsuey) with macros calculated from the recipe

Eating from the pantry logs the food **and** takes it out of stock in one step.

> **Core rule:** stock is not eating. Buying groceries or cooking a batch **never** adds to today's calories and macros. Only a food log entry does.

| Action | Stock | Today's macros |
|--------|-------|----------------|
| Buy groceries | ➕ | — |
| Cook a batch | ➕ batch, ➖ tracked ingredients | — |
| **Eat a portion** | ➖ | ✅ counted |
| Shared / discarded / corrected | ➖ / ± | — |
| Eat something not in the pantry | — | ✅ counted |

---

## 2. What gets tracked (and what doesn't)

Tracking every grocery is a chore that won't last. Track only what's worth it:

| Track as stock | Don't track (library only) |
|----------------|----------------------------|
| Canned goods (Gold Seas tuna, sardines) | Loose vegetables |
| Protein products (eggs, chicken packs, Greek yogurt) | Rice sack, flour, sugar |
| Supplements (whey, creatine) | Condiments, oil, spices |
| Cooked batches | One-off snacks |

Untracked foods still go in the **food library** (for logging and recipes). Adding to the pantry is always optional after a scan.

---

## 3. Phasing

### October (v1, Oct 31): no pantry features, but prepare the data layer

The sprint in `08` stays locked. **Today (Oct 20) is data-layer day**, so the only pantry work is to set up the schema so that pantry is an *additive* change later:

| Rule for Oct 20 | Why |
|-----------------|-----|
| Store product nutrition **per 100 g** (keep serving size as a separate field) | Pantry, batches and portions all compute in grams |
| `food_log_entries` keeps a **copy** of kcal/P/C/F at logging time, plus `grams` | Editing a product or settling a batch later doesn't silently rewrite history |
| Add nullable `net_weight_g` to `products` | Needed for "3 cans × 155 g" later; costs nothing now |
| Use UUID ids and `created_at` / `updated_at` on every table | Pantry movements and November sync rely on them |

### November (v1.1): build the pantry

Built **with supplements (Epic K)** because both use the same stock engine. All of it works offline in SQLite; no .NET API needed.

| Step | Scope | Stories | Exit check |
|------|-------|---------|------------|
| **P1. Pantry + groceries** | `pantry_items` + `stock_movements`; add to pantry after scan ("how many?"); restock existing product; Pantry screen; log 1 unit or grams from the pantry; remove with reason; correct amount; edits/deletes of log entries restore stock | L1, L2, L4, L6–L9 | Buy 3 cans of tuna → eat 1 → pantry shows 2; today's macros show only the 1 eaten |
| **P2. Canned and opened items** | "I eat this drained" + drained values + usual drained weight; opened can with grams left and opened date; opened before sealed | L3, L5 | Log "1 can drained" in one tap with drained values |
| **P3. Supplements** | Supplements as pantry kind *supplement* (grams) | K | Whey tub goes down 30 g per scoop logged |
| **P4. Recipes + batches** | Recipes; batch from recipe (not counted); cooked weight by settling at the end or weighing in parts; per-100 g; portions from batch; "In my pantry" first in search; cooking subtracts tracked items; paste ingredients from notes; learned cooked ratio | M1–M8, M18, M19 | Chopsuey day batch: 3 portions logged → settled → portions add up to the batch total |
| **P5. Later (Could)** | Grocery mode (scan many, save once), expiry warnings, low-stock shopping list, split into containers, portion sizes, freshness card on Today, waste report | L10–L12, M9–M17 | — |

### Proposed November order (needs your OK)

Pantry was planned as v1.1 in early November, but `08` §6 had the .NET API first. Since the pantry needs no API and you'll use it every day, the suggestion is:

| Dates | Work |
|-------|------|
| Nov 1–7 | P1 + P2: pantry and groceries |
| Nov 8–10 | P3: supplements |
| Nov 11–12 | Body progress B1: weight + BMI (see `10`) |
| Nov 13–23 | P4: recipes and batches |
| Nov 24–28 | Friends beta prep, Beta 1 on Nov 29 (see `11`) |
| Nov 30 – Dec 13 | .NET API + PostgreSQL, sync (now including pantry tables), AI meal parse + AI drained-values lookup |
| December | Workouts + body measurements and calorie stats (`10`), then finance |

This pushes workouts back about two weeks. If gym tracking matters more to you right now, keep `08` §6 as is and start the pantry after workouts.

---

## 4. Screens

Bottom tabs grow from **Today · Log · Products · Settings** to **Today · Log · Pantry · Progress · More** (More = Products, Recipes, Settings; Progress comes from `10`).

| Screen | Purpose | Step |
|--------|---------|------|
| Pantry list | Grouped: Cooked · Groceries · Supplements; amount left, opened/unsettled badges | P1 |
| Pantry item detail | Amount left, history of movements, actions: eat, remove, adjust, move to freezer | P1 |
| Add to pantry sheet | After scan/product: units, net weight (if missing), optional expiry | P1 |
| Remove / adjust sheet | Reason (Shared, Discarded, Spilled, Adjustment) + grams | P1 |
| Food search ("add to meal") | New **In my pantry** section on top | P1 |
| Product edit | Adds net weight, "eaten drained", drained values, usual drained weight | P2 |
| Recipe list + recipe edit | Ingredients with raw grams, paste from notes | P4 |
| Cook a batch | From recipe or quick batch; cooked weight method | P4 |
| Settle batch | Shows all portions, "Did you log everything?" | P4 |

---

## 5. Data model additions

Extends `03` §4. Conceptual only; see `04_recipes_and_pantry.md` §10 for the ER diagram.

### `pantry_items`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| kind | enum | `packaged`, `supplement`, `batch` |
| product_id | uuid? | for packaged / supplement |
| batch_id | uuid? | for cooked batches |
| status | enum | `sealed`, `opened`, `active`, `finished`, `discarded`, `expired` |
| location | enum | `fridge`, `freezer`, `cupboard` |
| opened_at | date? | |
| expires_at | date? | optional |
| created_at / updated_at | timestamp | |

Units and grams left are **not stored as editable numbers**; they're the sum of `stock_movements` (cached if needed for speed).

### `stock_movements` (the ledger)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| pantry_item_id | uuid | |
| occurred_at | timestamp | |
| delta_units | number? | ± cans/packs |
| delta_grams | number | ± grams |
| reason | enum | `bought`, `cooked`, `eaten`, `used_in_cooking`, `shared`, `discarded`, `spilled`, `adjustment` |
| food_log_entry_id | uuid? | set when reason = `eaten` |
| batch_id | uuid? | set when reason = `used_in_cooking` |

### `recipes`, `recipe_ingredients`, `batches`, `batch_ingredients`

| Table | Key fields |
|-------|-----------|
| recipes | name, notes, learned_cooked_ratio |
| recipe_ingredients | recipe_id, product_id, raw_grams, is_estimated |
| batches | recipe_id?, cooked_at, cooked_weight_g, weight_method (`weighed_parts`, `settled`, `estimated`), is_settled, kcal/P/C/F per 100 g |
| batch_ingredients | batch_id, product_id, raw_grams, **copy** of values per 100 g, is_estimated |

### Changes to existing tables

| Table | New fields |
|-------|-----------|
| products | `net_weight_g`, `label_basis` (as packed / per serving), `eaten_drained`, drained kcal/P/C/F per 100 g, `usual_drained_g`, `track_in_pantry` (default) |
| food_log_entries | `pantry_item_id?`, `grams`, copied values, `updated_by_settle` flag |

---

## 6. Definition of done for the pantry (v1.1)

- [ ] Scan tuna → "add 3" → pantry shows 3 cans (465 g); today's macros unchanged
- [ ] Log 1 can drained from Lunch → drained values counted, pantry shows 2
- [ ] Delete that log entry → pantry back to 3
- [ ] Remove 200 g of a batch as *Shared* → no macros counted
- [ ] Whey tub goes down per scoop logged
- [ ] Cook chopsuey from a saved recipe → batch in pantry, today's macros unchanged
- [ ] Day batch settled → its portions add up to the batch total
- [ ] Search when adding food shows **In my pantry** first
- [ ] JSON export includes pantry, movements, recipes and batches

---

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Data entry fatigue (tracking too much) | Track only the list in §2; pantry is always optional after a scan |
| Stock drifts from reality | "Adjust" sets the real amount; difference saved as an adjustment, never as eaten |
| Settling a batch rewrites past days | Only that batch's portions change, with a note on those days (BA decision D7) |
| Schema not ready on Oct 20 | Follow the four rules in §3 today; everything else is additive |
| November scope creep | P5 items stay parked until P1–P4 have been used for a week |

---

## 8. Open questions

| # | Question | Default if no answer |
|---|----------|----------------------|
| Q8 | Which groceries are worth tracking? | The §2 list |
| Q10 | Screen name: Pantry, Kitchen or Ref? | **Pantry** |
| Q-N1 | Approve the November order in §3 (pantry before .NET API and workouts)? | Use the proposed order |
| Q-N2 | Track **price** and store per grocery trip? (Useful for the finance app later) | Not now; can be added as optional fields on `bought` movements |
| Q6, Q7, Q12 | Meal prep containers, sharing with family, cooking oil in the Oct 19 batch | See `04_recipes_and_pantry.md` §12 |
