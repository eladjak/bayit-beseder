import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { VerdictCard } from "@/components/prices/verdict-card";
import type { StoreResult } from "@/lib/prices/types";

const winner: StoreResult = {
  chain: "shufersal", chainName: "שופרסל", storeId: "1", name: "דיל מגדל העמק", city: "מגדל העמק",
  address: "", distanceKm: 1, published: null, fresh: true, lines: {}, foundCount: 5, foundTotal: 100,
};

describe("VerdictCard", () => {
  it("full basis: names the store and the saving", () => {
    const { container } = render(
      <VerdictCard winner={winner} totalItems={5}
        verdict={{ storeKey: "shufersal:1", basis: "full", commonCount: 5, itemsMatched: 5, savingVsDearest: 12.5 }} />
    );
    const t = container.textContent ?? "";
    expect(t).toContain("הסל הזול ביותר מבין הסניפים שנבדקו");
    expect(t).toContain("שופרסל דיל מגדל העמק");
    expect(t).toContain("12.50 ₪");
    expect(t).not.toContain("בכל הסניפים");
  });
  it("common basis: says it is not the whole basket", () => {
    const { container } = render(
      <VerdictCard winner={winner} totalItems={8}
        verdict={{ storeKey: "shufersal:1", basis: "common", commonCount: 3, itemsMatched: 6, savingVsDearest: 4 }} />
    );
    const t = container.textContent ?? "";
    expect(t).toContain("על 3 פריטים שנמצאו בכל הסניפים (מתוך 8)");
    expect(t).toContain("לא השוואה של כל הסל");
  });
  it("null verdict: no winner, no 'cheapest' claim", () => {
    const { container } = render(<VerdictCard winner={null} verdict={null} totalItems={4} />);
    const t = container.textContent ?? "";
    expect(t).toContain("אין מספיק פריטים משותפים כדי לקבוע מי הזול");
    expect(t).not.toContain("שופרסל");
    expect(t).not.toContain("הזול ביותר");
  });
});
