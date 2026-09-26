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

  it("a meal used exactly 5 days ago is excluded from the STRICT pool — reported bug: it used to pass silently", () => {
    // Reproduces the reported screenshot scenario (27.9 and 2.10 — exactly 5
    // days apart, index 0 and index 5 — with "a" showing up on both and no
    // indication anything was relaxed). Root cause, confirmed by hand-tracing
    // the OLD comparison (`daysBetween(...) < repeatWindow(meal)`): a gap of
    // EXACTLY 5 days makes `5 < 5` false, so the meal is NOT excluded and can
    // win the strict pool outright — with an EMPTY ruleNotes, i.e. it looks
    // like a completely clean pick, not a relaxed one.
    //
    // Set up day0..day4 explicitly (existingByDate) so day5 is the only day
    // actually generated here, with meal "a" last used exactly on day0 (5
    // days before day5) and no other meal available within its own window —
    // i.e. a is the ONLY candidate that could satisfy the old buggy check.
    const meals = [
      makeMeal({ id: "a", name: "עוף בתנור עם ירקות", min_repeat_days: 0 }),
      makeMeal({ id: "b", name: "פסטה", min_repeat_days: 0 }),
      makeMeal({ id: "c", name: "שקשוקה", min_repeat_days: 0 }),
    ];
    const days = generateWeekMealPlan({
      meals,
      weekStartDate: WEEK_START, // day0 = 2026-09-27
      existingByDate: {
        "2026-09-27": { mealId: "a", status: "planned" }, // day0
        "2026-09-28": { mealId: "b", status: "planned" }, // day1
        "2026-09-29": { mealId: "c", status: "planned" }, // day2
        "2026-09-30": { mealId: "b", status: "planned" }, // day3 (2 days before day5)
        "2026-10-01": { mealId: "c", status: "planned" }, // day4 (1 day before day5)
      },
    });

    const day5 = days[5]; // 2026-10-02, exactly 5 days after day0
    expect(day5.date).toBe("2026-10-02");
    // "a" is still the honest pick here (it's the only meal that's had ANY
    // real rest — b and c are still inside their own window) — the fix is
    // not that it disappears, it's that reusing it at exactly 5 days is now
    // NEVER free: it must always come through the relaxed path and be marked.
    expect(day5.mealId).toBe("a");
    expect(day5.ruleNotes.join(" ")).toContain("הוקל");
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
