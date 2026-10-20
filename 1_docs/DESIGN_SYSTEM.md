# Design System

**Date:** October 20, 2026
**Status:** Proposed. No visual style has been chosen yet; these tokens are a starting point to accept or change
**Related:** [PRD](./PRD.md) · [UX flows](./UX_FLOWS.md) · [Code style](./CODE_STYLE.md) · [05 §11 cross-cutting](./plan/05_architecture_outline.md)

---

## 1. Principles

| Principle | In practice |
|-----------|-------------|
| **Numbers first** | Calories and grams are the biggest text on a screen. Labels are secondary |
| **Fast over pretty** | The primary action is always reachable with the thumb; no confirmation dialogs for undoable actions |
| **Calm, not alarming** | Going over the goal is information, shown in a warning tone, never in red error styling |
| **Honest data** | Estimates are labeled. Unverified values (AI, Open Food Facts) carry a badge until edited |
| **One system, two themes** | Every color is a token with light and dark values. Follow the system theme |

Until Oct 28 the sprint rule is "ugly is fine": use the tokens below, but skip polish.

## 2. Implementation

- Tokens live in `src/lib/theme/` as typed constants, plus a `useTheme()` hook that picks light or dark from `useColorScheme()`.
- Components read tokens only. No raw hex values, font sizes or spacing numbers in screens.
- Styling uses `StyleSheet.create`. NativeWind is an option after v1 (`tech_lead/02` §4). If adopted, it maps to these same tokens.

```ts
// src/lib/theme/tokens.ts (shape, not final values)
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;
```

## 3. Color tokens

Contrast targets: body text at least 4.5:1 on its background; large numbers and icons at least 3:1.

### Core

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `bg` | `#F7F8FA` | `#0B0F14` | Screen background |
| `surface` | `#FFFFFF` | `#151B23` | Cards, sheets, list rows |
| `surfaceAlt` | `#EEF1F5` | `#1E2631` | Input fields, pressed rows |
| `border` | `#E2E6EC` | `#263040` | Dividers, card outlines |
| `text` | `#111827` | `#F3F4F6` | Primary text and numbers |
| `textMuted` | `#4B5563` | `#9CA3AF` | Labels, secondary info |
| `primary` | `#0F766E` | `#2DD4BF` | Main actions, active tab, progress fill |
| `onPrimary` | `#FFFFFF` | `#042F2E` | Text on `primary` |
| `focus` | `#2563EB` | `#60A5FA` | Focus outline |

### Status

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `success` | `#15803D` | `#4ADE80` | Saved, under goal |
| `warning` | `#B45309` | `#FBBF24` | Over goal, low stock, unverified values |
| `danger` | `#B91C1C` | `#F87171` | Destructive actions, failed save |
| `info` | `#1D4ED8` | `#93C5FD` | Offline notice, hints |

### Macros (charts, chips, progress bars)

| Token | Light | Dark |
|-------|-------|------|
| `kcal` | `#0F766E` | `#2DD4BF` |
| `protein` | `#2563EB` | `#60A5FA` |
| `carbs` | `#D97706` | `#FBBF24` |
| `fat` | `#9333EA` | `#C084FC` |

Never rely on color alone: macro chips always show a letter or label (P, C, F).

## 4. Typography

The platform font (Roboto on Android). Numbers use tabular figures (`fontVariant: ['tabular-nums']`) so totals don't jump.

| Token | Size / line height | Weight | Use |
|-------|--------------------|--------|-----|
| `display` | 40 / 44 | 700 | Calories remaining on Today |
| `title` | 22 / 28 | 700 | Screen titles |
| `heading` | 17 / 22 | 600 | Section and card headers, meal names |
| `body` | 15 / 22 | 400 | Default text |
| `bodyStrong` | 15 / 22 | 600 | Numbers in rows (kcal, grams) |
| `caption` | 13 / 18 | 400 | Per-100 g labels, sources, timestamps |
| `overline` | 12 / 16 | 600, uppercase | Group labels ("RECENT", "FAVORITES") |

Support Android font scaling up to 1.3x without clipping. Let rows grow taller rather than truncating numbers.

## 5. Spacing, shape and elevation

| Token | Value | Use |
|-------|-------|-----|
| `space.xs` | 4 | Icon to label |
| `space.sm` | 8 | Inside chips, between stacked labels |
| `space.md` | 12 | List row vertical padding |
| `space.lg` | 16 | Screen side gutter, card padding |
| `space.xl` | 24 | Between sections |
| `space.xxl` | 32 | Top of empty states |
| `radius.sm` | 6 | Chips, badges |
| `radius.md` | 10 | Inputs, buttons, cards |
| `radius.lg` | 16 | Bottom sheets |
| `radius.pill` | 999 | Macro chips, segmented controls |

