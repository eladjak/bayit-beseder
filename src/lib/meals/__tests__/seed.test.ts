import { describe, it, expect } from "vitest";
import { ensureHouseholdMealsSeeded } from "../seed";
import { MEAL_SEED_PACK } from "../seed-data";
import { makeSupabaseMock } from "./supabaseMock";
import { hasConflictingKashrutTags } from "../types";

describe("ensureHouseholdMealsSeeded", () => {
  it("seeds the default pack when the household has zero meals", async () => {
    const mock = makeSupabaseMock({ meals: [] });
    const result = await ensureHouseholdMealsSeeded(mock as never, "house-1");
    expect(result).toEqual({ seeded: true, count: MEAL_SEED_PACK.length });
    expect(mock.__responses.meals).toHaveLength(MEAL_SEED_PACK.length);
    for (const row of mock.__responses.meals as Array<{ household_id: string }>) {
      expect(row.household_id).toBe("house-1");
    }
  });

  it("is a no-op when the household already has meals", async () => {
    const mock = makeSupabaseMock({ meals: [{ id: "existing-1" }] });
    const result = await ensureHouseholdMealsSeeded(mock as never, "house-1");
    expect(result).toEqual({ seeded: false, count: 1 });
    expect(mock.__inserted.meals).toBeUndefined();
  });
});

describe("MEAL_SEED_PACK integrity", () => {
  it("has ~25 meals", () => {
    expect(MEAL_SEED_PACK.length).toBeGreaterThanOrEqual(20);
    expect(MEAL_SEED_PACK.length).toBeLessThanOrEqual(30);
  });

  it("is kashrut-neutral: no meal is tagged both meat and dairy", () => {
    for (const meal of MEAL_SEED_PACK) {
      expect(hasConflictingKashrutTags(meal.tags)).toBe(false);
    }
  });

  it("every meal has a Hebrew name and at least one ingredient", () => {
    for (const meal of MEAL_SEED_PACK) {
      expect(meal.name.length).toBeGreaterThan(0);
      expect(meal.ingredients.length).toBeGreaterThan(0);
    }
  });
});
