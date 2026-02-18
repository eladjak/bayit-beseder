import type { TaskInstance, TaskTemplate } from "@/lib/types/database";

// ============================================
// Types
// ============================================

export interface Reward {
  id: string;
  emoji: string;
  title: string;
  description: string;
  requirement: RewardRequirement;
}

export interface RewardRequirement {
  type:
    | "combined_streak"
    | "weekly_tasks"
    | "golden_rule"
    | "category_complete"
    | "total_tasks"
    | "both_daily"
    | "speed_complete";
  threshold: number;
  category?: string;
}

export interface RewardProgress {
  reward: Reward;
  current: number;
  target: number;
  progress: number; // 0-100
  unlocked: boolean;
  unlockedAt?: string;
}

/** Task instance enriched with template category for reward calculations */
export interface TaskInstanceWithCategory extends TaskInstance {
  category?: TaskTemplate["category"];
}

// ============================================
// Reward definitions
// ============================================

export const REWARDS: Reward[] = [
  {
    id: "movie-night",
    emoji: "🎬",
    title: "ערב צפייה",
    description: "שני בני הזוג משלימים משימות 3 ימים ברצף",
    requirement: { type: "both_daily", threshold: 3 },
  },
  {
    id: "coffee-dessert",
    emoji: "☕",
    title: "קפה וקינוח",
    description: "15 משימות משותפות השבוע",
    requirement: { type: "weekly_tasks", threshold: 15 },
  },
  {
    id: "dinner-out",
    emoji: "🍽️",
    title: "ארוחת חוץ",
    description: "הגיעו לכלל הזהב 5 פעמים השבוע",
    requirement: { type: "golden_rule", threshold: 5 },
  },
  {
    id: "ready-meal",
    emoji: "🥘",
    title: "ארוחה מוכנה",
    description: "כל משימות המטבח הושלמו 7 ימים ברצף",
    requirement: { type: "category_complete", threshold: 7, category: "kitchen" },
  },
  {
    id: "spa-day",
    emoji: "💆",
    title: "יום פינוק",
    description: "רצף משותף של 14 יום",
    requirement: { type: "combined_streak", threshold: 14 },
  },
  {
    id: "movie-theater",
    emoji: "🎥",
    title: "סרט בקולנוע",
    description: "50 משימות החודש ביחד",
    requirement: { type: "total_tasks", threshold: 50 },
  },
  {
    id: "shopping-together",
    emoji: "🛍️",
    title: "קניות משותפות",
    description: "כל אחד מבני הזוג השלים 10 משימות השבוע",
    requirement: { type: "weekly_tasks", threshold: 10 },
  },
  {
    id: "home-break",
    emoji: "🏡",
    title: "חופשה מהבית",
    description: "רצף משותף של 7 ימים",
    requirement: { type: "combined_streak", threshold: 7 },
  },
  {
    id: "romantic-weekend",
    emoji: "💑",
    title: "סוף שבוע רומנטי",
    description: "רצף משותף של 30 יום",
    requirement: { type: "combined_streak", threshold: 30 },
  },
  {
    id: "surprise",
    emoji: "🎁",
    title: "הפתעה!",
    description: "100 משימות ביחד סה״כ",
    requirement: { type: "total_tasks", threshold: 100 },
  },
];

// ============================================
// Helper utilities
// ============================================

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function getMonthStart(dateStr: string): string {
  return dateStr.slice(0, 7) + "-01";
}

