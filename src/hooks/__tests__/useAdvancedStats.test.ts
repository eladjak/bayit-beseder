/**
 * Unit tests for useAdvancedStats hook helper functions and data transformations.
 * Tests the pure logic: heatmap intensity, streak calculation, category distribution,
 * weekly trend building, and empty-data defaults.
 */

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAdvancedStats } from "@/hooks/useAdvancedStats";
import type { TaskCompletionRow, TaskRow } from "@/lib/types/database";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCompletion(
  overrides: Partial<TaskCompletionRow> & { completed_at: string }
): TaskCompletionRow {
  return {
    id: overrides.id ?? "comp-1",
    task_id: overrides.task_id ?? "task-1",
    user_id: overrides.user_id ?? "user-1",
    completed_at: overrides.completed_at,
    created_at: overrides.completed_at,
    notes: null,
  } as TaskCompletionRow;
}

function makeTask(overrides: Partial<TaskRow> & { id: string }): TaskRow {
  return {
    id: overrides.id,
    title: overrides.title ?? "Test task",
    category_id: overrides.category_id ?? null,
    is_recurring: overrides.is_recurring ?? false,
    frequency: overrides.frequency ?? null,
    preferred_day: overrides.preferred_day ?? null,
    estimated_minutes: overrides.estimated_minutes ?? 15,
    active: overrides.active ?? true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    created_by: "user-1",
    description: null,
    is_priority: false,
  } as TaskRow;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("useAdvancedStats — empty data defaults", () => {
  it("returns mock trend data when no completions", () => {
    const { result } = renderHook(() =>
      useAdvancedStats({
        completions: [],
        tasks: [],
        categoryIdToKey: {},
        today: "2026-03-26",
        userId: "user-1",
      })
    );

    const trend = result.current.weeklyTrend;
    expect(trend).toHaveLength(4);
    // Mock data always has the last week labelled "השבוע"
    expect(trend[3].week).toBe("השבוע");
  });

  it("returns mock category distribution when no completions", () => {
    const { result } = renderHook(() =>
      useAdvancedStats({
        completions: [],
        tasks: [],
        categoryIdToKey: {},
        today: "2026-03-26",
      })
    );

    const dist = result.current.categoryDistribution;
    expect(dist.length).toBeGreaterThan(0);
    for (const point of dist) {
      expect(point).toHaveProperty("key");
      expect(point).toHaveProperty("name");
      expect(point).toHaveProperty("value");
      expect(point).toHaveProperty("color");
      expect(point).toHaveProperty("icon");
    }
  });

  it("returns empty personal records when no completions", () => {
    const { result } = renderHook(() =>
      useAdvancedStats({
        completions: [],
        tasks: [],
        categoryIdToKey: {},
        today: "2026-03-26",
      })
    );

    const records = result.current.personalRecords;
    expect(records.longestStreak).toBe(0);
    expect(records.mostProductiveDate).toBeNull();
    expect(records.mostProductiveCount).toBe(0);
    expect(records.favoriteCategoryKey).toBeNull();
    expect(records.totalCompletions).toBe(0);
    expect(records.totalTimeSavedMinutes).toBe(0);
  });

  it("returns 28 heatmap days regardless of completion data", () => {
    const { result } = renderHook(() =>
      useAdvancedStats({
        completions: [],
        tasks: [],
        categoryIdToKey: {},
        today: "2026-03-26",
      })
    );

    expect(result.current.heatmapData).toHaveLength(28);
  });
});

describe("useAdvancedStats — heatmap intensity", () => {
  it("assigns intensity 0 for days with no completions", () => {
    const { result } = renderHook(() =>
      useAdvancedStats({
        completions: [],
        tasks: [],
        categoryIdToKey: {},
        today: "2026-03-26",
      })
    );

    for (const day of result.current.heatmapData) {
      expect(day.intensity).toBe(0);
      expect(day.count).toBe(0);
    }
  });

  it("assigns increasing intensities based on completion count thresholds", () => {
    const today = "2026-03-26";

    // Create multiple completions on specific dates within the 28-day window
    const completions: TaskCompletionRow[] = [
      // 1 completion → intensity 1
      makeCompletion({ id: "c1", completed_at: "2026-03-25T10:00:00Z" }),
      // 3 completions on one day → intensity 2
      makeCompletion({ id: "c2", completed_at: "2026-03-24T10:00:00Z" }),
      makeCompletion({ id: "c3", completed_at: "2026-03-24T11:00:00Z" }),
      makeCompletion({ id: "c4", completed_at: "2026-03-24T12:00:00Z" }),
      // 5 completions on one day → intensity 3
      makeCompletion({ id: "c5", completed_at: "2026-03-23T10:00:00Z" }),
      makeCompletion({ id: "c6", completed_at: "2026-03-23T11:00:00Z" }),
      makeCompletion({ id: "c7", completed_at: "2026-03-23T12:00:00Z" }),
      makeCompletion({ id: "c8", completed_at: "2026-03-23T13:00:00Z" }),
      makeCompletion({ id: "c9", completed_at: "2026-03-23T14:00:00Z" }),
      // 8 completions on one day → intensity 4
      ...Array.from({ length: 8 }, (_, i) =>
        makeCompletion({ id: `c10_${i}`, completed_at: `2026-03-22T${10 + i}:00:00Z` })
      ),
    ];

    const { result } = renderHook(() =>
      useAdvancedStats({
        completions,
        tasks: [],
        categoryIdToKey: {},
        today,
      })
    );

    const heatmap = result.current.heatmapData;
    const byDate = Object.fromEntries(heatmap.map((d) => [d.date, d]));

    expect(byDate["2026-03-25"].intensity).toBe(1);
    expect(byDate["2026-03-24"].intensity).toBe(2);
    expect(byDate["2026-03-23"].intensity).toBe(3);
    expect(byDate["2026-03-22"].intensity).toBe(4);
  });
});

describe("useAdvancedStats — personal records with data", () => {
  it("calculates totalCompletions correctly for specific user", () => {
    const completions: TaskCompletionRow[] = [
      makeCompletion({ id: "c1", user_id: "user-1", completed_at: "2026-03-20T10:00:00Z" }),
      makeCompletion({ id: "c2", user_id: "user-1", completed_at: "2026-03-21T10:00:00Z" }),
      makeCompletion({ id: "c3", user_id: "user-2", completed_at: "2026-03-21T10:00:00Z" }),
    ];

    const { result } = renderHook(() =>
      useAdvancedStats({
        completions,
        tasks: [],
        categoryIdToKey: {},
        today: "2026-03-26",
        userId: "user-1",
      })
    );

    expect(result.current.personalRecords.totalCompletions).toBe(2);
    // Time saved = completions × 15 minutes
    expect(result.current.personalRecords.totalTimeSavedMinutes).toBe(30);
  });

  it("calculates total completions for all users when userId is undefined", () => {
    const completions: TaskCompletionRow[] = [
      makeCompletion({ id: "c1", user_id: "user-1", completed_at: "2026-03-20T10:00:00Z" }),
      makeCompletion({ id: "c2", user_id: "user-2", completed_at: "2026-03-21T10:00:00Z" }),
      makeCompletion({ id: "c3", user_id: "user-2", completed_at: "2026-03-22T10:00:00Z" }),
    ];

    const { result } = renderHook(() =>
      useAdvancedStats({
        completions,
        tasks: [],
        categoryIdToKey: {},
        today: "2026-03-26",
      })
    );

    expect(result.current.personalRecords.totalCompletions).toBe(3);
  });

  it("finds the most productive date correctly", () => {
    const completions: TaskCompletionRow[] = [
      makeCompletion({ id: "c1", user_id: "user-1", completed_at: "2026-03-20T10:00:00Z" }),
      makeCompletion({ id: "c2", user_id: "user-1", completed_at: "2026-03-21T10:00:00Z" }),
      makeCompletion({ id: "c3", user_id: "user-1", completed_at: "2026-03-21T11:00:00Z" }),
      makeCompletion({ id: "c4", user_id: "user-1", completed_at: "2026-03-21T12:00:00Z" }),
    ];

    const { result } = renderHook(() =>
      useAdvancedStats({
        completions,
        tasks: [],
        categoryIdToKey: {},
        today: "2026-03-26",
        userId: "user-1",
      })
    );

    expect(result.current.personalRecords.mostProductiveDate).toBe("2026-03-21");
    expect(result.current.personalRecords.mostProductiveCount).toBe(3);
  });

  it("computes favorite category from completions", () => {
    const tasks = [
      makeTask({ id: "task-kitchen", category_id: "cat-kitchen" }),
      makeTask({ id: "task-bathroom", category_id: "cat-bathroom" }),
    ];
    const categoryIdToKey: Record<string, string> = {
      "cat-kitchen": "kitchen",
      "cat-bathroom": "bathroom",
    };
    const completions: TaskCompletionRow[] = [
      makeCompletion({ id: "c1", task_id: "task-kitchen", completed_at: "2026-03-20T10:00:00Z" }),
      makeCompletion({ id: "c2", task_id: "task-kitchen", completed_at: "2026-03-21T10:00:00Z" }),
      makeCompletion({ id: "c3", task_id: "task-bathroom", completed_at: "2026-03-22T10:00:00Z" }),
    ];

    const { result } = renderHook(() =>
      useAdvancedStats({ completions, tasks, categoryIdToKey, today: "2026-03-26" })
    );

    expect(result.current.personalRecords.favoriteCategoryKey).toBe("kitchen");
    expect(result.current.personalRecords.favoriteCategoryLabel).toBeTruthy();
  });
});

describe("useAdvancedStats — weekly trend with data", () => {
  it("returns 4 weekly data points", () => {
    const completions: TaskCompletionRow[] = [
      makeCompletion({ id: "c1", completed_at: "2026-03-20T10:00:00Z" }),
    ];

    const { result } = renderHook(() =>
      useAdvancedStats({
        completions,
        tasks: [makeTask({ id: "task-1" })],
        categoryIdToKey: {},
        today: "2026-03-26",
      })
    );

    expect(result.current.weeklyTrend).toHaveLength(4);
  });

  it("clamps percentages to 0–100", () => {
    // Generate many completions (more than tasks count)
    const completions: TaskCompletionRow[] = Array.from({ length: 200 }, (_, i) =>
      makeCompletion({ id: `c${i}`, completed_at: "2026-03-26T10:00:00Z" })
    );

    const { result } = renderHook(() =>
      useAdvancedStats({
        completions,
        tasks: [makeTask({ id: "task-1" })],
        categoryIdToKey: {},
        today: "2026-03-26",
      })
    );

    for (const point of result.current.weeklyTrend) {
      expect(point.myPct).toBeGreaterThanOrEqual(0);
      expect(point.myPct).toBeLessThanOrEqual(100);
      expect(point.avgPct).toBeGreaterThanOrEqual(0);
      expect(point.avgPct).toBeLessThanOrEqual(100);
    }
  });
});
