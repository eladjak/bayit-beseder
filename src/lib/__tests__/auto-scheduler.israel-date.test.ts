import { describe, it, expect, afterEach, vi } from "vitest";
import { getTodayInIsrael, formatDate } from "@/lib/auto-scheduler";

/**
 * Regression test for a date-off-by-one bug in the auto-schedule cron.
 *
 * The cron fires at 22:00 UTC (vercel.json: "0 22 * * *"). Israel
 * (Asia/Jerusalem) is UTC+2 in winter and UTC+3 in summer, so at that exact
 * moment it is already 00:00 (winter) or 01:00 (summer) the NEXT day in
 * Israel. The route used to compute its scheduling window from
 * `new Date()` and then read its UTC calendar date (via formatDate ->
 * toISOString().slice(0,10)) — which is still YESTERDAY relative to
 * Israel. Every night the 7-day window was silently built one day behind:
 * real "today" for Israel users was never scheduled.
 */
describe("getTodayInIsrael — matches Israel's real calendar day, not UTC's", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("winter: at 22:00 UTC Dec 31, Israel is already Jan 1", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T22:00:00.000Z"));

    // The old buggy behavior:
    expect(new Date().toISOString().slice(0, 10)).toBe("2026-12-31");

    // The correct Israel calendar day:
    expect(formatDate(getTodayInIsrael())).toBe("2027-01-01");
  });

  it("summer (DST): at 22:00 UTC, Israel (UTC+3) is already one day ahead", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T22:00:00.000Z"));

    expect(new Date().toISOString().slice(0, 10)).toBe("2026-07-14"); // old bug
    expect(formatDate(getTodayInIsrael())).toBe("2026-07-15"); // correct
  });

  it("daytime: UTC and Israel agree (sanity check — not every hour is broken)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T08:00:00.000Z")); // 11:00 Israel

    expect(formatDate(getTodayInIsrael())).toBe(new Date().toISOString().slice(0, 10));
  });
});