Elevation: cards use a 1 px `border` in both themes instead of shadows. Bottom sheets and the scan button may use Android elevation 4.

Touch targets: **48 x 48 dp minimum**, including icon buttons and list-row actions.

## 6. Components

| Component | Anatomy | Notes |
|-----------|---------|-------|
| `CalorieSummary` | `display` remaining kcal, progress bar (eaten / goal), eaten and goal captions | Over goal: bar full in `warning`, text "N kcal over" |
| `MealSection` | `heading` meal name, subtotal kcal on the right, entry rows, "Add" row | Collapsed when empty, showing only "Add food" |
| `EntryRow` | Product name, grams `caption`, kcal `bodyStrong` | Tap to edit grams; swipe or long-press to delete with Undo snackbar |
| `ProductRow` | Name, brand `caption`, kcal per 100 g, favorite star | Source badge when unverified |
| `MacroChips` | P / C / F pills with grams | Uses macro tokens plus letters |
| `GramsInput` | Numeric keypad, unit suffix "g", live kcal preview | Autofocus; the save button sits above the keyboard |
| `ScanButton` | Floating primary button with barcode icon | On Today and Products |
| `ScannerView` | Full-screen camera, framing guide, torch toggle, "Enter manually" | Haptic tick on read |
| `ProductForm` | Name, brand, barcode, per-100 g fields, serving size, source | `react-hook-form` + `zod`; inline errors under fields |
| `SourceBadge` | "Open Food Facts", "Manual", "AI estimate" | `warning` tone until the user edits or confirms |
| `EmptyState` | Icon, one sentence, one primary action | e.g. "No food logged yet. Scan or search to add." |
| `Snackbar` | Message plus an optional Undo | Delete and save feedback; never blocks |
| `OfflineNotice` | `info` banner | Shown only when an online action falls back |
| `DayNavigator` | Previous / date / next, tap date for a picker | "Today" shortcut when on another day |

Icons: Lucide or `@expo/vector-icons` (`tech_lead/02` §12). Every icon-only button has an `accessibilityLabel`.

## 7. Layouts

### Today (v1)

```text
┌──────────────────────────────┐
│ Today            ‹  Oct 23  › │  title + DayNavigator
├──────────────────────────────┤
│        1,240 kcal left        │  CalorieSummary (display)
│ ███████████░░░░░░░░░░░░░░░░░ │
│ Eaten 760        Goal 2,000   │
├──────────────────────────────┤
│ RECENT                        │  overline
│ [Eggs] [Greek yogurt] [Whey]  │  one-tap chips
├──────────────────────────────┤
│ Breakfast              420    │  MealSection
│  Taho · 220 g          198    │  EntryRow
│  Eggs · 100 g          155    │
│  + Add food                   │
│ Lunch                  340    │
│ Dinner                    -   │
│ Snack                     -   │
│                     ( ▣ Scan )│  ScanButton
├──────────────────────────────┤
│ Today  Log  Products Settings │  tabs
└──────────────────────────────┘
```

### Add to meal (sheet)

```text
┌──────────────────────────────┐
│ Gold Seas Tuna      [Manual]  │
│ 180 kcal / 100 g              │
│ Meal: (B) (L) (D) (S)         │  segmented
│ Grams: [ 155 ] g              │  GramsInput
│ = 279 kcal · P 40 C 0 F 13    │  live preview
│ [        Add to Lunch       ] │  primary
└──────────────────────────────┘
```

### Tab bar

v1: **Today · Log · Products · Settings**. v1.1 *Proposed*: **Today · Log · Pantry · Progress · More** (`09` §4). Open: BA recommendation R9 suggests three tabs.

## 8. Motion and feedback

- Haptic tick on a barcode read and on save.
- Keep animations under 200 ms. Respect the "remove animations" accessibility setting.
- Optimistic UI: rows appear immediately after a local save. Failures show a `danger` snackbar and roll back.

## 9. Content style

- Units: `kcal`, `g`, `kg`, `cm`, with a space before the unit ("155 g"). Whole numbers for kcal; grams to one decimal only when below 10.
- Thousands separators in kcal ("1,240").
- Sentence case for labels and buttons ("Add food", not "Add Food").
- Labels say what happens: "Add to Lunch", "Save product", "Delete entry".
- Disclaimer copy for body stats: "Estimate, not medical advice."

## 10. Open items

- Accept or change the palette (teal primary is a placeholder).
- App icon and name (name is still a draft, `business_analyst/user_story/03`).
- NativeWind after v1: yes or no.
- Final tab structure (PRD Q2).
