"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import {
  CHALLENGE_POOL,
  pickWeeklyChallenges,
  getISOWeekNumber,
  type WeeklyChallenge,
} from "@/lib/challenges";
import type { TaskCompletionRow } from "@/lib/types/database";

export interface ChallengeProgress {
  challenge: WeeklyChallenge;
  current: number;
  percentage: number;
  isCompleted: boolean;
}

interface UseWeeklyChallengesOptions {
  completions: TaskCompletionRow[];
  /** Map of task_id → category key (e.g. "kitchen") */
  taskCategoryMap?: Record<string, string>;
  /** Current user id, for individual challenge tracking */
  userId?: string | null;
  /** All household completions (for household-type challenges) */
  householdCompletions?: TaskCompletionRow[];
}

interface UseWeeklyChallengesReturn {
  activeChallenges: WeeklyChallenge[];
  progress: ChallengeProgress[];
  isCompleted: (challengeId: string) => boolean;
  /** Force re-roll challenges (advances week key by 1 – useful for testing) */
  refreshChallenges: () => void;
  weekNum: number;
}

/** Monday of the current week as YYYY-MM-DD */
function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Sunday of the current week as YYYY-MM-DD (or end-of-week Sunday) */
function getWeekEnd(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day; // shift to Sunday
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d.toISOString().slice(0, 10);
}

/** Filter completions to those that occurred within this week (Mon–Sun) */
function thisWeeksCompletions(completions: TaskCompletionRow[]): TaskCompletionRow[] {
  const start = getWeekStart();
  const end = getWeekEnd();
  return completions.filter((c) => {
    const d = c.completed_at.slice(0, 10);
    return d >= start && d <= end;
  });
}

/** Count unique category keys in a set of task ids */
function countUniqueCategories(
  taskIds: string[],
  taskCategoryMap: Record<string, string>
): number {
  const cats = new Set<string>();
  for (const id of taskIds) {
    const cat = taskCategoryMap[id];
    if (cat) cats.add(cat);
  }
  return cats.size;
}

/** Compute progress for a single challenge */
function computeProgress(
  challenge: WeeklyChallenge,
  weekCompletions: TaskCompletionRow[],
  householdWeekCompletions: TaskCompletionRow[],
  taskCategoryMap: Record<string, string>,
  userId: string | null | undefined
): number {
  const myCompletions = weekCompletions.filter(
    (c) => !userId || c.user_id === userId
  );

  switch (challenge.id) {
    case "marathon": {
      return myCompletions.length;
    }
    case "kitchen_spark":
    case "bathroom_blitz": {
      return myCompletions.filter(
        (c) => taskCategoryMap[c.task_id] === challenge.category
      ).length;
    }
    case "perfect_week": {
      // Days where the user completed ≥1 task
      const days = new Set(myCompletions.map((c) => c.completed_at.slice(0, 10)));
      return days.size;
    }
    case "power_couple": {
      return householdWeekCompletions.length;
    }
    case "early_bird": {
      return myCompletions.filter((c) => {
        const hour = new Date(c.completed_at).getHours();
        return hour < 10;
      }).length;
    }
    case "zero_overdue": {
      // Binary: if today is Sunday (end of week) and completions exist, grant 1
      const isEndOfWeek = new Date().getDay() === 0;
      return isEndOfWeek && myCompletions.length > 0 ? 1 : 0;
    }
    case "all_categories": {
      return countUniqueCategories(
        myCompletions.map((c) => c.task_id),
        taskCategoryMap
      );
    }
    case "five_a_day": {
      // Max completions in any single day
      const byDay: Record<string, number> = {};
      for (const c of myCompletions) {
        const day = c.completed_at.slice(0, 10);
        byDay[day] = (byDay[day] ?? 0) + 1;
      }
      return Math.max(0, ...Object.values(byDay));
    }
    case "streak_five": {
      // Consecutive days with completions ending today
      const daySet = new Set(myCompletions.map((c) => c.completed_at.slice(0, 10)));
      let streak = 0;
      const d = new Date();
      while (true) {
        const key = d.toISOString().slice(0, 10);
        if (!daySet.has(key)) break;
        streak++;
        d.setDate(d.getDate() - 1);
      }
      return streak;
    }
    case "helping_hands": {
      // Minimum completions across each household member this week
      const byUser: Record<string, number> = {};
      for (const c of householdWeekCompletions) {
        byUser[c.user_id] = (byUser[c.user_id] ?? 0) + 1;
      }
      const members = Object.values(byUser);
      if (members.length === 0) return 0;
      return Math.min(...members);
    }
    case "no_procrastination": {
      // Simplified: count completions this week (can't easily check due dates client-side)
      return myCompletions.length;
    }
    case "super_sprint": {
      // Max completions within any 60-minute window
      const times = myCompletions
        .map((c) => new Date(c.completed_at).getTime())
        .sort((a, b) => a - b);
      let maxInHour = 0;
      for (let i = 0; i < times.length; i++) {
        let count = 1;
        for (let j = i + 1; j < times.length; j++) {
          if (times[j] - times[i] <= 3_600_000) count++;
          else break;
        }
        maxInHour = Math.max(maxInHour, count);
      }
      return maxInHour;
    }
    case "team_sprint": {
      // Check if 10 household completions in any 3 consecutive days
      const byDay: Record<string, number> = {};
      for (const c of householdWeekCompletions) {
        const day = c.completed_at.slice(0, 10);
        byDay[day] = (byDay[day] ?? 0) + 1;
      }
      const days = Object.keys(byDay).sort();
      let max3 = 0;
      for (let i = 0; i < days.length; i++) {
        const start3 = new Date(days[i]);
        let sum = 0;
        for (let j = i; j < days.length; j++) {
          const diff =
            (new Date(days[j]).getTime() - start3.getTime()) / 86_400_000;
          if (diff < 3) sum += byDay[days[j]];
          else break;
        }
        max3 = Math.max(max3, sum);
      }
      return max3;
    }
    default:
      return 0;
  }
}

