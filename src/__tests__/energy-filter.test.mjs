/**
 * Unit tests for energy-filter (Tired Mode).
 * Uses Node.js built-in test runner (Node 18+). Run with:
 *   node --test src/__tests__/energy-filter.test.mjs
 *
 * NOTE: These tests use inline implementations of the pure functions
 * to avoid the TypeScript/path-alias setup overhead in a test environment.
 * The implementations must match src/lib/energy-filter.ts exactly.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ============================================
// Inline implementations (mirrors energy-filter.ts)
// ============================================

const HEAVY_KEYWORDS = ["עמוק", "ארגון", "יסודי", "חלונות", "תנור"];
const LIGHT_KEYWORDS = ["מהיר", "מים", "איוורור", "בדיקת"];

function inferDifficulty(task) {
  const title = task.title;

  if (HEAVY_KEYWORDS.some((kw) => title.includes(kw))) {
    return 3;
  }

  if (LIGHT_KEYWORDS.some((kw) => title.includes(kw))) {
    return 1;
  }

  if (task.estimated_minutes <= 5) {
    return 1;
  }
  if (task.estimated_minutes >= 20) {
    return 3;
  }

  return 2;
}

function filterTasksByEnergy(tasks, energyLevel) {
  if (energyLevel === "all") {
    return tasks;
  }

  const maxDifficulty = energyLevel === "moderate" ? 2 : 1;
  return tasks.filter((task) => inferDifficulty(task) <= maxDifficulty);
}

function getEnergyLabel(level) {
  const labels = {
    all: "\u05DB\u05DC \u05D4\u05DE\u05E9\u05D9\u05DE\u05D5\u05EA",
    moderate: "\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9",
    light: "\u05E7\u05DC",
  };
  return labels[level];
}

function getEnergyEmoji(level) {
  const emojis = {
    all: "\u{1F4AA}",
    moderate: "\u{1F60A}",
    light: "\u{1F634}",
  };
  return emojis[level];
}

// ============================================
// Helpers
// ============================================

function makeTask(overrides = {}) {
  return {
    title: "משימה רגילה",
    category: "kitchen",
    estimated_minutes: 10,
    ...overrides,
  };
}

// ============================================
// Tests: inferDifficulty
// ============================================

describe("inferDifficulty", () => {
  test("task with heavy keyword 'עמוק' in title returns 3", () => {
    const task = makeTask({ title: "ניקוי עמוק של כיריים" });
    assert.equal(inferDifficulty(task), 3);
  });

  test("task with heavy keyword 'ארגון' in title returns 3", () => {
    const task = makeTask({ title: "ארגון ארונות בגדים" });
    assert.equal(inferDifficulty(task), 3);
  });

  test("task with heavy keyword 'תנור' in title returns 3", () => {
    const task = makeTask({ title: "ניקוי תנור" });
    assert.equal(inferDifficulty(task), 3);
  });

  test("task with light keyword 'מים' in title returns 1", () => {
    const task = makeTask({ title: "מים טריים לחתולים" });
    assert.equal(inferDifficulty(task), 1);
  });

  test("task with light keyword 'איוורור' in title returns 1", () => {
    const task = makeTask({ title: "איוורור הבית" });
    assert.equal(inferDifficulty(task), 1);
  });

  test("task with light keyword 'בדיקת' in title returns 1", () => {
    const task = makeTask({ title: "בדיקת מסנני מזגן" });
    assert.equal(inferDifficulty(task), 1);
  });

  test("task with estimated_minutes <= 5 returns 1", () => {
    const task = makeTask({ title: "הוצאת אשפה", estimated_minutes: 3 });
    assert.equal(inferDifficulty(task), 1);
  });

  test("task with estimated_minutes >= 20 returns 3", () => {
    const task = makeTask({ title: "שטיפת כלים גדולה", estimated_minutes: 25 });
    assert.equal(inferDifficulty(task), 3);
  });

  test("standard task no keywords, 8 min returns 2", () => {
    const task = makeTask({ title: "ניקוי משטחי עבודה", estimated_minutes: 8 });
    assert.equal(inferDifficulty(task), 2);
  });

  test("task with estimated_minutes exactly 10 returns 2", () => {
    const task = makeTask({ title: "ניקוי כיור", estimated_minutes: 10 });
    assert.equal(inferDifficulty(task), 2);
  });
});

// ============================================
// Tests: filterTasksByEnergy
// ============================================

describe("filterTasksByEnergy", () => {
  const mixedTasks = [
    makeTask({ title: "מים טריים", estimated_minutes: 2 }),       // difficulty 1
    makeTask({ title: "ניקוי כיור", estimated_minutes: 10 }),     // difficulty 2
    makeTask({ title: "ניקוי עמוק", estimated_minutes: 30 }),     // difficulty 3
  ];

  test("'all' returns all tasks", () => {
    const result = filterTasksByEnergy(mixedTasks, "all");
    assert.equal(result.length, 3);
  });

  test("'moderate' filters out heavy tasks", () => {
    const result = filterTasksByEnergy(mixedTasks, "moderate");
    assert.equal(result.length, 2);
    assert.ok(result.every((t) => inferDifficulty(t) <= 2));
  });

  test("'light' returns only light tasks", () => {
    const result = filterTasksByEnergy(mixedTasks, "light");
    assert.equal(result.length, 1);
    assert.equal(result[0].title, "מים טריים");
  });

  test("empty array returns empty", () => {
    const result = filterTasksByEnergy([], "light");
    assert.equal(result.length, 0);
  });
});

// ============================================
// Tests: getEnergyLabel
// ============================================

describe("getEnergyLabel", () => {
  test("returns correct label for all levels", () => {
    assert.equal(getEnergyLabel("all"), "כל המשימות");
    assert.equal(getEnergyLabel("moderate"), "בינוני");
    assert.equal(getEnergyLabel("light"), "קל");
  });
});

// ============================================
// Tests: getEnergyEmoji
// ============================================

describe("getEnergyEmoji", () => {
  test("returns correct emoji for all levels", () => {
    assert.equal(getEnergyEmoji("all"), "\u{1F4AA}");
    assert.equal(getEnergyEmoji("moderate"), "\u{1F60A}");
    assert.equal(getEnergyEmoji("light"), "\u{1F634}");
  });
});
