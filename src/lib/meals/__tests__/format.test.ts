import { describe, it, expect } from "vitest";
import { toHebrewShortDate, hebrewDayName, toHebrewDayAndDate, forHebrewDayLabel } from "../format";

describe("Hebrew date formatting", () => {
  it("formats YYYY-MM-DD as D.M with no leading zeros", () => {
    expect(toHebrewShortDate("2026-09-28")).toBe("28.9");
    expect(toHebrewShortDate("2026-01-05")).toBe("5.1");
  });

  it("resolves the correct Hebrew weekday name", () => {
    // 2026-09-27 is a Sunday.
    expect(hebrewDayName("2026-09-27")).toBe("יום ראשון");
    expect(hebrewDayName("2026-10-03")).toBe("שבת");
  });

  it("combines day name + short date", () => {
    expect(toHebrewDayAndDate("2026-09-28")).toBe("יום שני, 28.9");
  });

  it("builds a sentence-ready label", () => {
    expect(forHebrewDayLabel("2026-09-28")).toBe("ליום שני, 28.9");
  });

  it("handles שבת's irregular prefix (לשבת, not ליום שבת)", () => {
    expect(forHebrewDayLabel("2026-10-03")).toBe("לשבת, 3.10");
  });
});
