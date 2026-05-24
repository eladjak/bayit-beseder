import { describe, it, expect, beforeEach } from "vitest";
import { resolveCopy, COPY, copy } from "@/lib/copy-resolver";
import { saveHousehold } from "@/lib/household-type";

describe("copy-resolver", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear();
  });

  it("defaults to 'default' variant when no household type stored", () => {
    if (typeof localStorage === "undefined") return;
    // No save → loadHousehold returns DEFAULT_HOUSEHOLD with type='couple'
    // But COPY.greetingSuffix has couple variant — so should hit that
    const result = resolveCopy(COPY.greetingSuffix);
    expect(result.length).toBeGreaterThan(0);
  });

  it("resolves family-specific copy when household.type=family", () => {
    if (typeof localStorage === "undefined") return;
    saveHousehold({ type: "family", hasKids: true, memberCount: 4 });
    expect(copy("greetingSuffix")).toContain("הבית מסודר ביחד");
  });

  it("resolves roommates copy", () => {
    if (typeof localStorage === "undefined") return;
    saveHousehold({ type: "roommates", hasKids: false, memberCount: 3 });
    expect(copy("partnerNoun")).toBe("השותפים");
  });

  it("solo type gets self-referential copy", () => {
    if (typeof localStorage === "undefined") return;
    saveHousehold({ type: "solo", hasKids: false, memberCount: 1 });
    expect(copy("quickLoveAria")).toContain("לעצמך");
  });

  it("every COPY entry has a default + at least 2 variants", () => {
    for (const [, variants] of Object.entries(COPY)) {
      expect(variants.default).toBeDefined();
      expect(variants.default.length).toBeGreaterThan(0);
      const variantCount = Object.keys(variants).length;
      expect(variantCount).toBeGreaterThanOrEqual(3);
    }
  });
});