const STORAGE_KEY_PREFIX = "bayit-challenges-week-";

export function useWeeklyChallenges({
  completions,
  taskCategoryMap = {},
  userId,
  householdCompletions,
}: UseWeeklyChallengesOptions): UseWeeklyChallengesReturn {
  const baseWeekNum = useMemo(() => getISOWeekNumber(new Date()), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekNum = baseWeekNum + weekOffset;

  // Persist/restore active challenge ids per week
  const storageKey = `${STORAGE_KEY_PREFIX}${weekNum}`;

  const activeChallenges = useMemo(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const ids = JSON.parse(stored) as string[];
          const found = ids
            .map((id) => CHALLENGE_POOL.find((c) => c.id === id))
            .filter(Boolean) as WeeklyChallenge[];
          if (found.length === 3) return found;
        } catch {
          // fall through to generate
        }
      }
    }
    const picks = pickWeeklyChallenges(weekNum);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(picks.map((c) => c.id)));
    }
    return picks;
  }, [weekNum, storageKey]);

  // Save on mount if not yet saved
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(storageKey)) {
      const picks = pickWeeklyChallenges(weekNum);
      localStorage.setItem(storageKey, JSON.stringify(picks.map((c) => c.id)));
    }
  }, [storageKey, weekNum]);

  const weekCompletions = useMemo(
    () => thisWeeksCompletions(completions),
    [completions]
  );

  const householdWeekCompletions = useMemo(
    () => thisWeeksCompletions(householdCompletions ?? completions),
    [householdCompletions, completions]
  );

  const progress = useMemo(
    (): ChallengeProgress[] =>
      activeChallenges.map((challenge) => {
        const current = computeProgress(
          challenge,
          weekCompletions,
          householdWeekCompletions,
          taskCategoryMap,
          userId
        );
        const clamped = Math.min(current, challenge.target);
        return {
          challenge,
          current: clamped,
          percentage: Math.round((clamped / challenge.target) * 100),
          isCompleted: current >= challenge.target,
        };
      }),
    [activeChallenges, weekCompletions, householdWeekCompletions, taskCategoryMap, userId]
  );

  const isCompleted = useCallback(
    (challengeId: string) =>
      progress.find((p) => p.challenge.id === challengeId)?.isCompleted ?? false,
    [progress]
  );

  const refreshChallenges = useCallback(() => {
    setWeekOffset((o) => o + 1);
  }, []);

  return { activeChallenges, progress, isCompleted, refreshChallenges, weekNum };
}
