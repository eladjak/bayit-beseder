"use client";

import { useMemo } from "react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { computeBestStreak } from "@/lib/task-stats";
import type { TaskCompletionRow, TaskRow } from "@/lib/types/database";

const DEMO_EARNED = ["first_task", "streak_3", "week_warrior", "team_player"];

interface UseEarnedBadgesOptions {
  completions: TaskCompletionRow[];
  tasks: TaskRow[];
  isDemo?: boolean;
}

interface UseEarnedBadgesReturn {
  earned: Set<string>;
  progress: Record<string, number>;
}

export function useEarnedBadges({
  completions,
  tasks,
  isDemo = false,
}: UseEarnedBadgesOptions): UseEarnedBadgesReturn {
  const earned = useMemo((): Set<string> => {
    if (isDemo) return new Set(DEMO_EARNED);
    if (completions.length === 0) return new Set();

    const unlocked = new Set<string>();
    const streak = computeBestStreak(completions);
    const total = completions.length;

    // Count completions per category (via tasks lookup)
    const taskById = new Map(tasks.map((t) => [t.id, t]));
    const catCounts: Record<string, number> = {};
    for (const c of completions) {
      const task = taskById.get(c.task_id);
      if (task?.category_id) {
        catCounts[task.category_id] = (catCounts[task.category_id] ?? 0) + 1;
      }
    }

    // Count unique days with completions
    const completionDays = new Set(
      completions.map((c) => c.completed_at.slice(0, 10))
    );

    // first_task
    if (total >= 1) unlocked.add("first_task");

    // streak achievements
    if (streak >= 3) unlocked.add("streak_3");
    if (streak >= 7) unlocked.add("streak_7");
    if (streak >= 30) unlocked.add("streak_30");

    // volume completions
    if (total >= 10) unlocked.add("all_daily_10");
    if (total >= 50) unlocked.add("house_keeper");
    if (total >= 100) unlocked.add("century_club");
    if (total >= 200) unlocked.add("veteran");

    // days-based
    if (completionDays.size >= 5) unlocked.add("week_warrior");
    if (completionDays.size >= 30) unlocked.add("monthly_hero");

    // Check by threshold for remaining achievements
    for (const ach of ACHIEVEMENTS) {
      if (unlocked.has(ach.code)) continue;
      if (ach.category === "completion" && total >= ach.threshold) {
        unlocked.add(ach.code);
      }
    }

    return unlocked;
  }, [completions, tasks, isDemo]);

  const progress = useMemo((): Record<string, number> => {
    if (isDemo) return {};
    const total = completions.length;
    const streak = computeBestStreak(completions);
    const completionDays = new Set(
      completions.map((c) => c.completed_at.slice(0, 10))
    );

    const result: Record<string, number> = {};
    for (const ach of ACHIEVEMENTS) {
      if (ach.category === "streak") {
        result[ach.code] = Math.min(streak, ach.threshold);
      } else if (ach.category === "completion") {
        result[ach.code] = Math.min(total, ach.threshold);
      } else if (ach.category === "milestone") {
        result[ach.code] = Math.min(completionDays.size, ach.threshold);
      } else {
        result[ach.code] = 0;
      }
    }
    return result;
  }, [completions, isDemo]);

  return { earned, progress };
}
