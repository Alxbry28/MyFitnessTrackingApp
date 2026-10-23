# Feature: Progress and History Calendar

**From build-plan:** feature 31
**Build attempt:** 1
**Branch:** feature/progress-and-history-calendar

## Goal

Provide a monthly calendar view in the Progress tab (`prototypes/current/calendar.html` and `progress.html`) that consolidates daily nutrition intake, calorie target adherence, weigh-ins, workouts, and pantry events into an interactive month grid with daily stats and an inspection day sheet.

## Design reference

Matches `prototypes/current/calendar.html` and `prototypes/current/progress.html`:
- **Segmented Control** on Progress screen (`progress.html` line 124):
  - Segmented toggle `[ Overview | Calendar ]` with active pill on `surface`, inactive on `surface-2`.
  - Overview renders the existing weight trend, BMI, Calorie Stats & TDEE card, and body measurements.
  - Calendar renders the month calendar hub.
- **Calendar Hub** (`calendar.html` Frame 1):
  - **Month Nav**: `‹` Month Year `›` (`monthnav` flex header).
  - **Filter Chips**: Tight chip row: `All`, `Food`, `Body`, `Pantry`, `Workouts`.
  - **3-up Monthly Stats** (`stats3`):
    - `Daily avg`: average calories across logged days in the month (`XXXX kcal`).
    - `On target`: count of on-target days over total logged days (e.g. `11 / 18`).
    - `Weigh-ins`: count of days with weigh-ins (e.g. `13 days`).
  - **Day Grid** (`dow` + `grid` 7 columns Mon-Sun):
    - DOW labels: `M`, `T`, `W`, `T`, `F`, `S`, `S`.
    - Day cell:
      - Day number (bold text, highlighted pill & border if today).
      - Subtext: kcal (e.g. `2.2k`) in All/Food view; weight (e.g. `74.2`) in Body view.
      - Bottom bar indicator:
        - Green (`ok`): on-target (within target threshold).
        - Red (`over`): over calorie target (> target + 50 kcal).
        - Amber (`low`): under target (> 300 kcal below target).
      - Markers: indicator dots/icons for logged food, weigh-in, workout, batch cooking, and pantry movement.
- **Day Sheet Modal** (`calendar.html` Frame 2):
  - Slide-up bottom sheet when a day is tapped.
  - Displays selected date header.
  - Event rows:
    - Food log summary with total kcal, P/C/F, and a "Go to Log ›" action that jumps directly to that date in the Log tab.
    - Weigh-in log if present (weight in kg and delta).
    - Workout session if completed on that day.
    - Cooking / pantry stock activity if present.

## In scope

1. **Calendar Module Types & Repository** (`apps/mobile/src/modules/calendar/`):
   - SQLite queries combining daily data for the selected month:
     - `food_log_entries`: total kcal and macros per day.
     - `body_weight_entries`: logged weight per day.
     - `workout_sessions`: completed sessions per day.
     - `stock_movements`: pantry movement counts per day.
     - User calorie goal to calculate daily adherence.
2. **Month Calculations & State Hook**:
   - Calculate calendar grid days including leading blank days (Mon–Sun alignment).
   - Monthly aggregate stats: average daily calories, on-target ratio, weigh-in count.
   - Month navigation (previous/next month, bounding to current month as max or allowing browsing past).
   - Filter mode handling (`all`, `food`, `body`, `pantry`, `workouts`).
3. **Calendar UI Components**:
   - `MonthNav`: month switcher with previous and next buttons.
   - `MonthlyStats3`: 3 metric cards.
   - `FilterChips`: filter selector.
   - `CalendarGrid`: 7-column grid with day cell rendering, adherence bars, and markers.
   - `DayEventsSheet`: bottom modal showing detailed events for the selected day with navigation to that day's food log.
4. **Progress Screen Integration**:
   - Add segmented control `[ Overview | Calendar ]` to `apps/mobile/src/app/(tabs)/progress.tsx`.
   - Preserve existing overview screen exactly when `Overview` is active.
5. **Log Screen DayNavigator Connection**:
   - In `apps/mobile/src/modules/nutrition/components/DayNavigator.tsx`:
     - Allow tapping the "tap for calendar" subtitle / date center to switch to the Calendar view with that month selected.

## Out of scope (Prototype Gaps)

- Sync with external Google Calendar or Apple Calendar.
- Drag-and-drop meal rescheduling.
- Editing workout sets directly inside the calendar day sheet (opens log or workout history instead).

