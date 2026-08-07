import { describe, it, expect } from "vitest";
import { isRecurring, isTaskOverdue } from "@/lib/task-flags";

describe("isTaskOverdue — a recurring chore is never overdue, it is due again", () => {
  const TODAY = "2026-08-07";
  const rec = { due_date: "2026-03-14", status: "pending", recurring: "true" };
  const oneOff = { due_date: "2026-03-14", status: "pending", recurring: "false" };

  it("does NOT flag a recurring chore with an ancient due date", () => {
    // This is the entire "43 overdue from February and March" shame-wall.
    expect(isTaskOverdue(rec, TODAY)).toBe(false);
    // counter-arm: the OLD rule really did flag it
    const oldRule = rec.due_date < TODAY && rec.status !== "completed";
    expect(oldRule).toBe(true);
  });

  it("DOES still flag a genuinely overdue one-off task", () => {
    expect(isTaskOverdue(oneOff, TODAY)).toBe(true);
  });

  it("never flags completed, skipped, or undated tasks", () => {
    expect(isTaskOverdue({ ...oneOff, status: "completed" }, TODAY)).toBe(false);
    expect(isTaskOverdue({ ...oneOff, status: "skipped" }, TODAY)).toBe(false);
    expect(isTaskOverdue({ ...oneOff, due_date: null }, TODAY)).toBe(false);
  });

  it("does not flag a one-off task due today or in the future", () => {
    expect(isTaskOverdue({ ...oneOff, due_date: TODAY }, TODAY)).toBe(false);
    expect(isTaskOverdue({ ...oneOff, due_date: "2026-12-01" }, TODAY)).toBe(false);
  });
});

describe("isRecurring — normalises the live `text` column and the declared `boolean`", () => {
  it("treats the STRING \"false\" as not recurring (the production bug)", () => {
    // This is the whole point. `!!"false"` === true, which is what shipped.
    expect(isRecurring("false")).toBe(false);
    const raw: unknown = "false"; // what PostgREST actually returns
    expect(!!raw).toBe(true); // counter-arm: the old `!!task.recurring` really is wrong
  });

  it("treats the STRING \"true\" as recurring", () => {
    expect(isRecurring("true")).toBe(true);
  });

  it("still honours real booleans", () => {
    expect(isRecurring(true)).toBe(true);
    expect(isRecurring(false)).toBe(false);
  });

  it("treats null/undefined/garbage as not recurring (fail closed)", () => {
    expect(isRecurring(null)).toBe(false);
    expect(isRecurring(undefined)).toBe(false);
    expect(isRecurring("")).toBe(false);
    expect(isRecurring("banana")).toBe(false);
  });

  it("accepts the other shapes Postgres/PostgREST can emit", () => {
    expect(isRecurring("TRUE")).toBe(true);
    expect(isRecurring(" t ")).toBe(true);
    expect(isRecurring("1")).toBe(true);
    expect(isRecurring(0)).toBe(false);
  });
});
