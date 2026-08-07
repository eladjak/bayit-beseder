import { describe, it, expect } from "vitest";
import { isRecurring } from "@/lib/task-flags";

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
