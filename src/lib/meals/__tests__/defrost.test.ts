import { describe, it, expect } from "vitest";
import { computeTonightPrep, MEAL_HOUR_IL } from "../defrost";
import { makeMeal } from "./fixtures";

describe("computeTonightPrep — מה להפשיר הערב", () => {
  it("flags a meal that needs defrost and falls within the next 36h (December, UTC+2)", () => {
    const meal = makeMeal({ id: "m1", name: "שניצל", prep_lead_hours: 12 });
    // "Now" = Dec 16, 10:00 Israel time (08:00 UTC). Today's dinner (Dec 16
    // 19:00 IL = 17:00 UTC) is 9h away — inside the 36h window. Defrost
    // should have started 12h before that, i.e. Dec 16 07:00 IL = 05:00 UTC
    // — already past "now" (08:00 UTC), so startNow must be true.
    const now = new Date("2026-12-16T08:00:00Z");
    const { items } = computeTonightPrep({
      now,
      days: [{ plan_date: "2026-12-16", meal_id: "m1", status: "planned" }],
      meals: [meal],
    });
    expect(items).toHaveLength(1);
    expect(items[0].mealName).toBe("שניצל");
    expect(items[0].mealTime).toBe("2026-12-16T17:00:00.000Z");
    expect(items[0].startAt).toBe("2026-12-16T05:00:00.000Z");
    expect(items[0].startNow).toBe(true);
  });

  it("computes the same scenario correctly in August (UTC+3, DST)", () => {
    const meal = makeMeal({ id: "m1", name: "שניצל", prep_lead_hours: 12 });
    const now = new Date("2026-08-15T05:00:00Z"); // 08:00 IL
    const { items } = computeTonightPrep({
      now,
      days: [{ plan_date: "2026-08-16", meal_id: "m1", status: "planned" }],
      meals: [meal],
    });
    expect(items).toHaveLength(1);
    // 19:00 IL in August = 16:00 UTC (not 17:00 like December).
    expect(items[0].mealTime).toBe("2026-08-16T16:00:00.000Z");
    expect(items[0].startAt).toBe("2026-08-16T04:00:00.000Z");
  });

  it("skips a meal that needs no defrost (prep_lead_hours = 0)", () => {
    const meal = makeMeal({ id: "m1", prep_lead_hours: 0 });
    const { items } = computeTonightPrep({
      now: new Date("2026-12-15T06:00:00Z"),
      days: [{ plan_date: "2026-12-16", meal_id: "m1", status: "planned" }],
      meals: [meal],
    });
    expect(items).toHaveLength(0);
  });

  it("skips a meal more than 36h away", () => {
    const meal = makeMeal({ id: "m1", prep_lead_hours: 12 });
    const { items } = computeTonightPrep({
      now: new Date("2026-12-15T06:00:00Z"),
      days: [{ plan_date: "2026-12-20", meal_id: "m1", status: "planned" }],
      meals: [meal],
    });
    expect(items).toHaveLength(0);
  });

  it("skips a day already marked cooked or skipped", () => {
    const meal = makeMeal({ id: "m1", prep_lead_hours: 12 });
    const { items } = computeTonightPrep({
      now: new Date("2026-12-15T06:00:00Z"),
      days: [
        { plan_date: "2026-12-16", meal_id: "m1", status: "cooked" },
        { plan_date: "2026-12-15", meal_id: "m1", status: "skipped" },
      ],
      meals: [meal],
    });
    expect(items).toHaveLength(0);
  });

  it("produces a ready Hebrew WhatsApp line", () => {
    const meal = makeMeal({ id: "m1", name: "עוף בתנור", prep_lead_hours: 12, prep_note: "להוציא עוף" });
    const { whatsappText } = computeTonightPrep({
      now: new Date("2026-12-15T06:00:00Z"),
      days: [{ plan_date: "2026-12-16", meal_id: "m1", status: "planned" }],
      meals: [meal],
    });
    expect(whatsappText).toContain("להוציא עוף");
    expect(whatsappText).toContain("עוף בתנור");
  });

  it("produces a friendly message when nothing needs defrosting", () => {
    const { whatsappText, items } = computeTonightPrep({
      now: new Date("2026-12-15T06:00:00Z"),
      days: [],
      meals: [],
    });
    expect(items).toHaveLength(0);
    expect(whatsappText).toContain("אין מה להפשיר");
  });

  it("uses 19:00 as the assumed dinner hour", () => {
    expect(MEAL_HOUR_IL).toBe(19);
  });
});
