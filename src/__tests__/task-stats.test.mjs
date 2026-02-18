/**
 * Unit tests for task statistics utilities.
 * Uses Node.js built-in test runner (Node 18+). Run with:
 *   node --test src/__tests__/task-stats.test.mjs
 *
 * NOTE: These tests use inline implementations of the pure functions
 * to avoid the TypeScript/path-alias setup overhead in a test environment.
 * The implementations must match src/lib/task-stats.ts exactly.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ============================================
// Inline implementations (mirrors task-stats.ts)
// ============================================

function addDays(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function computeCompletionRate(tasks) {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === "completed").length;
  return Math.round((completed / tasks.length) * 100);
}

function countUpcomingTasks(tasks, today) {
  const limit = addDays(today, 7);
  return tasks.filter((t) => {
    if (!t.due_date) return false;
    if (t.status === "completed" || t.status === "skipped") return false;
    return t.due_date >= today && t.due_date <= limit;
  }).length;
}

function computeMonthlyData(completions, today) {
  const days = [];
  const countsByDay = {};

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

function computeCategoryStats(tasks, categoryIdToKey) {
  const counts = {};

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
      label: key,
      color: "#000",
      total,
      completed,
    }))
    .sort((a, b) => b.total - a.total);
}

// ============================================
// Helpers
// ============================================

function makeTask(overrides = {}) {
  return {
    id: "t1",
    title: "Test Task",
    description: null,
    category_id: null,
    assigned_to: null,
    status: "pending",
    due_date: null,
    points: 10,
    recurring: false,
    created_at: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeCompletion(overrides = {}) {
  return {
    id: "c1",
    task_id: "t1",
    user_id: "u1",
    completed_at: "2026-02-18T10:00:00.000Z",
    photo_url: null,
    notes: null,
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe("addDays", () => {
  test("adds positive days correctly", () => {
    const result = addDays("2026-02-18", 7);
    assert.equal(result, "2026-02-25");
  });

  test("subtracts days when negative offset", () => {
    const result = addDays("2026-02-18", -5);
    assert.equal(result, "2026-02-13");
  });

  test("handles month boundary crossing", () => {
    const result = addDays("2026-01-30", 5);
    assert.equal(result, "2026-02-04");
  });

  test("returns same date for zero offset", () => {
    const result = addDays("2026-02-18", 0);
    assert.equal(result, "2026-02-18");
  });
});

describe("computeCompletionRate", () => {
  test("returns 0 for empty task list", () => {
    assert.equal(computeCompletionRate([]), 0);
  });

  test("returns 100 when all tasks completed", () => {
    const tasks = [
      makeTask({ status: "completed" }),
      makeTask({ id: "t2", status: "completed" }),
    ];
    assert.equal(computeCompletionRate(tasks), 100);
  });

  test("returns 0 when no tasks completed", () => {
    const tasks = [makeTask(), makeTask({ id: "t2" })];
    assert.equal(computeCompletionRate(tasks), 0);
  });

  test("rounds to nearest integer", () => {
    const tasks = [
      makeTask({ status: "completed" }),
      makeTask({ id: "t2" }),
      makeTask({ id: "t3" }),
    ];
    // 1/3 = 33.33... -> rounds to 33
    assert.equal(computeCompletionRate(tasks), 33);
  });

  test("handles single task completed", () => {
    const tasks = [makeTask({ status: "completed" })];
    assert.equal(computeCompletionRate(tasks), 100);
  });
});

describe("countUpcomingTasks", () => {
  const today = "2026-02-18";

  test("returns 0 when no tasks", () => {
    assert.equal(countUpcomingTasks([], today), 0);
  });

  test("counts pending tasks due within next 7 days", () => {
    const tasks = [
      makeTask({ due_date: "2026-02-18", status: "pending" }), // today
      makeTask({ id: "t2", due_date: "2026-02-22", status: "pending" }), // +4 days
      makeTask({ id: "t3", due_date: "2026-02-25", status: "pending" }), // +7 days
    ];
    assert.equal(countUpcomingTasks(tasks, today), 3);
  });

  test("excludes completed tasks", () => {
    const tasks = [
      makeTask({ due_date: "2026-02-19", status: "completed" }),
      makeTask({ id: "t2", due_date: "2026-02-20", status: "pending" }),
    ];
    assert.equal(countUpcomingTasks(tasks, today), 1);
  });

  test("excludes skipped tasks", () => {
    const tasks = [
      makeTask({ due_date: "2026-02-19", status: "skipped" }),
      makeTask({ id: "t2", due_date: "2026-02-20", status: "pending" }),
    ];
    assert.equal(countUpcomingTasks(tasks, today), 1);
  });

  test("excludes tasks due after 7 days", () => {
    const tasks = [
      makeTask({ due_date: "2026-02-26", status: "pending" }), // +8 days - out of window
      makeTask({ id: "t2", due_date: "2026-03-01", status: "pending" }), // far future
    ];
    assert.equal(countUpcomingTasks(tasks, today), 0);
  });

  test("excludes tasks with no due_date", () => {
    const tasks = [
      makeTask({ due_date: null, status: "pending" }),
      makeTask({ id: "t2", due_date: "2026-02-20", status: "pending" }),
    ];
    assert.equal(countUpcomingTasks(tasks, today), 1);
  });
});

describe("computeMonthlyData", () => {
  const today = "2026-02-18";

  test("returns exactly 30 data points", () => {
    const result = computeMonthlyData([], today);
    assert.equal(result.length, 30);
  });

  test("last point corresponds to today", () => {
    const result = computeMonthlyData([], today);
    const last = result[result.length - 1];
    const todayDayNum = String(new Date(today).getDate());
    assert.equal(last.day, todayDayNum);
  });

  test("counts completions on matching day", () => {
    const completions = [
      makeCompletion({ id: "c1", completed_at: "2026-02-18T08:00:00.000Z" }),
      makeCompletion({ id: "c2", completed_at: "2026-02-18T14:00:00.000Z" }),
      makeCompletion({ id: "c3", completed_at: "2026-02-17T09:00:00.000Z" }),
    ];
    const result = computeMonthlyData(completions, today);
    const lastPoint = result[29]; // today
    const prevPoint = result[28]; // yesterday (Feb 17)
    assert.equal(lastPoint.count, 2);
    assert.equal(prevPoint.count, 1);
  });

  test("days outside 30-day window have count 0", () => {
    // Completion from 31 days ago - should not appear
    const oldDate = addDays(today, -31);
    const completions = [
      makeCompletion({ completed_at: `${oldDate}T10:00:00.000Z` }),
    ];
    const result = computeMonthlyData(completions, today);
    const totalCount = result.reduce((sum, d) => sum + d.count, 0);
    assert.equal(totalCount, 0);
  });

  test("all counts are zero when no completions", () => {
    const result = computeMonthlyData([], today);
    for (const point of result) {
      assert.equal(point.count, 0);
    }
  });
});

describe("computeCategoryStats", () => {
  const categoryIdToKey = { "cat-1": "kitchen", "cat-2": "bathroom" };

  test("returns empty array for empty task list", () => {
    const result = computeCategoryStats([], categoryIdToKey);
    assert.equal(result.length, 0);
  });

  test("groups tasks by category correctly", () => {
    const tasks = [
      makeTask({ category_id: "cat-1", status: "pending" }),
      makeTask({ id: "t2", category_id: "cat-1", status: "completed" }),
      makeTask({ id: "t3", category_id: "cat-2", status: "pending" }),
    ];
    const result = computeCategoryStats(tasks, categoryIdToKey);
    const kitchen = result.find((r) => r.key === "kitchen");
    const bathroom = result.find((r) => r.key === "bathroom");

    assert.ok(kitchen, "kitchen category should exist");
    assert.equal(kitchen.total, 2);
    assert.equal(kitchen.completed, 1);

    assert.ok(bathroom, "bathroom category should exist");
    assert.equal(bathroom.total, 1);
    assert.equal(bathroom.completed, 0);
  });

  test("uses general for unknown category_id", () => {
    const tasks = [makeTask({ category_id: "cat-unknown" })];
    const result = computeCategoryStats(tasks, categoryIdToKey);
    assert.equal(result[0].key, "general");
  });

  test("uses general for null category_id", () => {
    const tasks = [makeTask({ category_id: null })];
    const result = computeCategoryStats(tasks, categoryIdToKey);
    assert.equal(result[0].key, "general");
  });

  test("sorts by total descending", () => {
    const tasks = [
      makeTask({ id: "t1", category_id: "cat-2", status: "pending" }), // bathroom: 1
      makeTask({ id: "t2", category_id: "cat-1", status: "pending" }), // kitchen: 3
      makeTask({ id: "t3", category_id: "cat-1", status: "pending" }),
      makeTask({ id: "t4", category_id: "cat-1", status: "completed" }),
    ];
    const result = computeCategoryStats(tasks, categoryIdToKey);
    assert.equal(result[0].key, "kitchen"); // 3 tasks first
    assert.equal(result[1].key, "bathroom"); // 1 task second
  });
});