## Build loop

- Step review: `feature` (one consolidated review packet after all steps).
- Checkpoint commits: `disabled`.
- Verify command: `cmd.exe /c npm run typecheck`.

## Build steps

1. **Step 1: Calendar Data Repository & Types**
   - Create `apps/mobile/src/modules/calendar/types/calendar.ts` defining month summary, day cell data, event items, and filters.
   - Create `apps/mobile/src/modules/calendar/repositories/calendarRepo.ts` with queries for monthly food, weight, workouts, pantry movements, and adherence.
   - *Done when:* TypeScript compiles cleanly with `cmd.exe /c npm run typecheck` and data contracts are established.

2. **Step 2: Calendar Month Calculations & Hook**
   - Create `apps/mobile/src/modules/calendar/services/calendarCalc.ts` with grid generation (padding days, Mon-Sun) and monthly aggregation math.
   - Create `apps/mobile/src/modules/calendar/hooks/useMonthCalendar.ts` managing active month, active filter, loading state, and selected day events.
   - *Done when:* Hook provides reactive month data, filter changes, and calendar math tested via typecheck.

3. **Step 3: Calendar UI Components & Day Sheet**
   - Create `apps/mobile/src/modules/calendar/components/CalendarMonthNav.tsx`.
   - Create `apps/mobile/src/modules/calendar/components/CalendarStats3.tsx`.
   - Create `apps/mobile/src/modules/calendar/components/CalendarFilterChips.tsx`.
   - Create `apps/mobile/src/modules/calendar/components/CalendarGrid.tsx`.
   - Create `apps/mobile/src/modules/calendar/components/CalendarDaySheet.tsx`.
   - Create `apps/mobile/src/modules/calendar/components/CalendarView.tsx` assembling them together.
   - *Done when:* Components match `prototypes/current/calendar.html` Frame 1 and Frame 2 styling and design tokens.

4. **Step 4: Integration into Progress & Log Screen**
   - Update `apps/mobile/src/app/(tabs)/progress.tsx` with segmented control `[ Overview | Calendar ]`.
   - Connect `CalendarView` under the Calendar tab.
   - Update `DayNavigator.tsx` so tapping calendar hint navigates to `/progress?tab=calendar&date=...`.
   - *Done when:* Switching between Overview and Calendar works seamlessly; tapping a day in the calendar opens the day sheet; navigating to log opens the selected day. Typecheck passes cleanly.

## Files / areas

- `apps/mobile/src/modules/calendar/types/calendar.ts`
- `apps/mobile/src/modules/calendar/repositories/calendarRepo.ts`
- `apps/mobile/src/modules/calendar/services/calendarCalc.ts`
- `apps/mobile/src/modules/calendar/hooks/useMonthCalendar.ts`
- `apps/mobile/src/modules/calendar/components/CalendarMonthNav.tsx`
- `apps/mobile/src/modules/calendar/components/CalendarStats3.tsx`
- `apps/mobile/src/modules/calendar/components/CalendarFilterChips.tsx`
- `apps/mobile/src/modules/calendar/components/CalendarGrid.tsx`
- `apps/mobile/src/modules/calendar/components/CalendarDaySheet.tsx`
- `apps/mobile/src/modules/calendar/components/CalendarView.tsx`
- `apps/mobile/src/app/(tabs)/progress.tsx`
- `apps/mobile/src/modules/nutrition/components/DayNavigator.tsx`

## Data / contracts

- Month format: `YYYY-MM`.
- Day format: `YYYY-MM-DD`.
- Adherence calculation:
  - `ok`: `kcal >= (target - 150) && kcal <= (target + 50)`
  - `over`: `kcal > (target + 50)`
  - `low`: `kcal < (target - 150)`
- Events:
  - Food: `hasFood: boolean`, total kcal, macros.
  - Weight: `weightKg?: number`.
  - Workout: `hasWorkout: boolean`, workout titles/count.
  - Cooking: `hasCooking: boolean`.
  - Pantry: `hasPantry: boolean`.

## Testing

- Typecheck: `cmd.exe /c npm run typecheck` passes with zero errors.
- Visual review against `prototypes/current/calendar.html` and `progress.html`.

## Notes for the AI

- Follow project conventions: native platform components, no external UI library dependencies, theme tokens from `useTheme`.
- In Windows PowerShell, use `cmd.exe /c` for npm commands if needed.
