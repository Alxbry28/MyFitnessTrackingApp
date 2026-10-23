# Cooking & AI Ingredient Parsing Rules

## 1. Terminology: "Cooking" instead of "Recipes"
- The feature, routes, and UI concept previously called "Recipes" is now named **Cooking** (Cooking & Cooked Batches).
- In UI screens, navigation tabs, Hub menus, and documentation, refer to this as **Cooking** (e.g., `Cooking`, `Cook a batch`, `Saved dishes / cooking`).

## 2. Cooking Workflow (Total cooked weight at the end)
The cooking workflow strictly follows this sequence:
1. **New dish**: Enter or select a dish name.
2. **List ingredients**: Input raw ingredients using natural text / messy notes with AI parsing (extracts raw weights, units, nutrition, oil check, pantry matches). Cooked weight is NOT entered here.
3. **Start cooking**: Initiate the cooking batch with an **active cooking timer** (featuring `Start`, `Pause`/`Resume`, and `Finish` buttons, following the workout logger timer pattern). Tracks cooking duration, locks raw batch, and deducts tracked pantry ingredients.
4. **Encode total cooked food**: At the end of cooking (when Finish is tapped), the user weighs the entire finished batch on a scale and inputs the total cooked weight (grams).
5. **Give estimated macros**: App calculates the full batch macros, the raw-to-cooked ratio, and the exact per-100g cooked macros (`kcal`, `protein`, `carbs`, `fat`).
6. **Save this meal for inventory**: The finished cooked meal is saved into the fridge / pantry inventory with total available grams, ready to log individual portions later.

## 3. AI Ingredient Parsing for Cooking
- Ingredient logging in Cooking must support **AI parsing**:
  - Users can input messy, unstructured raw ingredient notes.
  - The AI parses out raw ingredient names, raw grams/quantities, units, nutritional breakdown per ingredient and total raw batch, and cooking oil detection/warnings.
  - Manual adjustment of parsed items must always remain available.

## 4. Prototype-First Workflow
- Major UX changes must be updated and verified in the **HTML prototypes** (`prototypes/`) first.
- Do not implement or modify `apps/mobile/` code for Cooking until explicitly requested and approved by the user.
