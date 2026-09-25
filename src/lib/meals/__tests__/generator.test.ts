import { describe, it, expect } from "vitest";
import { generateWeekMealPlan } from "../generator";
import { makeMeal } from "./fixtures";

const WEEK_START = new Date("2026-09-27T00:00:00");

describe("generateWeekMealPlan", () => {
  it("never repeats a meal within 5 days, unless explicitly relaxed (5-day floor applies even when min_repeat_days is lower)", () => {
    const meals = [
      makeMeal({ id: "a", name: "עוף", min_repeat_days: 0 }),
      makeMeal({ id: "b", name: "פסטה", min_repeat_days: 0 }),
    ];
    const days = generateWeekMealPlan({ meals, weekStartDate: WEEK_START });

    const occurrencesById = new Map<string, number[]>();
    days.forEach((d, i) => {
      if (!d.mealId) return;
      const arr = occurrencesById.get(d.mealId) ?? [];
      arr.push(i);
      occurrencesById.set(d.mealId, arr);
    });

    for (const [, indices] of occurrencesById) {
      for (let k = 1; k < indices.length; k++) {
        const gap = indices[k] - indices[k - 1];
        const dayNote = days[indices[k]].ruleNotes.join(" ");
        expect(gap >= 5 || dayNote.includes("הוקל")).toBe(true);
      }
    }
  });

  it("is deterministic: identical inputs produce identical output", () => {
    const meals = [
      makeMeal({ id: "a" }),
      makeMeal({ id: "b" }),
      makeMeal({ id: "c" }),
    ];
    const run1 = generateWeekMealPlan({ meals, weekStartDate: WEEK_START });
    const run2 = generateWeekMealPlan({ meals, weekStartDate: WEEK_START });
    expect(run1).toEqual(run2);
  });

  it("prefers a shabbat-tagged meal on Friday (index 5)", () => {
    const meals = [
      makeMeal({ id: "regular", name: "רגיל", min_repeat_days: 0 }),
      makeMeal({ id: "shabbat", name: "עוף שבת", tags: ["shabbat"], min_repeat_days: 0 }),
    ];
    const days = generateWeekMealPlan({ meals, weekStartDate: WEEK_START });
    expect(days[5].mealId).toBe("shabbat");
  });

  it("Saturday reuses an earlier leftovers-friendly meal as status=leftovers", () => {
    const meals = [
      makeMeal({ id: "soup", name: "מרק", tags: ["leftovers-friendly"], min_repeat_days: 0 }),
      makeMeal({ id: "other", name: "אחר", min_repeat_days: 0 }),
    ];
    const days = generateWeekMealPlan({ meals, weekStartDate: WEEK_START });
    // Some earlier day (Sun-Thu) should have picked the leftovers-friendly soup.
    const soupDayIndex = days.slice(0, 5).findIndex((d) => d.mealId === "soup");
    expect(soupDayIndex).toBeGreaterThanOrEqual(0);
    expect(days[6].status).toBe("leftovers");
    expect(days[6].mealId).toBe("soup");
  });

  it("prefers a light-tagged meal on a day marked busy", () => {
    const meals = [
      makeMeal({ id: "heavy", name: "כבד", min_repeat_days: 0 }),
      makeMeal({ id: "light", name: "קל", tags: ["light"], min_repeat_days: 0 }),
    ];
    const busyDate = "2026-09-29"; // Tuesday, index 2 of the week above
    const days = generateWeekMealPlan({
      meals,
      weekStartDate: WEEK_START,
      busyDates: [busyDate],
    });
    const busyDay = days.find((d) => d.date === busyDate);
    expect(busyDay?.mealId).toBe("light");
  });

  it("avoids more than 2 consecutive meat-tagged meals when a non-meat option exists", () => {
    const meals = [
      makeMeal({ id: "meat1", name: "בשר1", tags: ["meat"], min_repeat_days: 0 }),
      makeMeal({ id: "meat2", name: "בשר2", tags: ["meat"], min_repeat_days: 0 }),
      makeMeal({ id: "meat3", name: "בשר3", tags: ["meat"], min_repeat_days: 0 }),
      makeMeal({ id: "veg", name: "צמחוני", tags: ["parve"], min_repeat_days: 0 }),
    ];
    const days = generateWeekMealPlan({ meals, weekStartDate: WEEK_START, limitConsecutiveMeat: true });

    let streak = 0;
    for (const day of days.slice(0, 5)) {
      const meal = meals.find((m) => m.id === day.mealId);
      if (meal?.tags.includes("meat")) {
        streak++;
        expect(streak).toBeLessThanOrEqual(2);
      } else {
        streak = 0;
      }
    }
  });

  it("respects an existingByDate preset instead of regenerating that day", () => {
    const meals = [makeMeal({ id: "a" }), makeMeal({ id: "b" })];
    const days = generateWeekMealPlan({
      meals,
      weekStartDate: WEEK_START,
      existingByDate: {
        "2026-09-27": { mealId: "b", status: "cooked" },
      },
    });
    expect(days[0]).toMatchObject({ mealId: "b", status: "cooked" });
  });
});
