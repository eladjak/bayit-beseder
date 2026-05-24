/**
 * Unit tests — pets collection unlock rules.
 * Sprint 7.30 Loop D / Phase 3 prep.
 */

import { describe, it, expect } from "vitest";
import { PETS, petsAtRarity } from "@/lib/pets";

describe("pets — PETS catalog integrity", () => {
  it("exports at least 20 pets", () => {
    expect(PETS.length).toBeGreaterThanOrEqual(20);
  });

  it("pet ids are unique", () => {
    const ids = new Set(PETS.map((p) => p.id));
    expect(ids.size).toBe(PETS.length);
  });

  it("every pet has emoji+name+rarity+unlockStreak>=0", () => {
    for (const p of PETS) {
      expect(p.emoji.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
      expect(["common", "rare", "epic"]).toContain(p.rarity);
      expect(p.unlockStreak).toBeGreaterThanOrEqual(0);
    }
  });

  it("has ≥3 pets available at streak=0 (starter set)", () => {
    const starters = PETS.filter((p) => p.unlockStreak === 0);
    expect(starters.length).toBeGreaterThanOrEqual(3);
  });

  it("epic pets only unlock at streak ≥30", () => {
    const epics = petsAtRarity("epic");
    expect(epics.length).toBeGreaterThan(0);
    for (const e of epics) {
      expect(e.unlockStreak).toBeGreaterThanOrEqual(30);
    }
  });

  it("common pets have unlockStreak ≤7", () => {
    const commons = petsAtRarity("common");
    for (const c of commons) {
      expect(c.unlockStreak).toBeLessThanOrEqual(7);
    }
  });
});
