import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { getCollection } from "@/lib/pets";
import { getBackgroundCollection } from "@/lib/backgrounds";
import { useBackgroundCollectionSync, usePetCollectionSync } from "../usePetCollectionSync";

afterEach(() => { cleanup(); localStorage.clear(); });

describe("streak collection celebrations", () => {
  it("silently persists startup unlocks, then celebrates newly earned items on advancement", async () => {
    const { result, rerender } = renderHook(({ streak }: { streak: number | null }) => ({
      pets: usePetCollectionSync(streak), backgrounds: useBackgroundCollectionSync(streak),
    }), { initialProps: { streak: null as number | null } });
    rerender({ streak: 0 });
    await waitFor(() => { expect(getCollection().size).toBeGreaterThan(0); expect(getBackgroundCollection().size).toBeGreaterThan(0); });
    expect(result.current.pets).toHaveLength(0);
    expect(result.current.backgrounds).toHaveLength(0);
    rerender({ streak: 7 });
    await waitFor(() => { expect(result.current.pets.length).toBeGreaterThan(0); expect(result.current.backgrounds.length).toBeGreaterThan(0); });
    expect(result.current.pets.every(pet => pet.unlockStreak > 0)).toBe(true);
    expect(result.current.backgrounds.every(bg => bg.unlockStreak > 0)).toBe(true);
  });

  it("treats the first loaded nonzero streak as hydration, not a new achievement", async () => {
    const { result, rerender } = renderHook(({ streak }: { streak: number | null }) => ({
      pets: usePetCollectionSync(streak), backgrounds: useBackgroundCollectionSync(streak),
    }), { initialProps: { streak: null as number | null } });
    rerender({ streak: 7 });
    await waitFor(() => expect(getBackgroundCollection().size).toBeGreaterThan(3));
    expect(result.current.pets).toHaveLength(0);
    expect(result.current.backgrounds).toHaveLength(0);
  });
});
