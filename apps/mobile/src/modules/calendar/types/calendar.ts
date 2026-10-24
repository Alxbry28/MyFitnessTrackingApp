export type CalendarFilter = "all" | "food" | "body" | "pantry" | "workouts";

export type AdherenceStatus = "ok" | "over" | "low" | "none";

export type DayEvents = {
  day: string; // YYYY-MM-DD
  dayNumber: number; // 1-31
  isToday: boolean;
  isCurrentMonth: boolean;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  weightKg: number | null;
  hasMeasurements: boolean;
  hasWorkout: boolean;
  workoutNames: string[];
  hasCooking: boolean;
  cookingNames: string[];
  hasPantry: boolean;
  pantryMovementCount: number;
  adherence: AdherenceStatus;
};

export type MonthCalendarData = {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "October 2026"
  days: (DayEvents | null)[]; // padded with nulls for leading/trailing grid alignment (Mon-Sun)
  dailyAvgKcal: number;
  daysOnTarget: number;
  loggedDaysCount: number;
  weighInsCount: number;
  targetKcal: number;
};
