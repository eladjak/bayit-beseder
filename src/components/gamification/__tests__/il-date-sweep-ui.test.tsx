import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { StreakTracker } from "@/components/gamification/streak-tracker";
import { getRelativeDate } from "@/lib/relative-date";

class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
vi.stubGlobal("IntersectionObserver", IO);

describe("Israeli calendar day in pages/components", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T22:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("getRelativeDate: 01:30 on 2.10 is today, 13:00 on 1.10 is yesterday", () => {
    expect(getRelativeDate("2026-10-01T22:00:00Z")).toBe("היום");
    expect(getRelativeDate("2026-10-01T10:00:00Z")).toBe("אתמול");
  });

  it("StreakTracker 7-day strip ends on the Israeli today (2.10)", () => {
    const { container } = render(
      <StreakTracker completionDates={["2026-10-01T22:00:00Z"]} today="2026-10-02" bestStreak={3} />
    );
    // Last cell is "today" (2.10) and has activity, so it shows the flame (svg), not the number.
    const cells = container.querySelectorAll(".rounded-full.w-6");
    expect(cells.length).toBe(7);
    expect(cells[6].querySelector("svg")).not.toBeNull();
    // The cell before is 1.10, no activity: shows its day number.
    expect(cells[5].textContent).toBe("1");
  });
});
