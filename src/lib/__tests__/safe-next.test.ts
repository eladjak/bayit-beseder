import { describe, expect, it } from "vitest";
import { safeNext } from "../safe-next";

describe("safeNext", () => {
  it.each([
    ["/tasks", "/tasks"], ["/tasks?x=1#a", "/tasks?x=1#a"],
    ["//evil.example", "/dashboard"], ["/\\evil.example", "/dashboard"],
    ["@evil.example", "/dashboard"], ["https://evil.example", "/dashboard"],
    ["%2F%2Fevil.example", "/dashboard"], ["/%2F/evil", "/dashboard"],
    ["javascript:alert(1)", "/dashboard"], ["", "/dashboard"], [null, "/dashboard"],
    [`/${"a".repeat(600)}`, "/dashboard"], ["/foo@evil/path", "/dashboard"],
    ["/foo%5cbar", "/dashboard"], ["/foo%0abar", "/dashboard"], ["/%", "/dashboard"],
  ])("validates %s", (input, expected) => expect(safeNext(input)).toBe(expected));
  it("supports a custom fallback", () => expect(safeNext("//evil", "/home")).toBe("/home"));
});
