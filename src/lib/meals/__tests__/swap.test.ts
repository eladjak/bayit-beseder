import { describe, it, expect } from "vitest";
import { suggestSwapAlternatives } from "../swap";
import { makeMeal } from "./fixtures";

describe("suggestSwapAlternatives", () => {
  it("returns up to `count` alternatives, excluding the current meal", () => {
    const meals = [
      makeMeal({ id: "current" }),
      makeMeal({ id: "b" }),
      makeMeal({ id: "c" }),
      makeMeal({ id: "d" }),
      makeMeal({ id: "e" }),
    ];
    const alts = suggestSwapAlternatives({
      meals,
      date: "2026-09-30",
      currentMealId: "current",
      count: 3,
    });
    expect(alts).toHaveLength(3);
    expect(alts.map((m) => m.id)).not.toContain("current");
  });

  it("prefers meals that respect their repeat window over recently-used ones", () => {
    const meals = [
      makeMeal({ id: "recent", min_repeat_days: 7 }),
      makeMeal({ id: "fresh1", min_repeat_days: 7 }),
      makeMeal({ id: "fresh2", min_repeat_days: 7 }),
      makeMeal({ id: "fresh3", min_repeat_days: 7 }),
    ];
    const alts = suggestSwapAlternatives({
      meals,
      date: "2026-09-30",
      currentMealId: null,
      recentHistory: [{ meal_id: "recent", plan_date: "2026-09-28" }], // 2 days ago, inside window
      count: 3,
    });
    expect(alts.map((m) => m.id)).not.toContain("recent");
  });

  it("falls back to recently-used meals when there aren't enough fresh alternatives", () => {
    const meals = [makeMeal({ id: "a", min_repeat_days: 7 }), makeMeal({ id: "b", min_repeat_days: 7 })];
    const alts = suggestSwapAlternatives({
      meals,
      date: "2026-09-30",
      currentMealId: null,
      recentHistory: [{ meal_id: "a", plan_date: "2026-09-28" }],
      count: 3,
    });
    // Only 2 active meals total exist — must still return both rather than nothing.
    expect(alts).toHaveLength(2);
  });

  it("only considers active meals", () => {
    const meals = [makeMeal({ id: "a", active: false }), makeMeal({ id: "b", active: true })];
    const alts = suggestSwapAlternatives({ meals, date: "2026-09-30", currentMealId: null });
    expect(alts.map((m) => m.id)).toEqual(["b"]);
  });
});
