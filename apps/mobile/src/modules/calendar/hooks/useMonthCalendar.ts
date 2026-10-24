import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";

import { calendarRepo } from "../repositories/calendarRepo";
import { buildMonthCalendar } from "../services/calendarCalc";
import type { CalendarFilter, DayEvents, MonthCalendarData } from "../types/calendar";

export function useMonthCalendar(initialDate?: Date) {
  const db = useSQLiteContext();
  const init = initialDate ?? new Date();

  const [year, setYear] = useState(init.getFullYear());
  const [month, setMonth] = useState(init.getMonth() + 1); // 1-12
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedDay, setSelectedDay] = useState<DayEvents | null>(null);

  const [data, setData] = useState<MonthCalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const request = ++latestRequest.current;
    try {
      const raw = await calendarRepo.getMonthData(db, year, month);
      const computed = buildMonthCalendar(raw, year, month);
      if (request === latestRequest.current) {
        setData(computed);
        setLoading(false);
      }
    } catch (err) {
      if (request === latestRequest.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    }
  }, [db, year, month]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const canGoNext = year < currentYear || (year === currentYear && month < currentMonth);

  const prevMonth = useCallback(() => {
    setSelectedDay(null);
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }, [month]);

  const nextMonth = useCallback(() => {
    if (!canGoNext) return;
    setSelectedDay(null);
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }, [canGoNext, month]);

  const goToDay = useCallback((dayKey: string) => {
    const parts = dayKey.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0]!, 10);
      const m = parseInt(parts[1]!, 10);
      setYear(y);
      setMonth(m);
    }
  }, []);

  return {
    year,
    month,
    filter,
    setFilter,
    data,
    loading,
    error,
    refresh: load,
    prevMonth,
    nextMonth,
    canGoNext,
    goToDay,
    selectedDay,
    setSelectedDay,
  };
}
