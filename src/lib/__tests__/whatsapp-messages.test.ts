/**
 * Unit tests for WhatsApp message builders.
 * Tests message structure, numbered task lists, and Hebrew content.
 */

import { describe, it, expect } from "vitest";
import {
  buildMorningBrief,
  buildEveningSummary,
  buildFridayCelebration,
  type DailyBriefData,
  type DailySummaryData,
} from "@/lib/whatsapp-messages";

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeBriefData(overrides: Partial<DailyBriefData> = {}): DailyBriefData {
  return {
    names: ["אלעד", "ענבל"],
    todayTasks: [
      { title: "שטיפת כלים", assignedTo: "אלעד" },
      { title: "ניקוי שירותים", assignedTo: null },
    ],
    streak: 3,
    dayOfWeek: "ראשון",
    ...overrides,
  };
}

function makeSummaryData(overrides: Partial<DailySummaryData> = {}): DailySummaryData {
  return {
    names: ["אלעד", "ענבל"],
    completedCount: 4,
    totalCount: 5,
    completedTasks: ["שטיפת כלים", "ניקוי שירותים"],
    remainingTasks: ["הוצאת אשפה"],
    streak: 2,
    topPerformer: null,
    ...overrides,
  };
}

// ── buildMorningBrief ──────────────────────────────────────────────────────────

describe("buildMorningBrief — structure", () => {
  it("returns a non-empty string", () => {
    const msg = buildMorningBrief(makeBriefData());
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("contains the BayitBeSeder signature", () => {
    const msg = buildMorningBrief(makeBriefData());
    expect(msg).toContain("בית בסדר");
  });

  it("includes the day of week", () => {
    const msg = buildMorningBrief(makeBriefData({ dayOfWeek: "שלישי" }));
    expect(msg).toContain("שלישי");
  });

  it("includes numbered task list for multiple tasks", () => {
    const data = makeBriefData({
      todayTasks: [
        { title: "משימה א", assignedTo: null },
        { title: "משימה ב", assignedTo: null },
      ],
    });
    const msg = buildMorningBrief(data);
    expect(msg).toContain("1.");
    expect(msg).toContain("2.");
    expect(msg).toContain("משימה א");
    expect(msg).toContain("משימה ב");
  });

  it("includes streak line when streak > 0", () => {
    const msg = buildMorningBrief(makeBriefData({ streak: 5 }));
    expect(msg).toContain("5");
  });

  it("contains Shabbat bonus line when dayOfWeek is 'שישי'", () => {
    const msg = buildMorningBrief(makeBriefData({ dayOfWeek: "שישי" }));
    expect(msg).toContain("שבת");
  });
});

// ── buildEveningSummary ────────────────────────────────────────────────────────

describe("buildEveningSummary — structure", () => {
  it("returns a non-empty string", () => {
    const msg = buildEveningSummary(makeSummaryData());
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("contains completed/total task counts", () => {
    const msg = buildEveningSummary(makeSummaryData({ completedCount: 3, totalCount: 5 }));
    expect(msg).toContain("3");
    expect(msg).toContain("5");
  });

  it("contains 100% celebration text when all tasks completed", () => {
    const msg = buildEveningSummary(
      makeSummaryData({ completedCount: 5, totalCount: 5, remainingTasks: [] })
    );
    // Should contain one of the celebration phrases
    const hasCelebration =
      msg.includes("100%") ||
      msg.includes("מושלם") ||
      msg.includes("מנצח") ||
      msg.includes("מרשים");
    expect(hasCelebration).toBe(true);
  });

  it("contains BayitBeSeder signature", () => {
    const msg = buildEveningSummary(makeSummaryData());
    expect(msg).toContain("בית בסדר");
  });
});

// ── buildFridayCelebration ─────────────────────────────────────────────────────

describe("buildFridayCelebration", () => {
  it("returns a non-empty string", () => {
    const msg = buildFridayCelebration(10, 12, 5);
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("contains 'שבת שלום'", () => {
    const msg = buildFridayCelebration(10, 12, 5);
    expect(msg).toContain("שבת שלום");
  });

  it("contains the completed/total counts", () => {
    const msg = buildFridayCelebration(7, 10, 3);
    expect(msg).toContain("7");
    expect(msg).toContain("10");
  });

  it("includes percentage calculation", () => {
    const msg = buildFridayCelebration(10, 10, 0);
    expect(msg).toContain("100%");
  });
});
