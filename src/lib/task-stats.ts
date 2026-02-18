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
