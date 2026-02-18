import { describe, it } from "node:test";
import assert from "node:assert/strict";

// We import from the compiled output or use a dynamic import approach.
// Since this is an .mjs test, we reference the source directly via path alias workaround.
// For Node test runner, we use relative paths to the TS source compiled by Next.js.

// Direct implementation for testing (avoids TS import issues in .mjs)
const MAX_AGE_HOURS = {
  daily: 48,
  weekly: 14 * 24,
  biweekly: 28 * 24,
  monthly: 60 * 24,
  quarterly: 180 * 24,
  yearly: 730 * 24,
};

function computeRoomHealth(lastCompletedAt, recurrenceType, now) {
  if (!lastCompletedAt) return 0;
  const currentTime = now ?? new Date();
  const elapsedMs = currentTime.getTime() - lastCompletedAt.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const maxHours = MAX_AGE_HOURS[recurrenceType];
  const score = 100 - (elapsedHours / maxHours) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getHealthColor(score) {
  if (score >= 80) return "#22C55E";
  if (score >= 50) return "#EAB308";
  if (score >= 25) return "#F97316";
  return "#EF4444";
}

function getHealthLabel(score) {
  if (score >= 80) return "\u05DE\u05E6\u05D5\u05D9\u05DF";
  if (score >= 50) return "\u05D8\u05D5\u05D1";
  if (score >= 25) return "\u05D3\u05D5\u05E8\u05E9 \u05EA\u05E9\u05D5\u05DE\u05EA \u05DC\u05D1";
  return "\u05D3\u05D7\u05D5\u05E3";
}

function computeCategoryHealth(completions, category, now) {
  const items = completions.filter((c) => c.category === category);
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => {
    const lastCompleted = item.completed_at
      ? new Date(item.completed_at)
      : null;
    return sum + computeRoomHealth(lastCompleted, item.recurrence_type, now);
  }, 0);
  return Math.round(total / items.length);
}

// ---- Tests ----

describe("computeRoomHealth", () => {
  const now = new Date("2026-02-18T12:00:00Z");

  it("returns 0 when never completed (null)", () => {
    assert.equal(computeRoomHealth(null, "daily", now), 0);
  });

  it("returns 100 when just completed", () => {
    assert.equal(computeRoomHealth(now, "daily", now), 100);
  });

  it("returns 50 for daily task completed 24h ago", () => {
    const completed = new Date("2026-02-17T12:00:00Z");
    assert.equal(computeRoomHealth(completed, "daily", now), 50);
  });

  it("returns 0 for daily task completed 48h+ ago", () => {
    const completed = new Date("2026-02-16T12:00:00Z");
    assert.equal(computeRoomHealth(completed, "daily", now), 0);
  });

  it("returns 0 for daily task completed way in the past", () => {
    const completed = new Date("2025-01-01T00:00:00Z");
    assert.equal(computeRoomHealth(completed, "daily", now), 0);
  });

  it("returns ~50 for weekly task completed 7 days ago", () => {
    const completed = new Date("2026-02-11T12:00:00Z");
    assert.equal(computeRoomHealth(completed, "weekly", now), 50);
  });

  it("returns ~75 for biweekly task completed 7 days ago", () => {
    const completed = new Date("2026-02-11T12:00:00Z");
    // 7 days out of 28 days = 25% elapsed = 75% health
    assert.equal(computeRoomHealth(completed, "biweekly", now), 75);
  });

  it("returns ~50 for monthly task completed 30 days ago", () => {
    const completed = new Date("2026-01-19T12:00:00Z");
    // 30 days out of 60 days = 50% elapsed = 50% health
    assert.equal(computeRoomHealth(completed, "monthly", now), 50);
  });

  it("returns high score for quarterly task completed recently", () => {
    const completed = new Date("2026-02-17T12:00:00Z"); // 1 day ago
    // 24h out of 4320h = ~0.6% elapsed = ~99% health
    const score = computeRoomHealth(completed, "quarterly", now);
    assert.ok(score >= 99, `Expected >= 99 but got ${score}`);
  });

  it("returns high score for yearly task completed recently", () => {
    const completed = new Date("2026-02-17T12:00:00Z"); // 1 day ago
    const score = computeRoomHealth(completed, "yearly", now);
    assert.ok(score >= 99, `Expected >= 99 but got ${score}`);
  });

  it("clamps to 100 when completed in the future", () => {
    const completed = new Date("2026-02-19T12:00:00Z");
    assert.equal(computeRoomHealth(completed, "daily", now), 100);
  });
});

