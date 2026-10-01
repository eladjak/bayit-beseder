import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeConsecutiveStreak, computeWeeklyChallengeProgress } from "@/hooks/useNotifications";

// 2026-10-01T22:30Z = 01:30 on Friday 2.10 in Israel.
describe("Israeli calendar day in hooks/", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T22:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("computeConsecutiveStreak counts timestamps by Israeli day", () => {
    // today (Israel) = 2026-10-02
    expect(
      computeConsecutiveStreak(["2026-10-01T22:30:00Z", "2026-10-01T10:00:00Z"], "2026-10-02")
    ).toBe(2);
  });

  it("computeWeeklyChallengeProgress: Sunday 27.9 01:30 (IL) counts for the week of Fri 2.10", () => {
    // 2026-09-26T22:30Z is 01:30 on Sunday 27.9 IL. UTC slice says Saturday 26.9 (previous week).
    const r = computeWeeklyChallengeProgress(["2026-09-26T22:30:00Z"], "2026-10-02", 5);
    expect(r.completed).toBe(1);
  });
});
