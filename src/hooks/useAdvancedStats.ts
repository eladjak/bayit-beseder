"use client";

import { useMemo } from "react";
import type { TaskCompletionRow, TaskRow } from "@/lib/types/database";
import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/categories";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WeeklyTrendPoint {
  /** Hebrew week label e.g. "שבוע 1" */
  week: string;
  /** Completion % for current user (0–100) */
  myPct: number;
  /** Completion % for household average (0–100) */
  avgPct: number;
  /** Raw count for current user */
  myCount: number;
  /** Raw total completions that week */
  totalCount: number;
}

export interface CategoryDistPoint {
  name: string;
  value: number;
  color: string;
  icon: string;
  key: string;
}

export interface HeatmapDay {
  date: string;
  count: number;
  /** 0 = none, 1 = light, 2 = medium, 3 = high, 4 = very high */
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface PersonalRecords {
  mostProductiveDate: string | null;
  mostProductiveCount: number;
  longestStreak: number;
  favoriteCategoryKey: string | null;
  favoriteCategoryLabel: string | null;
  totalTimeSavedMinutes: number;
  totalCompletions: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isoWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function addDays(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function hebrewWeekLabel(weekStart: string, weekIndex: number): string {
  const date = new Date(weekStart);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  if (weekIndex === 0) return `${day}/${month}`;
  return `שבוע ${weekIndex}`;
}

// ── Main hook ──────────────────────────────────────────────────────────────────

interface UseAdvancedStatsInput {
  completions: TaskCompletionRow[];
  tasks: TaskRow[];
  categoryIdToKey: Record<string, string>;
  today: string;
  userId?: string;
}

export function useAdvancedStats({
  completions,
  tasks,
  categoryIdToKey,
  today,
  userId,
}: UseAdvancedStatsInput) {
  // ── 4-week trend ───────────────────────────────────────────────────────────
  const weeklyTrend = useMemo((): WeeklyTrendPoint[] => {
    if (completions.length === 0) return buildMockTrend();

    const todayDate = new Date(today);
    const currentWeekStart = isoWeekStart(todayDate);
    const weeks: WeeklyTrendPoint[] = [];

    for (let w = 3; w >= 0; w--) {
      const weekStart = addDays(currentWeekStart, -w * 7);
      const weekEnd = addDays(weekStart, 6);

      const weekCompletions = completions.filter((c) => {
        const d = c.completed_at.slice(0, 10);
        return d >= weekStart && d <= weekEnd;
      });

      const myWeekCompletions = userId
        ? weekCompletions.filter((c) => c.user_id === userId).length
        : weekCompletions.length;

      const totalCount = weekCompletions.length;

      // Estimate % completion: use tasks.length as denominator (max 7 per day × tasks)
      const denominator = Math.max(tasks.length, 1);
      const myPct = Math.min(100, Math.round((myWeekCompletions / denominator) * 100));
      const avgPct = Math.min(100, Math.round((totalCount / denominator) * 100));

      const weekIndex = 3 - w;
      weeks.push({
        week: hebrewWeekLabel(weekStart, weekIndex),
        myPct,
        avgPct,
        myCount: myWeekCompletions,
        totalCount,
      });
    }

    return weeks;
  }, [completions, tasks, today, userId]);

  // ── Category distribution ──────────────────────────────────────────────────
  const categoryDistribution = useMemo((): CategoryDistPoint[] => {
    if (completions.length === 0) return buildMockCategoryDist();

    const counts: Record<string, number> = {};

    for (const c of completions) {
      const task = tasks.find((t) => t.id === c.task_id);
      const key = task?.category_id
        ? (categoryIdToKey[task.category_id] ?? "general")
        : "general";
      counts[key] = (counts[key] ?? 0) + 1;
    }

    const result: CategoryDistPoint[] = Object.entries(counts)
      .map(([key, value]) => ({
        key,
        name: CATEGORY_LABELS[key] ?? key,
        value,
        color: CATEGORY_COLORS[key] ?? "#6B7280",
        icon: CATEGORY_ICONS[key] ?? "🏠",
      }))
      .sort((a, b) => b.value - a.value);

    return result.length > 0 ? result : buildMockCategoryDist();
  }, [completions, tasks, categoryIdToKey]);

  // ── Activity heatmap (last 28 days = 4 weeks × 7 days) ────────────────────
  const heatmapData = useMemo((): HeatmapDay[] => {
    const countsByDay: Record<string, number> = {};
    for (const c of completions) {
      const day = c.completed_at.slice(0, 10);
      countsByDay[day] = (countsByDay[day] ?? 0) + 1;
    }

    const days: HeatmapDay[] = [];
    for (let i = 27; i >= 0; i--) {
      const date = addDays(today, -i);
      const count = countsByDay[date] ?? 0;
      let intensity: HeatmapDay["intensity"] = 0;
      if (count >= 1) intensity = 1;
      if (count >= 3) intensity = 2;
      if (count >= 5) intensity = 3;
      if (count >= 8) intensity = 4;
      days.push({ date, count, intensity });
    }
    return days;
  }, [completions, today]);

  // ── Personal records ───────────────────────────────────────────────────────
  const personalRecords = useMemo((): PersonalRecords => {
    if (completions.length === 0) {
      return {
        mostProductiveDate: null,
        mostProductiveCount: 0,
        longestStreak: 0,
        favoriteCategoryKey: null,
        favoriteCategoryLabel: null,
        totalTimeSavedMinutes: 0,
        totalCompletions: 0,
      };
    }

    // Most productive day
    const countsByDay: Record<string, number> = {};
    const myCounts: Record<string, number> = {};
    for (const c of completions) {
      const day = c.completed_at.slice(0, 10);
      countsByDay[day] = (countsByDay[day] ?? 0) + 1;
      if (!userId || c.user_id === userId) {
        myCounts[day] = (myCounts[day] ?? 0) + 1;
      }
    }

    let mostProductiveDate: string | null = null;
    let mostProductiveCount = 0;
    const dayCounts = userId ? myCounts : countsByDay;
    for (const [day, count] of Object.entries(dayCounts)) {
      if (count > mostProductiveCount) {
        mostProductiveCount = count;
        mostProductiveDate = day;
      }
    }

    // Longest streak
    const daysWithActivity = new Set<string>();
    for (const c of completions) {
      if (!userId || c.user_id === userId) {
        daysWithActivity.add(c.completed_at.slice(0, 10));
      }
    }

    let longestStreak = 0;
    let currentStreak = 0;
    for (let i = 90; i >= 0; i--) {
      const date = addDays(today, -i);
      if (daysWithActivity.has(date)) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // Favorite category
    const catCounts: Record<string, number> = {};
    for (const c of completions) {
      if (userId && c.user_id !== userId) continue;
      const task = tasks.find((t) => t.id === c.task_id);
      const key = task?.category_id
        ? (categoryIdToKey[task.category_id] ?? "general")
        : "general";
      catCounts[key] = (catCounts[key] ?? 0) + 1;
    }

    let favoriteCategoryKey: string | null = null;
    let maxCatCount = 0;
    for (const [key, count] of Object.entries(catCounts)) {
      if (count > maxCatCount) {
        maxCatCount = count;
        favoriteCategoryKey = key;
      }
    }

    const myTotalCompletions = userId
      ? completions.filter((c) => c.user_id === userId).length
      : completions.length;

    return {
      mostProductiveDate,
      mostProductiveCount,
      longestStreak,
      favoriteCategoryKey,
      favoriteCategoryLabel: favoriteCategoryKey
        ? (CATEGORY_LABELS[favoriteCategoryKey] ?? favoriteCategoryKey)
        : null,
      totalTimeSavedMinutes: myTotalCompletions * 15,
      totalCompletions: myTotalCompletions,
    };
  }, [completions, tasks, categoryIdToKey, today, userId]);

  return { weeklyTrend, categoryDistribution, heatmapData, personalRecords };
}

// ── Mock data for demo mode ────────────────────────────────────────────────────

function buildMockTrend(): WeeklyTrendPoint[] {
  return [
    { week: "3 שב׳", myPct: 60, avgPct: 55, myCount: 18, totalCount: 33 },
    { week: "2 שב׳", myPct: 72, avgPct: 68, myCount: 22, totalCount: 41 },
    { week: "שב׳ שעבר", myPct: 65, avgPct: 70, myCount: 20, totalCount: 42 },
    { week: "השבוע", myPct: 80, avgPct: 75, myCount: 24, totalCount: 45 },
  ];
}

function buildMockCategoryDist(): CategoryDistPoint[] {
  return [
    { key: "kitchen", name: "מטבח", value: 35, color: CATEGORY_COLORS.kitchen, icon: CATEGORY_ICONS.kitchen },
    { key: "bathroom", name: "אמבטיה", value: 20, color: CATEGORY_COLORS.bathroom, icon: CATEGORY_ICONS.bathroom },
    { key: "living", name: "סלון", value: 15, color: CATEGORY_COLORS.living, icon: CATEGORY_ICONS.living },
    { key: "laundry", name: "כביסה", value: 15, color: CATEGORY_COLORS.laundry, icon: CATEGORY_ICONS.laundry },
    { key: "outdoor", name: "חיצוני", value: 10, color: CATEGORY_COLORS.outdoor, icon: CATEGORY_ICONS.outdoor },
    { key: "general", name: "כללי", value: 5, color: CATEGORY_COLORS.general, icon: CATEGORY_ICONS.general },
  ];
}
