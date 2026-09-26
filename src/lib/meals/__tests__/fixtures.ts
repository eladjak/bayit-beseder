import type { Meal } from "../types";

let counter = 0;

export function makeMeal(overrides: Partial<Meal> = {}): Meal {
  counter += 1;
  return {
    id: overrides.id ?? `meal-${counter}`,
    household_id: "house-1",
    name: `ארוחה ${counter}`,
    who_eats: ["אלעד", "ענבל"],
    prep_lead_hours: 0,
    prep_note: null,
    min_repeat_days: 3,
    tags: [],
    ingredients: [],
    last_served_at: null,
    active: true,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}
