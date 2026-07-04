/**
 * Compassionate-brief tests (2026-07-05).
 *
 * The rule: overdue tasks must never become a shame wall.
 *  - 0 overdue        → say nothing
 *  - 1-3 overdue      → honest small number, with agency
 *  - 4+ overdue       → NEVER print the number; offer a "fresh start" instead
 * Applies to buildKindOverdueLine (shared helper) and to
 * buildAdaptiveMorningBrief (which must drop {overdueCount} templates
 * when the pile is big).
 */

import { describe, it, expect } from "vitest";
import { buildKindOverdueLine } from "@/lib/whatsapp-messages";
import { buildAdaptiveMorningBrief } from "@/lib/coaching-messages-adaptive";
import type { MorningTemplateVars } from "@/lib/coaching-messages-adaptive";
import type { CoachingStyle } from "@/lib/coaching-tracker";

// ── buildKindOverdueLine ───────────────────────────────────────────────────────

describe("buildKindOverdueLine", () => {
  it("returns empty string for 0 overdue", () => {
    expect(buildKindOverdueLine(0)).toBe("");
    expect(buildKindOverdueLine(-1)).toBe("");
  });

  it("names the number for small piles (1-3) with agency wording", () => {
    for (const n of [1, 2, 3]) {
      const line = buildKindOverdueLine(n);
      expect(line).toContain(String(n));
      expect(line).toContain("אפשר");
      expect(line).not.toContain("⚠️");
    }
  });

  it("NEVER prints the number for big piles (4+), offers fresh start", () => {
    for (const n of [4, 10, 43, 100]) {
      const line = buildKindOverdueLine(n);
      expect(line).not.toContain(String(n));
      expect(line).toContain("התחלה נקייה");
      expect(line).not.toContain("⚠️");
      expect(line).not.toContain("באיחור");
    }
  });
});

// ── buildAdaptiveMorningBrief — no shame wall in any style ────────────────────

const STYLES: CoachingStyle[] = ["encouraging", "factual", "playful", "urgent"];

function makeVars(overrides: Partial<MorningTemplateVars> = {}): MorningTemplateVars {
  return { count: 2, firstTask: "שטיפת כלים", streak: 0, overdueCount: 43, ...overrides };
}

describe("buildAdaptiveMorningBrief — compassionate overdue", () => {
  it("never prints a big overdue count (43) in ANY style, across many rolls", () => {
    for (const style of STYLES) {
      for (let roll = 0; roll < 25; roll++) {
        const msg = buildAdaptiveMorningBrief(style, makeVars(), "1. שטיפת כלים", "ראשון");
        expect(msg, `style=${style}`).not.toContain("43");
        expect(msg, `style=${style}`).toContain("התחלה נקייה");
      }
    }
  });

  it("keeps the honest small number (2 overdue) — templates may mention it", () => {
    // Small piles are allowed to interpolate the real number; the kind
    // fresh-start line must NOT appear.
    for (let roll = 0; roll < 10; roll++) {
      const msg = buildAdaptiveMorningBrief(
        "factual",
        makeVars({ overdueCount: 2 }),
        "1. שטיפת כלים",
        "ראשון"
      );
      expect(msg).not.toContain("התחלה נקייה");
      expect(msg).not.toContain("{overdueCount}");
    }
  });

  it("zero overdue → no overdue mention at all", () => {
    for (let roll = 0; roll < 10; roll++) {
      const msg = buildAdaptiveMorningBrief(
        "encouraging",
        makeVars({ overdueCount: 0 }),
        "1. שטיפת כלים",
        "ראשון"
      );
      expect(msg).not.toContain("התחלה נקייה");
      expect(msg).not.toContain("באיחור");
    }
  });
});
