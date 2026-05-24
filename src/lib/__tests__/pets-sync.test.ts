/**
 * Unit tests — syncCollectionWithStreak behavior.
 * Mocks localStorage via vitest happy-dom.
 * Sprint 7.30 Loop E.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { syncCollectionWithStreak, getCollection, PETS } from "@/lib/pets";

describe("pets — syncCollectionWithStreak", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear();
  });

  it("at streak=0 unlocks only starter pets (unlockStreak===0)", () => {
    if (typeof localStorage === "undefined") return;
    const unlocked = syncCollectionWithStreak(0);
    const expected = PETS.filter((p) => p.unlockStreak === 0);
    expect(unlocked.length).toBe(expected.length);
    expect(getCollection().size).toBe(expected.length);
  });

  it("at streak=3 unlocks starters + 3-day pets cumulatively", () => {
    if (typeof localStorage === "undefined") return;
    syncCollectionWithStreak(0); // starters
    const second = syncCollectionWithStreak(3);
    // Second call returns only the NEW ones (not starters)
    const expectedNew = PETS.filter((p) => p.unlockStreak === 3);
    expect(second.length).toBe(expectedNew.length);
    // Collection has all up to streak 3
    const expectedTotal = PETS.filter((p) => p.unlockStreak <= 3);
    expect(getCollection().size).toBe(expectedTotal.length);
  });

  it("at streak=30 unlocks all pets", () => {
    if (typeof localStorage === "undefined") return;
    syncCollectionWithStreak(30);
    expect(getCollection().size).toBe(PETS.length);
  });

  it("idempotent — running twice at same streak returns 0 new", () => {
    if (typeof localStorage === "undefined") return;
    syncCollectionWithStreak(7);
    const second = syncCollectionWithStreak(7);
    expect(second.length).toBe(0);
  });

  it("negative streak unlocks nothing extra (graceful)", () => {
    if (typeof localStorage === "undefined") return;
    const unlocked = syncCollectionWithStreak(-1);
    // Negative streak should not unlock anything beyond unlockStreak<=-1 (none)
    expect(unlocked.length).toBe(0);
  });
});
