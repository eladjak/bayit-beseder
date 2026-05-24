/**
 * Unit tests — weekly-wheel ISO week + availability + segment distribution.
 * Sprint 7.30 Loop D.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  SEGMENTS,
  spinSegment,
  currentIsoWeek,
  isWheelAvailableTime,
} from "@/lib/weekly-wheel";

describe("weekly-wheel — SEGMENTS array", () => {
  it("has at least 8 segments", () => {
    expect(SEGMENTS.length).toBeGreaterThanOrEqual(8);
  });

  it("every segment has id+emoji+label+weight>0", () => {
    for (const s of SEGMENTS) {
      expect(s.id.length).toBeGreaterThan(0);
      expect(s.emoji.length).toBeGreaterThan(0);
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.weight).toBeGreaterThan(0);
    }
  });

  it("segment ids are unique", () => {
    const ids = new Set(SEGMENTS.map((s) => s.id));
    expect(ids.size).toBe(SEGMENTS.length);
  });

  it("compliment has highest weight (emotional anchor)", () => {
    const compliment = SEGMENTS.find((s) => s.id === "compliment");
    expect(compliment).toBeDefined();
    const maxWeight = Math.max(...SEGMENTS.map((s) => s.weight));
    expect(compliment!.weight).toBe(maxWeight);
  });
});

describe("weekly-wheel — spinSegment", () => {
  it("returns a real segment", () => {
    const s = spinSegment();
    expect(SEGMENTS).toContainEqual(s);
  });

  it("over 3000 spins all 8 segments appear at least once", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) seen.add(spinSegment().id);
    expect(seen.size).toBe(SEGMENTS.length);
  });
});

describe("weekly-wheel — currentIsoWeek", () => {
  afterEach(() => vi.useRealTimers());

  it("returns YYYY-Www format", () => {
    expect(currentIsoWeek()).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("2026-05-24 (Sunday) → 2026-W21", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-24T12:00:00Z"));
    expect(currentIsoWeek()).toBe("2026-W21");
  });

  it("2026-01-01 (Thursday) → 2026-W01", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    expect(currentIsoWeek()).toBe("2026-W01");
  });
});

describe("weekly-wheel — isWheelAvailableTime", () => {
  afterEach(() => vi.useRealTimers());

  it("Wednesday 14:00 → not available", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T11:00:00Z")); // Wed 14:00 IDT
    expect(isWheelAvailableTime()).toBe(false);
  });

  it("Friday 12:00 → not available (before 14:00)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-22T09:00:00Z")); // Fri 12:00 IDT
    expect(isWheelAvailableTime()).toBe(false);
  });

  it("Friday 15:00 → available", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-22T12:00:00Z")); // Fri 15:00 IDT
    expect(isWheelAvailableTime()).toBe(true);
  });

  it("Saturday 20:00 → available", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-23T17:00:00Z")); // Sat 20:00 IDT
    expect(isWheelAvailableTime()).toBe(true);
  });

  it("Sunday 08:00 → not available (work week start)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-24T05:00:00Z")); // Sun 08:00 IDT
    expect(isWheelAvailableTime()).toBe(false);
  });
});
