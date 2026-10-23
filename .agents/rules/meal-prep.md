# Meal Prep & Tupperware Inventory Rules

## 1. Concept: Meal Prep Partitioning
Meal prep takes cooked foods already in the fridge/cooking inventory (e.g., 500g cooked chicken breast, 250g okra, 500g boiled eggs, 1kg cooked white rice) and partitions them across a specified number of tupperwares/containers using an AI prompt or equal division rule.

## 2. Meal Prep Workflow
1. **Select Cooked Foods**: Choose available cooked items and quantities from fridge inventory.
2. **Set Containers & Partition Mode**:
   - **Mode 1: Equal Split (Default · 100% Offline)**: Specify container count $N$ (e.g. 5). The app performs exact division: $\text{Grams per Box} = \text{Batch Grams} \div N$. Instant, zero-cost deterministic arithmetic.
   - **Mode 2: Manual Grams Allocation**: Specify exact grams per container for each ingredient (e.g., 120g chicken, 180g rice). Real-time tracking calculates total used and leftover grams that remain in fridge stock.
   - **Mode 3: AI Prompt (Optional)**: Natural language partition prompt (e.g. "unequal distribution: 3 high-protein workout boxes, 2 light rice rest day boxes").
3. **Partition & Macro Calculation**: Computes:
   - Grams of each cooked ingredient per tupperware.
   - Total weight per container.
   - Exact nutritional macros per container (`kcal`, `protein`, `carbs`, `fat`).
4. **Save to Meal Prep Inventory**:
   - Deducts the bulk cooked ingredients from fridge inventory.
   - Stores the result as a discrete inventory item (e.g., `5 × High-Protein Lunch Box`).
5. **1-Tap Consumption Logging**:
   - In the Food Log / Diary, user can log `"Eat 1 Tupperware / Box"`.
   - Automatically logs the full macro breakdown and decrements the remaining tupperware count in inventory (e.g., from 5 to 4).

## 3. Name / Identifier & Food Logging Resolution
- **Mandatory Batch Name/Identifier**: Each meal prep batch must have a clear name or identifier (e.g. `High-Protein Lunch Box`, `Chicken Okra Prep`, `Box A`) stored in `meal_prep_inventory`.
- **Text Log / AI Parse Syntax**:
  - Format: `<MealCategory>:\n<count> <tupperware|box|container> <MealPrepName>`
  - Example:
    ```text
    Breakfast:
    1 tupperware High-Protein Lunch Box
    ```
    or `1 box High-Protein Lunch Box`
  - When parsed, the system queries active items in `meal_prep_inventory` by name/identifier.
  - If matched, it pulls the pre-calculated per-container macros (`kcal`, `protein`, `carbs`, `fat`, net weight) and automatically flags the item for inventory decrement (`Stock: 5 → 4 boxes`).
- **1-Tap Food Diary Logging**:
  - In addition to text logging, the user can 1-tap `[Eat 1 Box]` directly from the Meal Prep Hub or from the Diary `+ Add Food` -> `🍱 Meal Prep` tab.

## 4. Prototype-First Rule
- All meal prep workflows, prompts, and inventory UI must be built and vetted in `prototypes/` first.
- Do not modify mobile app (`apps/mobile/`) code until the user explicitly requests implementation.

