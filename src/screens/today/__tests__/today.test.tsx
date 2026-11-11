import { describe, expect, it } from "vitest";
import { chooseNextTask } from "../useTodayModel";

describe("today task priority", () => {
  it("chooses overdue before today, then oldest", () => {
    const tasks = [
      { id: "oldest", due_date: null, created_at: "2026-01-01" },
      { id: "today", due_date: "2026-11-11", created_at: "2026-03-01" },
      { id: "overdue", due_date: "2026-11-10", created_at: "2026-04-01" },
    ];
    expect(chooseNextTask(tasks, "2026-11-11")?.id).toBe("overdue");
    expect(chooseNextTask(tasks.slice(0, 2), "2026-11-11")?.id).toBe("today");
    expect(chooseNextTask(tasks.slice(0, 1), "2026-11-11")?.id).toBe("oldest");
  });
});

import { isQuietTime } from '../useTodayModel';

describe('quiet hours in Jerusalem', () => {
  it('allows celebration on an ordinary afternoon', () => {
    expect(isQuietTime(new Date('2026-12-10T12:00:00Z'))).toBe(false);
  });
  it('blocks 23:00 in Israel and Friday evening in winter', () => {
    expect(isQuietTime(new Date('2026-12-10T21:00:00Z'))).toBe(true);
    expect(isQuietTime(new Date('2026-12-11T14:00:00Z'))).toBe(true);
  });
});
