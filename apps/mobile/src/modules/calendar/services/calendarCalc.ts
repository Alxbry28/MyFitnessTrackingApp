import type { AdherenceStatus, DayEvents, MonthCalendarData } from "../types/calendar";
import type { RawMonthData } from "../repositories/calendarRepo";

export function formatDayKey(year: number, month: number, day: number): string {
  const m = month < 10 ? `0${month}` : `${month}`;
  const d = day < 10 ? `0${day}` : `${day}`;
  return `${year}-${m}-${d}`;
}

export function calculateAdherence(kcal: number | null, targetKcal: number): AdherenceStatus {
  if (kcal == null || kcal === 0) return "none";
  if (kcal > targetKcal + 50) return "over";
  if (kcal < targetKcal - 250) return "low";
  return "ok";
}

export function buildMonthCalendar(raw: RawMonthData, year: number, month: number): MonthCalendarData {
  const now = new Date();
  const todayKey = formatDayKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const daysInMonth = new Date(year, month, 0).getDate();

  // Monday-first offset: 0 for Mon, 6 for Sun
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0 is Sun, 1 is Mon
  const leadingBlanks = (firstDow + 6) % 7;

  const monthDate = new Date(year, month - 1, 1);
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const gridDays: (DayEvents | null)[] = [];

  // 1. Add leading blanks
  for (let i = 0; i < leadingBlanks; i++) {
    gridDays.push(null);
  }

  let totalLoggedKcal = 0;
  let loggedDaysCount = 0;
  let daysOnTarget = 0;
  let weighInsCount = 0;

  // 2. Add each day
  for (let d = 1; d <= daysInMonth; d++) {
    const dayKey = formatDayKey(year, month, d);
    const isToday = dayKey === todayKey;

    const food = raw.foodByDay.get(dayKey);
    const kcal = food?.total_kcal ?? null;
    const protein = food?.total_protein ?? null;
    const carbs = food?.total_carbs ?? null;
    const fat = food?.total_fat ?? null;

    const weightKg = raw.weightByDay.get(dayKey) ?? null;
    if (weightKg != null) {
      weighInsCount++;
    }

    const hasMeasurements = raw.measurementsByDay.has(dayKey);
    const workoutNames = raw.workoutsByDay.get(dayKey) ?? [];
    const hasWorkout = workoutNames.length > 0;
    const cookingNames = raw.cookingByDay.get(dayKey) ?? [];
    const hasCooking = cookingNames.length > 0;
    const pantryMovementCount = raw.pantryByDay.get(dayKey) ?? 0;
    const hasPantry = pantryMovementCount > 0;

    const adherence = calculateAdherence(kcal, raw.targetKcal);

    if (kcal != null && kcal > 0) {
      totalLoggedKcal += kcal;
      loggedDaysCount++;
      if (adherence === "ok") {
        daysOnTarget++;
      }
    }

    const dayEvent: DayEvents = {
      day: dayKey,
      dayNumber: d,
      isToday,
      isCurrentMonth: true,
      kcal,
      protein,
      carbs,
      fat,
      weightKg,
      hasMeasurements,
      hasWorkout,
      workoutNames,
      hasCooking,
      cookingNames,
      hasPantry,
      pantryMovementCount,
      adherence,
    };

    gridDays.push(dayEvent);
  }

  // 3. Trailing blanks to complete the last week (multiple of 7)
  const remaining = gridDays.length % 7;
  if (remaining !== 0) {
    const trailingBlanks = 7 - remaining;
    for (let i = 0; i < trailingBlanks; i++) {
      gridDays.push(null);
    }
  }

  const dailyAvgKcal = loggedDaysCount > 0 ? Math.round(totalLoggedKcal / loggedDaysCount) : 0;

  return {
    monthKey: raw.monthKey,
    monthLabel,
    days: gridDays,
    dailyAvgKcal,
    daysOnTarget,
    loggedDaysCount,
    weighInsCount,
    targetKcal: raw.targetKcal,
  };
}
