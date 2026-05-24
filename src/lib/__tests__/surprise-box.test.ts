/**
 * Unit tests — surprise-box RNG distribution + time-aware greeting.
 * Sprint 7.30 Loop D.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { rollReward, getTimeAwareGreeting } from "@/lib/surprise-box";

describe("surprise-box — rollReward distribution", () => {
  it("returns reward with tier+type+displayLabel+emoji", () => {
    const r = rollReward();
    expect(r.tier).toMatch(/^(small|medium|large)$/);
    expect(r.type.length).toBeGreaterThan(0);
    expect(r.displayLabel.length).toBeGreaterThan(0);
    expect(r.emoji.length).toBeGreaterThan(0);
  });

  it("over 5000 rolls holds 70/25/5 distribution within ±3%", () => {
    const N = 5000;
    const counts = { small: 0, medium: 0, large: 0 };
    for (let i = 0; i < N; i++) counts[rollReward().tier]++;
    const small = counts.small / N;
    const medium = counts.medium / N;
    const large = counts.large / N;
    expect(small).toBeGreaterThan(0.67);
    expect(small).toBeLessThan(0.73);
    expect(medium).toBeGreaterThan(0.22);
    expect(medium).toBeLessThan(0.28);
    expect(large).toBeGreaterThan(0.02);
    expect(large).toBeLessThan(0.08);
  });

  it("small reward has positive bonus_points value", () => {
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
      const r = rollReward();
      if (r.tier === "small") {
        expect(r.type).toBe("bonus_points");
        const v = r.value as { points: number };
        expect(v.points).toBeGreaterThan(0);
        found = true;
      }
    }
    expect(found).toBe(true);
  });
});

describe("surprise-box — getTimeAwareGreeting", () => {
  afterEach(() => vi.useRealTimers());

  it("morning hours → בוקר טוב", () => {
    vi.useFakeTimers();
    // 08:00 IDT (05:00 UTC summer)
    vi.setSystemTime(new Date("2026-05-24T05:00:00Z"));
    const g = getTimeAwareGreeting();
    expect(g.greeting).toContain("בוקר");
  });

  it("afternoon → צהריים טובים", () => {
    vi.useFakeTimers();
    // 14:00 IDT
    vi.setSystemTime(new Date("2026-05-24T11:00:00Z"));
    const g = getTimeAwareGreeting();
    expect(g.greeting).toContain("צהריים");
  });

  it("evening → ערב טוב", () => {
    vi.useFakeTimers();
    // 19:30 IDT
    vi.setSystemTime(new Date("2026-05-24T16:30:00Z"));
    const g = getTimeAwareGreeting();
    expect(g.greeting).toContain("ערב");
  });

  it("late night returns שלום fallback", () => {
    vi.useFakeTimers();
    // 03:00 IDT (00:00 UTC)
    vi.setSystemTime(new Date("2026-05-24T00:00:00Z"));
    const g = getTimeAwareGreeting();
    expect(g.greeting).toBe("שלום!");
  });
});
