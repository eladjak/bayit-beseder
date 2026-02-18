import { getCategoryColor, getCategoryLabel } from "@/lib/seed-data";
import type { TaskRow, TaskCompletionRow } from "@/lib/types/database";

// ============================================
// Types
// ============================================

export interface CategoryStat {
  key: string;
  label: string;
  color: string;
  total: number;
  completed: number;
}

export interface MonthlyCompletionPoint {
  /** Day-of-month label like "1", "2", ... "30" */
  day: string;
  count: number;
}

// ============================================
// Pure computation helpers
// ============================================

/**
 * Returns ISO date string (YYYY-MM-DD) for `days` offset from `baseDate`.
 * Positive `days` = future, negative = past.
 */
export function addDays(baseDate: string, days: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Compute per-category statistics from a list of tasks.
 * `categoryIdToKey` maps category_id -> internal key (e.g. "kitchen").
 */
export function computeCategoryStats(
  tasks: TaskRow[],
  categoryIdToKey: Record<string, string>
): CategoryStat[] {
  const counts: Record<string, { total: number; completed: number }> = {};

  for (const task of tasks) {
    const key = task.category_id
      ? (categoryIdToKey[task.category_id] ?? "general")
      : "general";

    if (!counts[key]) {
      counts[key] = { total: 0, completed: 0 };
    }
    counts[key].total += 1;
    if (task.status === "completed") {
      counts[key].completed += 1;
    }
  }

  return Object.entries(counts)
    .map(([key, { total, completed }]) => ({
      key,
      label: getCategoryLabel(key),
      color: getCategoryColor(key),
      total,
      completed,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Compute daily completion counts for the last 30 days (including today).
 * Returns array of 30 points, oldest first.
 */
export function computeMonthlyData(
  completions: TaskCompletionRow[],
  today: string
): MonthlyCompletionPoint[] {
  const days: MonthlyCompletionPoint[] = [];
  const countsByDay: Record<string, number> = {};

  for (const c of completions) {
    const day = c.completed_at.slice(0, 10);
    countsByDay[day] = (countsByDay[day] ?? 0) + 1;
  }

  for (let i = 29; i >= 0; i--) {
    const dateStr = addDays(today, -i);
    days.push({
      day: String(new Date(dateStr).getDate()),
      count: countsByDay[dateStr] ?? 0,
    });
  }

  return days;
}

/**
 * Count tasks whose due_date falls within the next 7 days (today inclusive).
 * Excludes completed and skipped tasks.
 */
export function countUpcomingTasks(tasks: TaskRow[], today: string): number {
  const limit = addDays(today, 7);
  return tasks.filter((t) => {
    if (!t.due_date) return false;
    if (t.status === "completed" || t.status === "skipped") return false;
    return t.due_date >= today && t.due_date <= limit;
  }).length;
}

/**
 * Compute overall completion rate (0-100) from a list of tasks.
 */
export function computeCompletionRate(tasks: TaskRow[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === "completed").length;
  return Math.round((completed / tasks.length) * 100);
}

// ============================================
// Weekly trend data (for Recharts)
// ============================================

export interface WeeklyTrendPoint {
  /** Hebrew day label like "א׳", "ב׳" */
  day: string;
  /** Number of completions on this day */
  completed: number;
  /** Number of tasks due/assigned on this day */
  total: number;
}

const HEBREW_DAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

/**
 * Compute daily completion counts for the current week (Sunday-Saturday).
 * Returns 7 data points for Recharts bar chart.
 */
export function computeWeeklyTrend(
  completions: TaskCompletionRow[],
  tasks: TaskRow[],
  today: string
): WeeklyTrendPoint[] {
  const todayDate = new Date(today);
  const dayOfWeek = todayDate.getDay(); // 0=Sun, 6=Sat

  // Find Sunday of this week
  const sunday = addDays(today, -dayOfWeek);

  const points: WeeklyTrendPoint[] = [];

  for (let i = 0; i < 7; i++) {
    const dateStr = addDays(sunday, i);
    const completedCount = completions.filter(
      (c) => c.completed_at.slice(0, 10) === dateStr
    ).length;
    const totalCount = tasks.filter((t) => t.due_date === dateStr).length;

    points.push({
      day: HEBREW_DAY_LABELS[i],
      completed: completedCount,
      total: Math.max(totalCount, completedCount),
    });
  }

  return points;
}

/**
 * Count tasks completed within the last 7 days (today inclusive).
 */
export function countCompletedThisWeek(
  completions: TaskCompletionRow[],
  today: string
): number {
  const weekAgo = addDays(today, -6);
  return completions.filter((c) => {
    const d = c.completed_at.slice(0, 10);
    return d >= weekAgo && d <= today;
  }).length;
}

// ============================================
// Calendar data
// ============================================

export interface CalendarDay {
  /** Date string (YYYY-MM-DD) */
  date: string;
  /** Day of month (1-31) */
  dayOfMonth: number;
  /** Whether this day is in the displayed month */
  isCurrentMonth: boolean;
  /** Whether this is today */
  isToday: boolean;
  /** Number of tasks due on this date */
  dueCount: number;
  /** Number of completions on this date */
  completedCount: number;
}

/**
 * Build calendar grid for a given month.
 * Returns 6 weeks (42 days) to fill a standard calendar grid.
 */
export function buildCalendarMonth(
  year: number,
  month: number, // 0-indexed (0=Jan)
  tasks: TaskRow[],
  completions: TaskCompletionRow[],
  today: string
): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay(); // 0=Sun

  // Build completion counts by date
  const completionsByDate: Record<string, number> = {};
  for (const c of completions) {
    const d = c.completed_at.slice(0, 10);
    completionsByDate[d] = (completionsByDate[d] ?? 0) + 1;
  }

  // Build due counts by date
  const dueByDate: Record<string, number> = {};
  for (const t of tasks) {
    if (t.due_date && t.status !== "completed" && t.status !== "skipped") {
      dueByDate[t.due_date] = (dueByDate[t.due_date] ?? 0) + 1;
    }
  }

  // Also count completed tasks by due_date for showing on calendar
  for (const t of tasks) {
    if (t.due_date && t.status === "completed") {
      dueByDate[t.due_date] = (dueByDate[t.due_date] ?? 0) + 1;
    }
  }

  const days: CalendarDay[] = [];

  // Start from the Sunday before (or on) the 1st of the month
  const calendarStart = new Date(year, month, 1 - startDay);

  for (let i = 0; i < 42; i++) {
    const current = new Date(calendarStart);
    current.setDate(calendarStart.getDate() + i);
    const dateStr = current.toISOString().slice(0, 10);

    days.push({
      date: dateStr,
      dayOfMonth: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      isToday: dateStr === today,
      dueCount: dueByDate[dateStr] ?? 0,
      completedCount: completionsByDate[dateStr] ?? 0,
    });
  }

  return days;
}
