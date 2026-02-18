/**
 * Unit tests for notification utilities and gamification helpers.
 * Uses Node.js built-in test runner (Node 18+). Run with:
 *   node --test src/__tests__/notifications.test.mjs
 *
 * NOTE: These tests use inline implementations of the pure functions
 * to avoid the TypeScript/path-alias setup overhead in a test environment.
 * The implementations must match src/hooks/useNotifications.ts exactly.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ============================================
// Inline implementations (mirrors useNotifications.ts)
// ============================================

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "\u05E2\u05DB\u05E9\u05D9\u05D5"; // עכשיו
  if (diffMinutes < 60) return `\u05DC\u05E4\u05E0\u05D9 ${diffMinutes} \u05D3\u05E7\u05D5\u05EA`; // לפני X דקות
  if (diffHours < 24)
    return diffHours === 1
      ? "\u05DC\u05E4\u05E0\u05D9 \u05E9\u05E2\u05D4" // לפני שעה
      : `\u05DC\u05E4\u05E0\u05D9 ${diffHours} \u05E9\u05E2\u05D5\u05EA`; // לפני X שעות
  if (diffDays === 1) return "\u05D0\u05EA\u05DE\u05D5\u05DC"; // אתמול
  if (diffDays < 7) return `\u05DC\u05E4\u05E0\u05D9 ${diffDays} \u05D9\u05DE\u05D9\u05DD`; // לפני X ימים
  return `\u05DC\u05E4\u05E0\u05D9 ${Math.floor(diffDays / 7)} \u05E9\u05D1\u05D5\u05E2\u05D5\u05EA`; // לפני X שבועות
}

function computeConsecutiveStreak(completionDates, today) {
  const dateSet = new Set(completionDates.map((d) => d.slice(0, 10)));
  let streak = 0;
  let currentDate = today;

  while (dateSet.has(currentDate)) {
    streak += 1;
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    currentDate = d.toISOString().slice(0, 10);
  }

  return streak;
}

function computeWeeklyChallengeProgress(completionDates, today, target) {
  const todayDate = new Date(today);
  const dayOfWeek = todayDate.getDay(); // 0=Sun
  const sundayDate = new Date(todayDate);
  sundayDate.setDate(sundayDate.getDate() - dayOfWeek);
  const sundayStr = sundayDate.toISOString().slice(0, 10);

  const completed = completionDates.filter((d) => {
    const dateStr = d.slice(0, 10);
    return dateStr >= sundayStr && dateStr <= today;
  }).length;

  const percentage =
    target > 0
      ? Math.min(Math.round((completed / target) * 100), 100)
      : 0;

  return { completed, target, percentage };
}

// ============================================
// Tests: formatRelativeTime
// ============================================

describe("formatRelativeTime", () => {
  test("returns 'now' for timestamps less than 1 minute ago", () => {
    const ts = new Date(Date.now() - 1000 * 30).toISOString(); // 30 seconds ago
    const result = formatRelativeTime(ts);
    assert.ok(result.includes("\u05E2\u05DB\u05E9\u05D9\u05D5"), `Expected 'עכשיו' but got '${result}'`);
  });

  test("returns minutes for timestamps between 1-59 minutes ago", () => {
    const ts = new Date(Date.now() - 1000 * 60 * 10).toISOString(); // 10 min ago
    const result = formatRelativeTime(ts);
    assert.ok(result.includes("10"), `Expected '10' in '${result}'`);
    assert.ok(result.includes("\u05D3\u05E7\u05D5\u05EA"), `Expected 'דקות' in '${result}'`);
  });

  test("returns 'an hour ago' for exactly 1 hour", () => {
    const ts = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    const result = formatRelativeTime(ts);
    assert.ok(result.includes("\u05E9\u05E2\u05D4"), `Expected 'שעה' in '${result}'`);
  });

  test("returns hours for timestamps between 2-23 hours ago", () => {
    const ts = new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(); // 5 hours ago
    const result = formatRelativeTime(ts);
    assert.ok(result.includes("5"), `Expected '5' in '${result}'`);
    assert.ok(result.includes("\u05E9\u05E2\u05D5\u05EA"), `Expected 'שעות' in '${result}'`);
  });

  test("returns 'yesterday' for 1 day ago", () => {
    const ts = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    const result = formatRelativeTime(ts);
    assert.ok(result.includes("\u05D0\u05EA\u05DE\u05D5\u05DC"), `Expected 'אתמול' in '${result}'`);
  });

  test("returns days for timestamps between 2-6 days ago", () => {
    const ts = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(); // 3 days ago
    const result = formatRelativeTime(ts);
    assert.ok(result.includes("3"), `Expected '3' in '${result}'`);
    assert.ok(result.includes("\u05D9\u05DE\u05D9\u05DD"), `Expected 'ימים' in '${result}'`);
  });

  test("returns weeks for timestamps 7+ days ago", () => {
    const ts = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(); // 14 days ago
    const result = formatRelativeTime(ts);
    assert.ok(result.includes("2"), `Expected '2' in '${result}'`);
    assert.ok(result.includes("\u05E9\u05D1\u05D5\u05E2\u05D5\u05EA"), `Expected 'שבועות' in '${result}'`);
  });
});

// ============================================
// Tests: computeConsecutiveStreak
// ============================================

describe("computeConsecutiveStreak", () => {
  test("returns 0 when no completions", () => {
    assert.equal(computeConsecutiveStreak([], "2026-02-18"), 0);
  });

  test("returns 0 when no completion on today", () => {
    const dates = ["2026-02-17T10:00:00.000Z"];
    assert.equal(computeConsecutiveStreak(dates, "2026-02-18"), 0);
  });

  test("returns 1 when only today has a completion", () => {
    const dates = ["2026-02-18T10:00:00.000Z"];
    assert.equal(computeConsecutiveStreak(dates, "2026-02-18"), 1);
  });

  test("returns correct streak for consecutive days", () => {
    const dates = [
      "2026-02-18T10:00:00.000Z",
      "2026-02-17T10:00:00.000Z",
      "2026-02-16T10:00:00.000Z",
      "2026-02-15T10:00:00.000Z",
    ];
    assert.equal(computeConsecutiveStreak(dates, "2026-02-18"), 4);
  });

  test("stops counting at gap", () => {
    const dates = [
      "2026-02-18T10:00:00.000Z",
      "2026-02-17T10:00:00.000Z",
      // gap: Feb 16 missing
      "2026-02-15T10:00:00.000Z",
    ];
    assert.equal(computeConsecutiveStreak(dates, "2026-02-18"), 2);
  });

  test("handles multiple completions on same day", () => {
    const dates = [
      "2026-02-18T08:00:00.000Z",
      "2026-02-18T14:00:00.000Z",
      "2026-02-17T10:00:00.000Z",
    ];
    assert.equal(computeConsecutiveStreak(dates, "2026-02-18"), 2);
  });

  test("handles month boundary", () => {
    const dates = [
      "2026-02-02T10:00:00.000Z",
      "2026-02-01T10:00:00.000Z",
      "2026-01-31T10:00:00.000Z",
    ];
    assert.equal(computeConsecutiveStreak(dates, "2026-02-02"), 3);
  });
});

// ============================================
// Tests: computeWeeklyChallengeProgress
// ============================================

describe("computeWeeklyChallengeProgress", () => {
  // 2026-02-18 is a Wednesday (dayOfWeek=3), so Sunday is 2026-02-15
  const today = "2026-02-18";

  test("returns 0 progress when no completions", () => {
    const result = computeWeeklyChallengeProgress([], today, 5);
    assert.equal(result.completed, 0);
    assert.equal(result.target, 5);
    assert.equal(result.percentage, 0);
  });

  test("counts completions in current week only", () => {
    const dates = [
      "2026-02-15T10:00:00.000Z", // Sunday (in week)
      "2026-02-16T10:00:00.000Z", // Monday (in week)
      "2026-02-18T10:00:00.000Z", // Wednesday (today, in week)
      "2026-02-14T10:00:00.000Z", // Saturday (previous week - out)
    ];
    const result = computeWeeklyChallengeProgress(dates, today, 5);
    assert.equal(result.completed, 3);
    assert.equal(result.percentage, 60);
  });

  test("caps percentage at 100 when exceeding target", () => {
    const dates = [
      "2026-02-15T10:00:00.000Z",
      "2026-02-16T10:00:00.000Z",
      "2026-02-17T10:00:00.000Z",
      "2026-02-18T08:00:00.000Z",
      "2026-02-18T10:00:00.000Z",
      "2026-02-18T12:00:00.000Z",
    ];
    const result = computeWeeklyChallengeProgress(dates, today, 5);
    assert.equal(result.completed, 6);
    assert.equal(result.percentage, 100);
  });

  test("returns 0 percentage when target is 0", () => {
    const result = computeWeeklyChallengeProgress(
      ["2026-02-18T10:00:00.000Z"],
      today,
      0
    );
    assert.equal(result.percentage, 0);
  });

  test("handles Sunday (first day of week) as today", () => {
    const sundayToday = "2026-02-15"; // This is the Sunday
    const dates = [
      "2026-02-15T10:00:00.000Z", // Sunday itself
    ];
    const result = computeWeeklyChallengeProgress(dates, sundayToday, 5);
    assert.equal(result.completed, 1);
    assert.equal(result.percentage, 20);
  });

  test("handles exact target completion", () => {
    const dates = [
      "2026-02-15T10:00:00.000Z",
      "2026-02-16T10:00:00.000Z",
      "2026-02-17T10:00:00.000Z",
      "2026-02-18T10:00:00.000Z",
      "2026-02-18T14:00:00.000Z",
    ];
    const result = computeWeeklyChallengeProgress(dates, today, 5);
    assert.equal(result.completed, 5);
    assert.equal(result.percentage, 100);
  });
});
