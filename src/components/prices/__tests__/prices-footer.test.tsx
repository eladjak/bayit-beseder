import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PricesFooter } from "@/components/prices/extras";
import { dataAsOf, priceAttribution } from "@/components/prices/format";
import type { CompareResponse } from "@/lib/prices/types";

function data(chains: CompareResponse["chains"]): CompareResponse {
  return {
    generatedAt: "2026-10-02T08:00:00Z",
    origin: { lat: 32.6, lon: 35.3, label: "מגדל העמק" },
    items: [], unknownItems: [], ranked: [], otherStores: [], online: [], commonKeys: [],
    verdict: null, split: null, chains, pins: {}, titles: {}, labels: {},
  };
}

describe("price data attribution", () => {
  it("uses the OLDEST successful update, in Israel time", () => {
    // 21:30Z on 30.9 is already 1.10 in Israel; the UTC slice would say 30.9.
    expect(dataAsOf([
      { lastOk: "2026-10-02T04:00:00Z" },
      { lastOk: "2026-09-30T21:30:00Z" },
      { lastOk: null },
    ])).toBe("01.10.2026");
  });

  it("says the date is unknown instead of inventing one", () => {
    expect(priceAttribution([{ lastOk: null }, { lastOk: "garbage" }])).toBe(
      "מחירים לפי פרסום הרשתות לפי חוק שקיפות המחירים. תאריך העדכון אינו ידוע."
    );
  });

  it("footer shows attribution with date, disclaimer and no-affiliation line", () => {
    const { container } = render(
      <PricesFooter data={data([
        { key: "shufersal", name: "שופרסל", lastOk: "2026-10-02T04:00:00Z", lastRunFailed: false, onlineOnly: false },
        { key: "rami", name: "רמי לוי", lastOk: "2026-10-01T04:00:00Z", lastRunFailed: false, onlineOnly: false },
      ])} />
    );
    const t = container.textContent ?? "";
    expect(t).toContain("מחירים לפי פרסום הרשתות לפי חוק שקיפות המחירים, נכון ל-01.10.2026.");
    expect(t).toContain("המחירים עשויים להשתנות");
    expect(t).toContain("מבצעים ומחירי מועדון משתנים בין סניפים");
    expect(t).toContain("אינו קשור לרשתות השיווק");
  });
});
