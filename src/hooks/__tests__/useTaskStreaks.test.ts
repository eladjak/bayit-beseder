import { renderHook } from "@testing-library/react";
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

describe("useTaskStreaks", () => {
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
