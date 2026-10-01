import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTaskStreaks } from "@/hooks/useTaskStreaks";
import type { TaskCompletionRow } from "@/lib/types/database";

function makeCompletion(taskId: string, daysAgo: number): TaskCompletionRow {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(10, 0, 0, 0);
  return {
    id: `comp-${taskId}-${daysAgo}`,
    task_id: taskId,
    user_id: "user1",
    completed_at: date.toISOString(),
    photo_url: null,
    notes: null,
  };
}

// Fixed clock (noon Israel time) so the suite does not depend on the hour it runs.
const NOON_IL = new Date("2026-06-15T09:00:00Z");

describe("useTaskStreaks", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOON_IL);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for a task with no completions", () => {
    const { result } = renderHook(() => useTaskStreaks([]));
    expect(result.current.getStreak("unknown-task")).toBe(0);
  });

  it("returns 1 for a single completion today", () => {
    const completions = [makeCompletion("task1", 0)];
    const { result } = renderHook(() => useTaskStreaks(completions));
    expect(result.current.getStreak("task1")).toBe(1);
  });

  it("returns 1 for a single completion yesterday", () => {
    const completions = [makeCompletion("task1", 1)];
    const { result } = renderHook(() => useTaskStreaks(completions));
    expect(result.current.getStreak("task1")).toBe(1);
  });

  it("returns 0 when last completion was 2+ days ago", () => {
    const completions = [makeCompletion("task1", 3)];
    const { result } = renderHook(() => useTaskStreaks(completions));
    expect(result.current.getStreak("task1")).toBe(0);
  });

  it("counts consecutive days correctly", () => {
    const completions = [
      makeCompletion("task1", 0), // today
      makeCompletion("task1", 1), // yesterday
      makeCompletion("task1", 2), // 2 days ago
      makeCompletion("task1", 3), // 3 days ago
    ];
    const { result } = renderHook(() => useTaskStreaks(completions));
    expect(result.current.getStreak("task1")).toBe(4);
  });

  it("breaks streak on missing day", () => {
    const completions = [
      makeCompletion("task1", 0), // today
      makeCompletion("task1", 1), // yesterday
      // gap: 2 days ago is missing
      makeCompletion("task1", 3), // 3 days ago
    ];
    const { result } = renderHook(() => useTaskStreaks(completions));
    expect(result.current.getStreak("task1")).toBe(2);
  });

  it("deduplicates multiple completions on the same day", () => {
    const completions = [
      makeCompletion("task1", 0),
      makeCompletion("task1", 0), // duplicate today
      makeCompletion("task1", 1),
    ];
    const { result } = renderHook(() => useTaskStreaks(completions));
    expect(result.current.getStreak("task1")).toBe(2);
  });

  it("handles multiple tasks independently", () => {
    const completions = [
      makeCompletion("task1", 0),
      makeCompletion("task1", 1),
      makeCompletion("task2", 0),
    ];
    const { result } = renderHook(() => useTaskStreaks(completions));
    expect(result.current.getStreak("task1")).toBe(2);
    expect(result.current.getStreak("task2")).toBe(1);
  });
});

// 2026-10-01T22:30Z is 01:30 on 2.10 in Israel (UTC+3). The UTC date is still 1.10.
describe("useTaskStreaks around Israeli midnight (Asia/Jerusalem, not UTC)", () => {
  const at = (iso: string, id = "c1"): TaskCompletionRow => ({
    id,
    task_id: "task1",
    user_id: "user1",
    completed_at: iso,
    photo_url: null,
    notes: null,
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T22:30:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts 2.10 (01:30 IL) and 1.10 as two separate days", () => {
    const completions = [
      at("2026-10-01T22:30:00Z", "a"), // 2.10 01:30 IL
      at("2026-10-01T10:00:00Z", "b"), // 1.10 13:00 IL
    ];
    const { result } = renderHook(() => useTaskStreaks(completions));
    expect(result.current.getStreak("task1")).toBe(2);
  });

  it("a completion on 30.9 (IL) is two days back, so the streak is 0", () => {
    const { result } = renderHook(() =>
      useTaskStreaks([at("2026-09-30T10:00:00Z")])
    );
    expect(result.current.getStreak("task1")).toBe(0);
  });

  it("a completion on 1.10 (IL) is yesterday, so the streak is 1", () => {
    const { result } = renderHook(() =>
      useTaskStreaks([at("2026-10-01T10:00:00Z")])
    );
    expect(result.current.getStreak("task1")).toBe(1);
  });
});
