/**
 * Unit tests — backgrounds catalog + streak unlock progression.
 * Sprint 7.30 Loop F.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  BACKGROUNDS,
  syncBackgroundCollectionWithStreak,
  getBackgroundCollection,
} from "@/lib/backgrounds";

describe("backgrounds — BACKGROUNDS catalog integrity", () => {
  it("exports at least 10 backgrounds", () => {
    expect(BACKGROUNDS.length).toBeGreaterThanOrEqual(10);
  });

  it("ids are unique", () => {
    const ids = new Set(BACKGROUNDS.map((b) => b.id));
    expect(ids.size).toBe(BACKGROUNDS.length);
  });

  it("every bg has gradient containing linear/radial", () => {
    for (const b of BACKGROUNDS) {
      expect(b.gradient).toMatch(/linear-gradient|radial-gradient/);
      expect(b.emoji.length).toBeGreaterThan(0);
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.unlockStreak).toBeGreaterThanOrEqual(0);
    }
  });

  it("has at least 1 starter (unlockStreak===0)", () => {
    const starters = BACKGROUNDS.filter((b) => b.unlockStreak === 0);
    expect(starters.length).toBeGreaterThanOrEqual(1);
  });

  it("has at least 1 epic-tier bg at streak ≥45", () => {
    const epics = BACKGROUNDS.filter((b) => b.unlockStreak >= 45);
    expect(epics.length).toBeGreaterThanOrEqual(1);
  });
});

describe("backgrounds — syncBackgroundCollectionWithStreak", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear();
  });

  it("streak=0 unlocks starters only", () => {
    if (typeof localStorage === "undefined") return;
    const unlocked = syncBackgroundCollectionWithStreak(0);
    const starters = BACKGROUNDS.filter((b) => b.unlockStreak === 0);
    expect(unlocked.length).toBe(starters.length);
  });

  it("streak=45 unlocks everything", () => {
    if (typeof localStorage === "undefined") return;
    syncBackgroundCollectionWithStreak(45);
    expect(getBackgroundCollection().size).toBe(BACKGROUNDS.length);
  });

  it("idempotent — re-call returns 0 new", () => {
    if (typeof localStorage === "undefined") return;
    syncBackgroundCollectionWithStreak(21);
    const second = syncBackgroundCollectionWithStreak(21);
    expect(second.length).toBe(0);
  });
});