function addDays(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Count completed tasks per user in a date range.
 * Returns a Map of userId -> count.
 */
function countCompletedByUser(
  tasks: TaskInstanceWithCategory[],
  startDate: string,
  endDate: string
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (t.status !== "completed" || !t.completed_by || !t.completed_at) continue;
    const d = t.completed_at.slice(0, 10);
    if (d >= startDate && d <= endDate) {
      counts.set(t.completed_by, (counts.get(t.completed_by) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Count total completed tasks in a date range.
 */
function countCompletedInRange(
  tasks: TaskInstanceWithCategory[],
  startDate: string,
  endDate: string
): number {
  let count = 0;
  for (const t of tasks) {
    if (t.status !== "completed" || !t.completed_at) continue;
    const d = t.completed_at.slice(0, 10);
    if (d >= startDate && d <= endDate) count++;
  }
  return count;
}

/**
 * Count consecutive days where both users completed at least one task.
 * Counts backwards from today.
 */
function countBothDailyStreak(
  tasks: TaskInstanceWithCategory[],
  members: string[],
  today: string
): number {
  if (members.length < 2) return 0;
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const dateStr = addDays(today, -i);
    const usersOnDay = new Set<string>();
    for (const t of tasks) {
      if (t.status !== "completed" || !t.completed_by || !t.completed_at) continue;
      if (t.completed_at.slice(0, 10) === dateStr) {
        usersOnDay.add(t.completed_by);
      }
    }
    const allCompleted = members.every((m) => usersOnDay.has(m));
    if (!allCompleted) break;
    streak++;
  }
  return streak;
}

/**
 * Count consecutive days where all tasks in a category were completed.
 */
function countCategoryStreak(
  tasks: TaskInstanceWithCategory[],
  category: string,
  today: string
): number {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const dateStr = addDays(today, -i);
    const dayTasks = tasks.filter(
      (t) => t.category === category && t.due_date === dateStr
    );
    if (dayTasks.length === 0) break;
    const allDone = dayTasks.every((t) => t.status === "completed");
    if (!allDone) break;
    streak++;
  }
  return streak;
}

// ============================================
// Main computation
// ============================================

/**
 * Calculate progress for all rewards based on task data.
 */
export function computeRewardsProgress(
  taskInstances: TaskInstanceWithCategory[],
  streaks: { user1Streak: number; user2Streak: number },
  goldenRuleHits: number,
  householdMembers: string[],
  today: string = new Date().toISOString().slice(0, 10)
): RewardProgress[] {
  const weekStart = getWeekStart(today);
  const monthStart = getMonthStart(today);
  const combinedStreak = Math.min(streaks.user1Streak, streaks.user2Streak);

  return REWARDS.map((reward) => {
    let current = 0;
    const target = reward.requirement.threshold;

    switch (reward.requirement.type) {
      case "combined_streak": {
        current = combinedStreak;
        break;
      }
      case "weekly_tasks": {
        if (reward.id === "shopping-together") {
          // Each partner needs threshold tasks
          const perUser = countCompletedByUser(taskInstances, weekStart, today);
          const counts = householdMembers.map((m) => perUser.get(m) ?? 0);
          current = counts.length >= 2 ? Math.min(...counts) : 0;
        } else {
          current = countCompletedInRange(taskInstances, weekStart, today);
        }
        break;
      }
      case "golden_rule": {
        current = goldenRuleHits;
        break;
      }
      case "category_complete": {
        current = countCategoryStreak(
          taskInstances,
          reward.requirement.category ?? "kitchen",
          today
        );
        break;
      }
      case "total_tasks": {
        if (reward.id === "surprise") {
          // All-time total
          current = taskInstances.filter((t) => t.status === "completed").length;
        } else {
          current = countCompletedInRange(taskInstances, monthStart, today);
        }
        break;
      }
      case "both_daily": {
        current = countBothDailyStreak(taskInstances, householdMembers, today);
        break;
      }
      case "speed_complete": {
        current = 0;
        break;
      }
    }

    const progress = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
    const unlocked = current >= target;

    return {
      reward,
      current,
      target,
      progress,
      unlocked,
    };
  });
}

/**
 * Get the reward closest to being unlocked (but not yet unlocked).
 */
export function getNextReward(
  progress: RewardProgress[]
): RewardProgress | null {
  const locked = progress.filter((p) => !p.unlocked);
  if (locked.length === 0) return null;
  return locked.reduce((best, item) =>
    item.progress > best.progress ? item : best
  );
}

/**
 * Get count of unlocked rewards.
 */
export function getUnlockedCount(progress: RewardProgress[]): number {
  return progress.filter((p) => p.unlocked).length;
}
