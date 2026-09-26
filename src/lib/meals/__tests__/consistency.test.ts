import { describe, it, expect } from "vitest";
import { generateWeekMealPlan } from "../generator";
import { computeTonightPrep } from "../defrost";
import { makeMeal } from "./fixtures";

/**
 * Regression guard for the reported "defrost banner names a different meal
 * than the day it's for" concern (2026-09-25 review of bayit-meals-1.png).
 *
 * Investigated and confirmed: that screenshot was a hand-typed TEMP preview
 * page whose banner text and day list were two independently-authored mock
 * arrays that drifted apart — NOT the real generator/defrost pipeline (the
 * real DefrostBanner component didn't even render a date at the time). The
 * real code can't produce that mismatch: `computeTonightPrep` reads
 * `meal_id` straight off the SAME day object it reports the date for, and
 * resolves the name from that one meal. This test exists so a future change
 * that breaks that coupling gets caught immediately.
 */
describe("generator + defrost coupling stays consistent", () => {
  it("every defrost item's mealName matches the meal actually planned for that exact date", () => {
    const meals = [
      makeMeal({ id: "chicken", name: "עוף בתנור עם ירקות", prep_lead_hours: 12, tags: ["shabbat"] }),
      makeMeal({ id: "pasta", name: "פסטה ברוטב עגבניות", prep_lead_hours: 0 }),
      makeMeal({ id: "soup", name: "מרק עדשים", prep_lead_hours: 0 }),
    ];
    const weekStartDate = new Date("2026-09-27T00:00:00");
    const days = generateWeekMealPlan({ meals, weekStartDate });

    const now = new Date("2026-09-27T05:00:00Z"); // Sunday morning IL
    const { items } = computeTonightPrep({
      now,
      days: days.map((d) => ({ plan_date: d.date, meal_id: d.mealId, status: d.status })),
      meals,
    });

    for (const item of items) {
      const day = days.find((d) => d.date === item.date);
      expect(day).toBeDefined();
      expect(day?.mealId).toBe(item.mealId);
      expect(day?.mealName).toBe(item.mealName);
    }
  });
});
