import { describe, it, expect } from "vitest";
import { buildWeekIngredientList, suggestShoppingItems } from "../shopping";
import { makeMeal } from "./fixtures";

describe("shopping suggestions", () => {
  it("suggests ingredients not already on the open shopping list", () => {
    const meal = makeMeal({
      id: "m1",
      name: "שניצל",
      ingredients: [
        { name: "שניצלים", quantity: 1, unit: "ק\"ג" },
        { name: "חלב", quantity: 1, unit: "כוס" },
      ],
    });
    const weekIngredients = buildWeekIngredientList(
      [{ meal_id: "m1", status: "planned" }],
      [meal]
    );
    const suggestions = suggestShoppingItems(weekIngredients, ["חלב"]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].title).toBe("שניצלים");
  });

  it("de-duplicates the SAME ingredient across two meals into one merged line, not two", () => {
    const mealA = makeMeal({ id: "a", name: "שקשוקה", ingredients: [{ name: "ביצים", quantity: 6, unit: "יח'" }] });
    const mealB = makeMeal({ id: "b", name: "חביתה", ingredients: [{ name: "ביצים", quantity: 6, unit: "יח'" }] });
    const weekIngredients = buildWeekIngredientList(
      [
        { meal_id: "a", status: "planned" },
        { meal_id: "b", status: "planned" },
      ],
      [mealA, mealB]
    );
    const suggestions = suggestShoppingItems(weekIngredients, []);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].title).toBe("ביצים");
    expect(suggestions[0].quantity).toBe(12);
    expect(suggestions[0].forMeals).toEqual(["שקשוקה", "חביתה"]);
  });

  it("re-running the same week produces no new suggestions ('no duplicates on re-run')", () => {
    const meal = makeMeal({ id: "m1", ingredients: [{ name: "עוף" }] });
    const weekIngredients = buildWeekIngredientList([{ meal_id: "m1", status: "planned" }], [meal]);
    const firstRun = suggestShoppingItems(weekIngredients, []);
    // Simulate: the UI confirmed "עוף" onto the shopping list, so it's now open.
    const secondRun = suggestShoppingItems(weekIngredients, firstRun.map((s) => s.title));
    expect(secondRun).toHaveLength(0);
  });

  it("normalizes whitespace/case when comparing against the existing list", () => {
    const meal = makeMeal({ id: "m1", ingredients: [{ name: "  עגבניות  " }] });
    const weekIngredients = buildWeekIngredientList([{ meal_id: "m1", status: "planned" }], [meal]);
    const suggestions = suggestShoppingItems(weekIngredients, ["עגבניות"]);
    expect(suggestions).toHaveLength(0);
  });

  it("skips skipped days entirely", () => {
    const meal = makeMeal({ id: "m1", ingredients: [{ name: "עוף" }] });
    const weekIngredients = buildWeekIngredientList([{ meal_id: "m1", status: "skipped" }], [meal]);
    expect(weekIngredients).toHaveLength(0);
  });
});
