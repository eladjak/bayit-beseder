/**
 * Unit tests for the CHALLENGE_POOL and pickWeeklyChallenges utility.
 * Validates pool integrity, required fields, no duplicate IDs,
 * and deterministic weekly challenge selection.
 */

import { describe, it, expect } from "vitest";
import { CHALLENGE_POOL, pickWeeklyChallenges, getISOWeekNumber } from "@/lib/challenges";
import type { WeeklyChallenge } from "@/lib/challenges";

const VALID_TYPES: WeeklyChallenge["type"][] = ["individual", "household"];

describe("CHALLENGE_POOL — array integrity", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(CHALLENGE_POOL)).toBe(true);
    expect(CHALLENGE_POOL.length).toBeGreaterThan(0);
  });

  it("has at least 10 challenges", () => {
    expect(CHALLENGE_POOL.length).toBeGreaterThanOrEqual(10);
  });

  it("includes both individual and household challenges", () => {
    const types = new Set(CHALLENGE_POOL.map((c) => c.type));
    expect(types).toContain("individual");
    expect(types).toContain("household");
  });
});

describe("CHALLENGE_POOL — required fields on every entry", () => {
  it("every challenge has a non-empty id string", () => {
    for (const c of CHALLENGE_POOL) {
      expect(typeof c.id).toBe("string");
      expect(c.id.length).toBeGreaterThan(0);
    }
  });

  it("every challenge has a non-empty title string", () => {
    for (const c of CHALLENGE_POOL) {
      expect(typeof c.title).toBe("string");
      expect(c.title.length).toBeGreaterThan(0);
    }
  });

  it("every challenge has a non-empty description string", () => {
    for (const c of CHALLENGE_POOL) {
      expect(typeof c.description).toBe("string");
      expect(c.description.length).toBeGreaterThan(0);
    }
  });

  it("every challenge has a non-empty icon string", () => {
    for (const c of CHALLENGE_POOL) {
      expect(typeof c.icon).toBe("string");
      expect(c.icon.length).toBeGreaterThan(0);
    }
  });

  it("every challenge has a positive target number", () => {
    for (const c of CHALLENGE_POOL) {
      expect(typeof c.target).toBe("number");
      expect(c.target).toBeGreaterThan(0);
    }
  });

  it("every challenge has a positive reward number", () => {
    for (const c of CHALLENGE_POOL) {
      expect(typeof c.reward).toBe("number");
      expect(c.reward).toBeGreaterThan(0);
    }
  });

  it("every challenge type is valid", () => {
    for (const c of CHALLENGE_POOL) {
      expect(VALID_TYPES).toContain(c.type);
    }
  });
});

describe("CHALLENGE_POOL — uniqueness", () => {
  it("no two challenges share the same id", () => {
    const ids = CHALLENGE_POOL.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("pickWeeklyChallenges", () => {
  it("always returns exactly 3 challenges", () => {
    for (const weekNum of [1, 5, 10, 13, 26, 52]) {
      const picks = pickWeeklyChallenges(weekNum);
      expect(picks).toHaveLength(3);
    }
  });

  it("always includes exactly 1 household challenge", () => {
    for (const weekNum of [1, 5, 10, 26, 52]) {
      const picks = pickWeeklyChallenges(weekNum);
      const householdCount = picks.filter((c) => c.type === "household").length;
      expect(householdCount).toBe(1);
    }
  });

  it("always includes exactly 2 individual challenges", () => {
    for (const weekNum of [1, 5, 10, 26, 52]) {
      const picks = pickWeeklyChallenges(weekNum);
      const individualCount = picks.filter((c) => c.type === "individual").length;
      expect(individualCount).toBe(2);
    }
  });

  it("is deterministic — same week number always returns same challenges", () => {
    const first = pickWeeklyChallenges(7);
    const second = pickWeeklyChallenges(7);
    expect(first.map((c) => c.id)).toEqual(second.map((c) => c.id));
  });

  it("returns different picks for different week numbers", () => {
    // Not guaranteed for every pair, but a few weeks apart should differ
    const week1 = pickWeeklyChallenges(1);
    const week10 = pickWeeklyChallenges(10);
    // At least one challenge should differ
    const allSame = week1.every((c, i) => c.id === week10[i].id);
    expect(allSame).toBe(false);
  });

  it("all returned challenges belong to CHALLENGE_POOL", () => {
    const poolIds = new Set(CHALLENGE_POOL.map((c) => c.id));
    for (const weekNum of [1, 5, 10]) {
      for (const pick of pickWeeklyChallenges(weekNum)) {
        expect(poolIds).toContain(pick.id);
      }
    }
  });

  it("the two individual picks have different ids", () => {
    for (const weekNum of [1, 2, 3, 4, 5, 10, 52]) {
      const picks = pickWeeklyChallenges(weekNum);
      const individualPicks = picks.filter((c) => c.type === "individual");
      expect(individualPicks[0].id).not.toBe(individualPicks[1].id);
    }
  });
});

describe("getISOWeekNumber", () => {
  it("returns a number between 1 and 53", () => {
    const testDates = [
      new Date("2026-01-01"),
      new Date("2026-06-15"),
      new Date("2026-12-31"),
      new Date("2024-01-01"),
    ];
    for (const d of testDates) {
      const wk = getISOWeekNumber(d);
      expect(wk).toBeGreaterThanOrEqual(1);
      expect(wk).toBeLessThanOrEqual(53);
    }
  });

  it("consecutive weeks differ by 1 (mid-year)", () => {
    const week20 = getISOWeekNumber(new Date("2026-05-11")); // Monday of week 20
    const week21 = getISOWeekNumber(new Date("2026-05-18")); // Monday of week 21
    expect(week21 - week20).toBe(1);
  });
});
