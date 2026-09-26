import { describe, it, expect } from "vitest";
import { shiftPlanForLeftovers, type ShiftableDay } from "../leftover-shift";

const week = (): ShiftableDay[] => [
  { date: "2026-09-27", mealId: "a", status: "planned" },
  { date: "2026-09-28", mealId: "b", status: "planned" },
  { date: "2026-09-29", mealId: "c", status: "planned" },
  { date: "2026-09-30", mealId: "d", status: "planned" },
  { date: "2026-10-01", mealId: "e", status: "planned" },
  { date: "2026-10-02", mealId: "f", status: "planned" },
  { date: "2026-10-03", mealId: "g", status: "planned" },
];

describe("shiftPlanForLeftovers", () => {
  it("marks the target day leftovers and shifts the rest forward by one", () => {
    const result = shiftPlanForLeftovers(week(), "2026-09-28");
    expect(result[1]).toMatchObject({ date: "2026-09-28", mealId: null, status: "leftovers" });
    expect(result[2]).toMatchObject({ date: "2026-09-29", mealId: "b" }); // was day 1's meal
    expect(result[3]).toMatchObject({ date: "2026-09-30", mealId: "c" });
    expect(result[6]).toMatchObject({ date: "2026-10-03", mealId: "f" }); // last day now holds day-5's meal
    // Day 0 (before the target) is untouched.
    expect(result[0]).toMatchObject({ date: "2026-09-27", mealId: "a", status: "planned" });
  });

  it("stops shifting at the first already-cooked day", () => {
    const days = week();
    days[3] = { ...days[3], status: "cooked" }; // 2026-09-30 already cooked
    const result = shiftPlanForLeftovers(days, "2026-09-28");
    // Shift only affects 09-29 (which absorbs 09-28's old meal); 09-30 stays untouched.
    expect(result[2]).toMatchObject({ date: "2026-09-29", mealId: "b" });
    expect(result[3]).toMatchObject({ date: "2026-09-30", mealId: "d", status: "cooked" });
  });

  it("a day that inherits a leftovers slot becomes a normal planned day", () => {
    const days = week();
    days[2] = { ...days[2], status: "leftovers", mealId: "c" };
    const result = shiftPlanForLeftovers(days, "2026-09-28");
    // day 2 (09-29) inherits day 1's (09-28) meal 'b' and becomes 'planned',
    // not 'leftovers' — leftovers status doesn't propagate forward.
    expect(result[2]).toMatchObject({ mealId: "b", status: "planned" });
  });

  it("is a no-op when the date isn't in the array", () => {
    const days = week();
    const result = shiftPlanForLeftovers(days, "2099-01-01");
    expect(result).toBe(days);
  });
});
