"use client";

import { useMemo } from "react";
import type { TaskCompletionRow } from "@/lib/types/database";

/**
 * Given a list of task completions (sorted descending by completed_at),
 * returns the current consecutive-day streak for a specific task.
 */
function calculateStreak(completions: TaskCompletionRow[], taskId: string): number {
  // Filter and sort ascending
  const taskCompletions = completions
    .filter((c) => c.task_id === taskId)
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

  if (taskCompletions.length === 0) return 0;

  // Deduplicate: keep one entry per calendar day (YYYY-MM-DD)
  const days: string[] = [];
  const seen = new Set<string>();
  for (const c of taskCompletions) {
    const day = c.completed_at.slice(0, 10); // "YYYY-MM-DD"
    if (!seen.has(day)) {
      seen.add(day);
      days.push(day);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Streak only counts if completed today or yesterday
  if (days[0] !== today && days[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86_400_000;
    if (Math.round(diff) === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export interface TaskStreak {
  taskId: string;
  streak: number;
}

/**
 * Hook to compute streaks for a set of task IDs from a flat completions array.
 *
 * Usage:
 *   const { getStreak } = useTaskStreaks(completions);
 *   const streak = getStreak(taskId); // e.g. 3
 */
export function useTaskStreaks(completions: TaskCompletionRow[]) {
  // Build a memoised lookup map: taskId → streak
  const streakMap = useMemo(() => {
    const map = new Map<string, number>();
    // Get unique task IDs present in completions
    const taskIds = [...new Set(completions.map((c) => c.task_id))];
    for (const id of taskIds) {
      map.set(id, calculateStreak(completions, id));
    }
    return map;
  }, [completions]);

  const getStreak = (taskId: string): number => streakMap.get(taskId) ?? 0;

  return { getStreak, streakMap };
}
