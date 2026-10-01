import { describe, expect, it } from "vitest";
import { listCanonicalItems, mapTitle, norm } from "../map-items";

describe("canonical catalog", () => {
  it("has unique ids and unique aliases", () => {
    const items = listCanonicalItems();
    expect(items.length).toBeGreaterThanOrEqual(250);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    const aliases = items.flatMap((i) => i.aliases.map(norm));
    expect(new Set(aliases).size).toBe(aliases.length);
  });
});

describe("mapTitle", () => {
  it("maps plain list words from Elad's real list", () => {
    for (const t of ["חלב", "ביצים", "עגבניות", "פסטה", "נייר טואלט", "לימון", "קישואים"]) {
      expect(mapTitle(t).canonicalId, t).not.toBeNull();
    }
  });

  it("does not turn the plural of the item itself into a constraint", () => {
    for (const t of ["עגבניות", "פלפלים", "קישואים", "לימונים", "ביצים"]) {
      expect(mapTitle(t).strict, t).toEqual([]);
    }
  });

  it("keeps the family's extra words as constraints", () => {
    const plain = mapTitle("חלב");
    const lf = mapTitle("חלב ללא לקטוז");
    expect(lf.canonicalId).toBe(plain.canonicalId);
    expect(lf.strict).toEqual(["ללא", "לקטוז"]);
  });

  it("drops emoji, filler and negations instead of turning them into constraints", () => {
    const p = mapTitle("פלפלים מכל צבע 🔴🟢 🟠 🟡 🫑");
    expect(p.canonicalId).not.toBeNull();
    expect(p.strict).toEqual([]);
    // "לא פרווה" is a must-NOT-contain constraint, never a must-contain one
    expect(mapTitle("מעדני חלב (לא פרווה)").strict).toEqual(["!פרווה"]);
  });

  it("leaves non-grocery items unmatched rather than guessing", () => {
    expect(mapTitle("תחתית לעציץ").canonicalId).toBeNull();
    expect(mapTitle("").canonicalId).toBeNull();
  });
});
