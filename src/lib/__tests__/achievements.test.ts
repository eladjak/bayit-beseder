/**
 * Unit tests for the ACHIEVEMENTS array.
 * Validates structure, required fields, valid categories, and uniqueness.
 */

import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS } from "@/lib/achievements";
import type { Achievement } from "@/lib/achievements";

const VALID_CATEGORIES: Achievement["category"][] = [
  "streak",
  "completion",
  "special",
  "collaboration",
  "mastery",
  "milestone",
];

describe("ACHIEVEMENTS — array integrity", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(ACHIEVEMENTS)).toBe(true);
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0);
  });

  it("has at least 20 achievements", () => {
    // Current count is 24 — guard against accidental deletions
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(20);
  });
});

describe("ACHIEVEMENTS — required fields on every entry", () => {
  it("every achievement has a non-empty code string", () => {
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.code).toBe("string");
      expect(a.code.length).toBeGreaterThan(0);
    }
  });

  it("every achievement has a non-empty title string", () => {
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.title).toBe("string");
      expect(a.title.length).toBeGreaterThan(0);
    }
  });

  it("every achievement has a non-empty description string", () => {
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.description).toBe("string");
      expect(a.description.length).toBeGreaterThan(0);
    }
  });

  it("every achievement has a non-empty icon string", () => {
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.icon).toBe("string");
      expect(a.icon.length).toBeGreaterThan(0);
    }
  });

  it("every achievement has a positive threshold number", () => {
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.threshold).toBe("number");
      expect(a.threshold).toBeGreaterThan(0);
    }
  });

  it("every achievement has a positive points number", () => {
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.points).toBe("number");
      expect(a.points).toBeGreaterThan(0);
    }
  });
});

describe("ACHIEVEMENTS — valid categories", () => {
  it("every achievement category is one of the defined values", () => {
    for (const a of ACHIEVEMENTS) {
      expect(VALID_CATEGORIES).toContain(a.category);
    }
  });

  it("covers all 6 category types", () => {
    const usedCategories = new Set(ACHIEVEMENTS.map((a) => a.category));
    for (const cat of VALID_CATEGORIES) {
      expect(usedCategories).toContain(cat);
    }
  });
});

describe("ACHIEVEMENTS — uniqueness", () => {
  it("no two achievements share the same code", () => {
    const codes = ACHIEVEMENTS.map((a) => a.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});
