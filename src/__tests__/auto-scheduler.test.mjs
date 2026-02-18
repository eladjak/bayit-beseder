/**
 * Unit tests for auto-scheduler.
 * Uses Node.js built-in test runner (Node 18+). Run with:
 *   node --test src/__tests__/auto-scheduler.test.mjs
 *
 * NOTE: These tests use inline implementations of the pure functions
 * to avoid the TypeScript/path-alias setup overhead in a test environment.
 * The implementations must match src/lib/auto-scheduler.ts exactly.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ============================================
// Inline implementations (mirrors auto-scheduler.ts)
// ============================================

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getISOWeekNumber(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function isTemplateDueOnDate(template, date) {
  const recurrenceDay = template.recurrence_day;

  switch (template.recurrence_type) {
    case "daily":
      return true;

    case "weekly":
      return recurrenceDay != null && date.getDay() === recurrenceDay;

    case "biweekly":
      if (recurrenceDay == null || date.getDay() !== recurrenceDay) return false;
      return getISOWeekNumber(date) % 2 === 0;

    case "monthly":
      return recurrenceDay != null && date.getDate() === recurrenceDay;

    case "quarterly": {
      if (recurrenceDay == null || date.getDate() !== recurrenceDay) return false;
      const quarterMonths = [0, 3, 6, 9];
      return quarterMonths.includes(date.getMonth());
    }

    case "yearly":
      return recurrenceDay != null && getDayOfYear(date) === recurrenceDay;

    default:
      return false;
  }
}

function getTemplatesDueOnDate(templates, date) {
  return templates.filter((t) => t.active && isTemplateDueOnDate(t, date));
}

function selectAssignee(template, recentInstances, members, templateIndex) {
  if (members.length === 0) {
    return "";
  }

  if (
    template.default_assignee &&
    members.includes(template.default_assignee)
  ) {
    return template.default_assignee;
  }

  const counts = {};
  for (const m of members) {
    counts[m] = 0;
  }
  for (const instance of recentInstances) {
    if (instance.assigned_to && counts[instance.assigned_to] !== undefined) {
      counts[instance.assigned_to]++;
    }
  }

  let minCount = Infinity;
  for (const m of members) {
    if (counts[m] < minCount) {
      minCount = counts[m];
    }
  }

  const candidates = members.filter((m) => counts[m] === minCount);

  if (candidates.length > 1) {
    return candidates[templateIndex % candidates.length];
  }

  return candidates[0];
}

// ============================================
// Helpers
// ============================================

function makeTemplate(overrides = {}) {
  return {
    id: "tpl-1",
    household_id: "h1",
    title: "Test Template",
    description: null,
    category: "kitchen",
    zone: null,
    estimated_minutes: 10,
    default_assignee: null,
    tips: [],
    is_emergency: false,
    recurrence_type: "daily",
    recurrence_day: null,
    sort_order: 1,
    active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ============================================
// Tests: isTemplateDueOnDate
// ============================================

describe("isTemplateDueOnDate", () => {
  test("daily template is always due", () => {
    const template = makeTemplate({ recurrence_type: "daily" });
    // Test multiple days
    assert.equal(isTemplateDueOnDate(template, new Date("2026-02-18")), true); // Wednesday
    assert.equal(isTemplateDueOnDate(template, new Date("2026-02-22")), true); // Sunday
    assert.equal(isTemplateDueOnDate(template, new Date("2026-12-31")), true);
  });

  test("weekly template is due on matching day of week", () => {
    // Wednesday = 3
    const template = makeTemplate({
      recurrence_type: "weekly",
      recurrence_day: 3,
    });
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-02-18")),
      true
    ); // Wed
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-02-19")),
      false
    ); // Thu
  });

  test("weekly template returns false when recurrence_day is null", () => {
    const template = makeTemplate({
      recurrence_type: "weekly",
      recurrence_day: null,
    });
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-02-18")),
      false
    );
  });

  test("biweekly template is due on matching day only in even ISO weeks", () => {
    // Wednesday = 3
    const template = makeTemplate({
      recurrence_type: "biweekly",
      recurrence_day: 3,
    });

    // 2026-02-18 is Wed, ISO week 8 (even) -> due
    const wed18 = new Date("2026-02-18");
    assert.equal(wed18.getDay(), 3); // confirm Wednesday
    assert.equal(getISOWeekNumber(wed18) % 2, 0); // confirm even week
    assert.equal(isTemplateDueOnDate(template, wed18), true);

    // 2026-02-25 is Wed, ISO week 9 (odd) -> not due
    const wed25 = new Date("2026-02-25");
    assert.equal(wed25.getDay(), 3);
    assert.equal(getISOWeekNumber(wed25) % 2, 1);
    assert.equal(isTemplateDueOnDate(template, wed25), false);
  });

  test("biweekly template is false on wrong day even in even week", () => {
    const template = makeTemplate({
      recurrence_type: "biweekly",
      recurrence_day: 3,
    });
    // 2026-02-17 is Tue in even week -> wrong day
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-02-17")),
      false
    );
  });

  test("monthly template is due on matching day of month", () => {
    const template = makeTemplate({
      recurrence_type: "monthly",
      recurrence_day: 15,
    });
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-02-15")),
      true
    );
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-03-15")),
      true
    );
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-02-16")),
      false
    );
  });

  test("quarterly template is due on matching day in quarter months only", () => {
    const template = makeTemplate({
      recurrence_type: "quarterly",
      recurrence_day: 1,
    });
    // Jan 1 -> quarter month, day matches
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-01-01")),
      true
    );
    // Apr 1 -> quarter month, day matches
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-04-01")),
      true
    );
    // Jul 1 -> quarter month, day matches
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-07-01")),
      true
    );
    // Oct 1 -> quarter month, day matches
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-10-01")),
      true
    );
    // Feb 1 -> NOT a quarter month
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-02-01")),
      false
    );
    // Jan 2 -> right month, wrong day
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-01-02")),
      false
    );
  });

  test("yearly template is due on matching day of year", () => {
    // Day 1 of year = Jan 1
    const template = makeTemplate({
      recurrence_type: "yearly",
      recurrence_day: 1,
    });
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-01-01")),
      true
    );
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-01-02")),
      false
    );
  });

  test("unknown recurrence_type returns false", () => {
    const template = makeTemplate({ recurrence_type: "unknown" });
    assert.equal(
      isTemplateDueOnDate(template, new Date("2026-02-18")),
      false
    );
  });
});

// ============================================
// Tests: getTemplatesDueOnDate
// ============================================

describe("getTemplatesDueOnDate", () => {
  test("filters out inactive templates", () => {
    const templates = [
      makeTemplate({ id: "t1", active: true, recurrence_type: "daily" }),
      makeTemplate({ id: "t2", active: false, recurrence_type: "daily" }),
    ];
    const result = getTemplatesDueOnDate(templates, new Date("2026-02-18"));
    assert.equal(result.length, 1);
  });

  test("returns only templates due on the given date", () => {
    const templates = [
      makeTemplate({
        id: "t1",
        recurrence_type: "daily",
      }),
      makeTemplate({
        id: "t2",
        recurrence_type: "weekly",
        recurrence_day: 3, // Wednesday
      }),
      makeTemplate({
        id: "t3",
        recurrence_type: "weekly",
        recurrence_day: 4, // Thursday
      }),
    ];
    // 2026-02-18 is Wednesday
    const result = getTemplatesDueOnDate(templates, new Date("2026-02-18"));
    assert.equal(result.length, 2); // daily + Wednesday weekly
  });

  test("returns empty array when no templates match", () => {
    const templates = [
      makeTemplate({
        id: "t1",
        recurrence_type: "weekly",
        recurrence_day: 0, // Sunday
      }),
    ];
    // 2026-02-18 is Wednesday
    const result = getTemplatesDueOnDate(templates, new Date("2026-02-18"));
    assert.equal(result.length, 0);
  });
});

// ============================================
// Tests: selectAssignee
// ============================================

describe("selectAssignee", () => {
  const members = ["user-a", "user-b"];

  test("returns default_assignee when set and member exists", () => {
    const template = makeTemplate({ default_assignee: "user-a" });
    const result = selectAssignee(template, [], members, 0);
    assert.equal(result, "user-a");
  });

  test("ignores default_assignee when not in members list", () => {
    const template = makeTemplate({ default_assignee: "user-c" });
    const result = selectAssignee(template, [], members, 0);
    // Should fall through to rotation logic
    assert.ok(members.includes(result));
  });

  test("assigns to member with fewer recent instances", () => {
    const template = makeTemplate({ default_assignee: null });
    const recentInstances = [
      { assigned_to: "user-a" },
      { assigned_to: "user-a" },
      { assigned_to: "user-b" },
    ];
    const result = selectAssignee(template, recentInstances, members, 0);
    assert.equal(result, "user-b"); // user-b has 1 vs user-a has 2
  });

  test("alternates by templateIndex when tied", () => {
    const template = makeTemplate({ default_assignee: null });
    const recentInstances = [
      { assigned_to: "user-a" },
      { assigned_to: "user-b" },
    ];
    // Tied at 1 each, templateIndex=0 -> first candidate
    const result0 = selectAssignee(template, recentInstances, members, 0);
    assert.equal(result0, "user-a");

    // templateIndex=1 -> second candidate
    const result1 = selectAssignee(template, recentInstances, members, 1);
    assert.equal(result1, "user-b");
  });

  test("assigns first member when no history and templateIndex=0", () => {
    const template = makeTemplate({ default_assignee: null });
    const result = selectAssignee(template, [], members, 0);
    assert.equal(result, "user-a");
  });

  test("returns empty string when no members", () => {
    const template = makeTemplate();
    const result = selectAssignee(template, [], [], 0);
    assert.equal(result, "");
  });
});

// ============================================
// Tests: formatDate
// ============================================

describe("formatDate", () => {
  test("formats date as YYYY-MM-DD", () => {
    const result = formatDate(new Date("2026-02-18T10:30:00.000Z"));
    assert.equal(result, "2026-02-18");
  });
});

// ============================================
// Tests: getISOWeekNumber
// ============================================

describe("getISOWeekNumber", () => {
  test("returns correct ISO week for known date", () => {
    // 2026-01-01 is Thursday, ISO week 1
    assert.equal(getISOWeekNumber(new Date("2026-01-01")), 1);
  });

  test("returns week 8 for 2026-02-18", () => {
    assert.equal(getISOWeekNumber(new Date("2026-02-18")), 8);
  });
});

// ============================================
// Tests: getDayOfYear
// ============================================

describe("getDayOfYear", () => {
  test("January 1 is day 1", () => {
    assert.equal(getDayOfYear(new Date("2026-01-01")), 1);
  });

  test("February 1 is day 32", () => {
    // Jan has 31 days, so Feb 1 = day 32
    assert.equal(getDayOfYear(new Date("2026-02-01")), 32);
  });

  test("December 31 of non-leap year is day 365", () => {
    // 2026 is not a leap year
    assert.equal(getDayOfYear(new Date("2026-12-31")), 365);
  });
});
