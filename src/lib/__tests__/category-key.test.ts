import { describe, expect, it } from "vitest";
import { resolveCategoryKey } from "../categories";

describe("task category resolution", () => {
  it("resolves built-in Hebrew names when household categories are unavailable", () => {
    expect(resolveCategoryKey("מטבח", {})).toBe("kitchen");
    expect(resolveCategoryKey("כביסה", {})).toBe("laundry");
    expect(resolveCategoryKey(null, {})).toBe("general");
  });
  it("preserves a matching household category id", () => {
    expect(resolveCategoryKey("מטבח", { "מטבח": "household-id" })).toBe("household-id");
  });
});
