import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { taskToCalendarEvent } from "@/lib/google-calendar";

/**
 * Regression test for a DST bug in offsetDateTime() (src/lib/google-calendar.ts).
 *
 * The bug: the Israel UTC offset used to compute an event's end time was
 * resolved from `new Date()` (i.e. "now", the moment the code runs) instead
 * of from the task's own due date. Israel observes DST (Asia/Jerusalem is
 * UTC+2 in winter, UTC+3 in summer). When "now" and the due date fall on
 * opposite sides of the DST boundary, the wrong offset is used and the
 * computed end time is off by exactly one hour.
 *
 * Per ~/.claude/rules/time-and-clocks.md: "כל החלטה תלוית-זמן נקבעת מ-
 * Asia/Jerusalem במפורש" — the offset must be derived from the date being
 * computed, never from "now".
 */
describe("taskToCalendarEvent — DST-safe end time", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes a correct 60-minute end time for a summer (DST) due date while 'now' is winter", () => {
    // "Now" is January (Israel = UTC+2, no DST).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T10:00:00Z"));

    // Task is due in July (Israel = UTC+3, DST active) — a season the code
    // never looks at if it (incorrectly) derives the offset from "now".
    const event = taskToCalendarEvent({
      id: "t1",
      title: "Summer task",
      due_date: "2026-07-15",
      estimated_minutes: 60,
    });

    expect(event.start).toEqual({
      dateTime: "2026-07-15T09:00:00",
      timeZone: "Asia/Jerusalem",
    });
    // 09:00 + 60 minutes = 10:00, entirely within the same DST regime as the
    // start time. A "now"-derived (winter) offset produces 11:00 instead.
    expect(event.end).toEqual({
      dateTime: "2026-07-15T10:00:00",
      timeZone: "Asia/Jerusalem",
    });
  });

  it("computes a correct 60-minute end time for a winter due date while 'now' is summer", () => {
    // "Now" is July (Israel = UTC+3, DST active).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T10:00:00Z"));

    const event = taskToCalendarEvent({
      id: "t2",
      title: "Winter task",
      due_date: "2026-01-15",
      estimated_minutes: 60,
    });

    expect(event.end).toEqual({
      dateTime: "2026-01-15T10:00:00",
      timeZone: "Asia/Jerusalem",
    });
  });
});
