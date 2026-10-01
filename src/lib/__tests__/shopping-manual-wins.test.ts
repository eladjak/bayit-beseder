import { describe, it, expect } from "vitest";
import * as T from "@/lib/shopping-taxonomy";

const seed = ["ירקות", "מוצרי חלב", "ממרחים", "שונות"];
const model = T.buildCategoryModel(seed.map((name, i) => ({ name, sort_order: i })));

describe("manual choice always wins", () => {
  it("a known item the user moved to 'שונות' does not snap back", () => {
    const stored = (T as { toStoredCategory?: (n: string) => string }).toStoredCategory?.("שונות") ?? "שונות";
    expect(model.resolveCategory("עגבניות", stored)).toBe("שונות");
  });
  it("legacy 'שונות' is still re-filed by name", () => {
    expect(model.resolveCategory("עגבניות", "שונות")).toBe("ירקות");
  });
  it("other deliberate choices are kept", () => {
    expect(model.resolveCategory("עגבניות", "ממרחים")).toBe("ממרחים");
  });
});

describe("exact word before stem", () => {
  it("חלבה is a sweet spread, not milk", () => {
    expect(T.classifyItem("חלבה")?.categoryId).toBe("spreads");
    expect(T.classifyItem("חלבה בטעם פיסטוק")?.categoryId).toBe("spreads");
    expect(T.classifyItem("חלב")?.categoryId).toBe("dairy");
  });
  it("סביח is a ready-made / bakery item", () => {
    expect(T.classifyItem("סביח")?.categoryId).toBe("bakery");
  });
});