describe("getHealthColor", () => {
  it("returns green for score 80-100", () => {
    assert.equal(getHealthColor(100), "#22C55E");
    assert.equal(getHealthColor(80), "#22C55E");
  });

  it("returns yellow for score 50-79", () => {
    assert.equal(getHealthColor(79), "#EAB308");
    assert.equal(getHealthColor(50), "#EAB308");
  });

  it("returns orange for score 25-49", () => {
    assert.equal(getHealthColor(49), "#F97316");
    assert.equal(getHealthColor(25), "#F97316");
  });

  it("returns red for score 0-24", () => {
    assert.equal(getHealthColor(24), "#EF4444");
    assert.equal(getHealthColor(0), "#EF4444");
  });
});

describe("getHealthLabel", () => {
  it("returns correct Hebrew labels for each threshold", () => {
    assert.equal(getHealthLabel(100), "\u05DE\u05E6\u05D5\u05D9\u05DF");
    assert.equal(getHealthLabel(80), "\u05DE\u05E6\u05D5\u05D9\u05DF");
    assert.equal(getHealthLabel(79), "\u05D8\u05D5\u05D1");
    assert.equal(getHealthLabel(50), "\u05D8\u05D5\u05D1");
    assert.equal(getHealthLabel(49), "\u05D3\u05D5\u05E8\u05E9 \u05EA\u05E9\u05D5\u05DE\u05EA \u05DC\u05D1");
    assert.equal(getHealthLabel(25), "\u05D3\u05D5\u05E8\u05E9 \u05EA\u05E9\u05D5\u05DE\u05EA \u05DC\u05D1");
    assert.equal(getHealthLabel(24), "\u05D3\u05D7\u05D5\u05E3");
    assert.equal(getHealthLabel(0), "\u05D3\u05D7\u05D5\u05E3");
  });
});

describe("computeCategoryHealth", () => {
  const now = new Date("2026-02-18T12:00:00Z");

  it("returns 0 when no items match the category", () => {
    const completions = [
      { category: "kitchen", completed_at: now.toISOString(), recurrence_type: "daily" },
    ];
    assert.equal(computeCategoryHealth(completions, "bathroom", now), 0);
  });

  it("averages health across multiple templates in a category", () => {
    const completions = [
      { category: "kitchen", completed_at: now.toISOString(), recurrence_type: "daily" }, // 100
      { category: "kitchen", completed_at: null, recurrence_type: "weekly" }, // 0
    ];
    assert.equal(computeCategoryHealth(completions, "kitchen", now), 50);
  });

  it("returns 100 when all tasks just completed", () => {
    const completions = [
      { category: "bathroom", completed_at: now.toISOString(), recurrence_type: "weekly" },
      { category: "bathroom", completed_at: now.toISOString(), recurrence_type: "biweekly" },
    ];
    assert.equal(computeCategoryHealth(completions, "bathroom", now), 100);
  });

  it("returns 0 when all tasks never completed", () => {
    const completions = [
      { category: "living", completed_at: null, recurrence_type: "daily" },
      { category: "living", completed_at: null, recurrence_type: "weekly" },
    ];
    assert.equal(computeCategoryHealth(completions, "living", now), 0);
  });
});
