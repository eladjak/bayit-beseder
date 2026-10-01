import { describe, expect, it } from "vitest";
import { isPriceCompareEnabled, priceCompareHouseholds } from "../flag";
import { isPriceQuestion, summarizeForAssistant } from "../assistant";
import type { CompareResponse, StoreResult } from "../types";

const ELAD = "98549f83-612b-469f-b647-94616b23d36c";

describe("price compare flag", () => {
  it("is off when unset, empty or malformed", () => {
    expect(isPriceCompareEnabled(ELAD, "")).toBe(false);
    expect(isPriceCompareEnabled(ELAD, "not-a-uuid,*")).toBe(false);
    expect(priceCompareHouseholds("*").size).toBe(0);
  });
  it("is on only for listed households", () => {
    const raw = `${ELAD}, 11111111-1111-1111-1111-111111111111`;
    expect(isPriceCompareEnabled(ELAD, raw)).toBe(true);
    expect(isPriceCompareEnabled("22222222-2222-2222-2222-222222222222", raw)).toBe(false);
    expect(isPriceCompareEnabled(null, raw)).toBe(false);
  });
});

function store(chain: string, total: number, found: number): StoreResult {
  return {
    chain, chainName: chain === "a" ? "שופרסל" : "קרפור", storeId: "1", name: "מרכז", city: "עפולה",
    address: "", distanceKm: 3, published: "2026-10-01T02:00", fresh: true,
    lines: { k1: { code: "1", name: "חלב", price: 7, packs: 1, cost: 7, weighted: false, estimate: false, promo: null } },
    foundCount: found, foundTotal: total, commonTotal: total, missing: [],
  };
}

function response(verdict: CompareResponse["verdict"]): CompareResponse {
  return {
    generatedAt: "2026-10-01T12:00:00", origin: { lat: 32.6, lon: 35.2, label: "מגדל העמק" },
    items: [{ key: "k1", canonicalId: "milk", qty: 1, strict: [], pinned: false },
            { key: "k2", canonicalId: null, qty: 1, strict: [], pinned: false }],
    unknownItems: ["k2"], ranked: [store("a", 7, 1), store("b", 8, 1)], otherStores: [], online: [],
    commonKeys: ["k1"], verdict, split: null, chains: [], pins: {},
    titles: { k1: "חלב", k2: "תחתית לעציץ" }, labels: { k1: "חלב", k2: null },
  };
}

describe("assistant price summary", () => {
  it("detects price questions and ignores others", () => {
    expect(isPriceQuestion("איפה הכי זול לקנות את הרשימה?")).toBe(true);
    expect(isPriceQuestion("באיזה סופר כדאי לי לקנות?")).toBe(true);
    expect(isPriceQuestion("מה המשימות שלי היום?")).toBe(false);
  });
  it("does not crown a winner when there is no verdict", () => {
    const text = summarizeForAssistant(response(null));
    expect(text).toContain("אין הכרעה");
    expect(text).not.toContain("הזול ביותר");
  });
  it("says a partial verdict is not the whole basket", () => {
    const text = summarizeForAssistant(
      response({ storeKey: "a:1", basis: "common", commonCount: 1, itemsMatched: 3, savingVsDearest: 1 })
    );
    expect(text).toContain("הכרעה חלקית");
    expect(text).toContain("זה לא כל הסל");
    expect(text).toContain("תחתית לעציץ"); // unrecognised items are named, not hidden
  });
  it("names the date, the basis and what was not checked", () => {
    const text = summarizeForAssistant(
      response({ storeKey: "a:1", basis: "full", commonCount: 1, itemsMatched: 1, savingVsDearest: 1 })
    );
    expect(text).toContain("2026-10-01T02:00");
    expect(text).toContain("בלי מבצעים");
    expect(text).toContain("מלאי בסניף לא נבדק");
  });
});
