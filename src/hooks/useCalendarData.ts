"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import type { TaskCompletionRow, TaskRow } from "@/lib/types/database";

export interface CalendarDayData {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  completionCount: number;
  /** "full" = all scheduled done, "partial" = some done, "none" = nothing done */
  status: "full" | "partial" | "none";
  tasks: { title: string; completedAt: string }[];
}

interface UseCalendarDataReturn {
  days: CalendarDayData[];
  currentMonth: Date;
  goToPrev: () => void;
  goToNext: () => void;
  selectedDay: string | null;
  setSelectedDay: (day: string | null) => void;
  dayTasks: { title: string; completedAt: string }[];
  isLoading: boolean;
}

function buildMockCalendar(month: Date): CalendarDayData[] {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(year, mon, 1);
  const lastDay = new Date(year, mon + 1, 0);

  // Pad to start on Sunday
  const startPad = firstDay.getDay();
  const days: CalendarDayData[] = [];

  // Previous month padding
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, mon, -i);
    days.push({
      date: d.toISOString().slice(0, 10),
      dayOfMonth: d.getDate(),
      isCurrentMonth: false,
      isToday: false,
      completionCount: 0,
      status: "none",
      tasks: [],
    });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dt = new Date(year, mon, d);
    const dateStr = dt.toISOString().slice(0, 10);
    // Mock: random completions for past days
    const isPast = dateStr <= today;
    const mockCount = isPast ? Math.floor(Math.random() * 4) : 0;
    const status: CalendarDayData["status"] =
      mockCount === 0 ? "none" : mockCount >= 3 ? "full" : "partial";
    days.push({
      date: dateStr,
      dayOfMonth: d,
      isCurrentMonth: true,
      isToday: dateStr === today,
      completionCount: mockCount,
      status,
      tasks:
        mockCount > 0
          ? Array.from({ length: mockCount }, (_, i) => ({
              title: ["שטיפת כלים", "ניקוי אמבטיה", "כביסה", "הוצאת אשפה"][i % 4],
              completedAt: new Date(dt.setHours(9 + i)).toISOString(),
            }))
          : [],
    });
  }

  // Next month padding to fill 6 rows
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const dt = new Date(year, mon + 1, d);
    days.push({
      date: dt.toISOString().slice(0, 10),
      dayOfMonth: dt.getDate(),
      isCurrentMonth: false,
      isToday: false,
      completionCount: 0,
      status: "none",
      tasks: [],
    });
  }

  return days;
}

function buildCalendarGrid(
  month: Date,
  completions: TaskCompletionRow[],
  tasks: TaskRow[]
): CalendarDayData[] {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(year, mon, 1);
  const lastDay = new Date(year, mon + 1, 0);

  const taskById = new Map(tasks.map((t) => [t.id, t]));

  // Group completions by date
  const byDate = new Map<string, { title: string; completedAt: string }[]>();
  for (const c of completions) {
    const dateStr = c.completed_at.slice(0, 10);
    if (!byDate.has(dateStr)) byDate.set(dateStr, []);
    const task = taskById.get(c.task_id);
    byDate.get(dateStr)!.push({
      title: task?.title ?? "משימה",
      completedAt: c.completed_at,
    });
  }

  const startPad = firstDay.getDay();
  const days: CalendarDayData[] = [];

  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, mon, -i);
    days.push({
      date: d.toISOString().slice(0, 10),
      dayOfMonth: d.getDate(),
      isCurrentMonth: false,
      isToday: false,
      completionCount: 0,
      status: "none",
      tasks: [],
    });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dt = new Date(year, mon, d);
    const dateStr = dt.toISOString().slice(0, 10);
    const dayTasks = byDate.get(dateStr) ?? [];
    const count = dayTasks.length;
    const status: CalendarDayData["status"] =
      count === 0 ? "none" : count >= 5 ? "full" : "partial";
    days.push({
      date: dateStr,
      dayOfMonth: d,
      isCurrentMonth: true,
      isToday: dateStr === today,
      completionCount: count,
      status,
      tasks: dayTasks,
    });
  }

  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const dt = new Date(year, mon + 1, d);
    days.push({
      date: dt.toISOString().slice(0, 10),
      dayOfMonth: dt.getDate(),
      isCurrentMonth: false,
      isToday: false,
      completionCount: 0,
      status: "none",
      tasks: [],
    });
  }

  return days;
}

export function useCalendarData(): UseCalendarDataReturn {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [completions, setCompletions] = useState<TaskCompletionRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasDbData, setHasDbData] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setHasDbData(false);
        setIsLoading(false);
        return;
      }

      const year = currentMonth.getFullYear();
      const mon = currentMonth.getMonth();
      const startDate = new Date(year, mon, 1).toISOString().slice(0, 10);
      const endDate = new Date(year, mon + 1, 0).toISOString().slice(0, 10);

      const [{ data: compData }, { data: taskData }] = await Promise.all([
        supabase
          .from("task_completions")
          .select("*")
          .gte("completed_at", `${startDate}T00:00:00`)
          .lte("completed_at", `${endDate}T23:59:59`)
          .order("completed_at", { ascending: true }),
        supabase.from("tasks").select("id, title, category_id"),
      ]);

      if (compData) {
        setCompletions(compData);
        setHasDbData(true);
      }
      if (taskData) {
        setTasks(taskData as TaskRow[]);
      }
    } catch {
      setHasDbData(false);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const days = useMemo(() => {
    if (!hasDbData) return buildMockCalendar(currentMonth);
    return buildCalendarGrid(currentMonth, completions, tasks);
  }, [hasDbData, currentMonth, completions, tasks]);

  const dayTasks = useMemo(() => {
    if (!selectedDay) return [];
    const day = days.find((d) => d.date === selectedDay);
    return day?.tasks ?? [];
  }, [days, selectedDay]);

  const goToPrev = useCallback(() => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    setSelectedDay(null);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    setSelectedDay(null);
  }, []);

  return {
    days,
    currentMonth,
    goToPrev,
    goToNext,
    selectedDay,
    setSelectedDay,
    dayTasks,
    isLoading,
  };
}
