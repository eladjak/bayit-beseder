import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCalendarMonth, computeBestStreak, countCompletedThisWeek } from "@/lib/task-stats";
import { todayISO } from "@/lib/task-flags";
import { addDaysStr, ilDay, ilToday, ymd } from "@/lib/il-date";
import type { TaskCompletionRow } from "@/lib/types/database";

// 2026-10-01T22:30Z = 01:30 on 2.10 in Israel (UTC+3). UTC date is still 1.10.
const CLOCK = new Date("2026-10-01T22:30:00Z");
const row = (iso: string, id = iso): TaskCompletionRow => ({
  id,
  task_id: "t1",
  user_id: "u1",
  completed_at: iso,
  photo_url: null,
  notes: null,
});

describe("Israeli calendar day in lib/ (task-stats, task-flags, il-date)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(CLOCK);
  });
  afterEach(() => vi.useRealTimers());

  it("helpers: ilToday is 2.10, ilDay maps 22:30Z to the next Israeli day", () => {
    expect(ilToday()).toBe("2026-10-02");
    expect(ilDay("2026-10-01T22:30:00Z")).toBe("2026-10-02");
    expect(addDaysStr("2026-10-02", -2)).toBe("2026-09-30");
    expect(ymd(2026, 9, 0)).toBe("2026-09-30");
  });

  it("todayISO() is the Israeli date", () => {
    expect(todayISO()).toBe("2026-10-02");
  });

  it("computeBestStreak: 01:30 on 2.10 and 13:00 on 1.10 are two days", () => {
    expect(
      computeBestStreak([row("2026-10-01T22:30:00Z"), row("2026-10-01T10:00:00Z")])
    ).toBe(2);
  });

  it("countCompletedThisWeek: 26.9 (IL, 01:30) is inside the 7-day window ending 2.10", () => {
    // 2026-09-25T22:30Z is 01:30 on 26.9 in Israel; window start is 26.9.
    expect(countCompletedThisWeek([row("2026-09-25T22:30:00Z")], ilToday())).toBe(1);
  });

  it("buildCalendarMonth: cells are exact days in an Israeli-timezone browser", () => {
    const prev = process.env.TZ;
    process.env.TZ = "Asia/Jerusalem";
    try {
      const cells = buildCalendarMonth(2026, 9, [], [row("2026-10-01T22:30:00Z")], ilToday());
      expect(cells[0].date).toBe("2026-09-27"); // Sunday before Thu 1.10
      expect(cells[4].date).toBe("2026-10-01");
      const today = cells.find((c) => c.isToday);
      expect(today?.date).toBe("2026-10-02");
      expect(today?.dayOfMonth).toBe(2);
      expect(today?.completedCount).toBe(1);
    } finally {
      if (prev === undefined) delete process.env.TZ;
      else process.env.TZ = prev;
    }
  });
});
