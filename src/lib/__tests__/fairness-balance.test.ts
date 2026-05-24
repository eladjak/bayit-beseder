import { describe, it, expect } from "vitest";
import { computeFairnessBalance } from "@/lib/fairness-balance";
import type { TaskCompletionRow } from "@/lib/types/database";

const today = "2026-05-24";
const mk = (user_id: string, day: string): TaskCompletionRow =>
  ({ id: `${user_id}-${day}`, task_id: "t", user_id, completed_at: `${day}T10:00:00Z`, photo_url: null, notes: null }) as TaskCompletionRow;

const A = { id: "a", name: "אלעד" };
const B = { id: "b", name: "ענבל" };

describe("fairness-balance", () => {
  it("hides when fewer than 2 members", () => {
    const r = computeFairnessBalance([mk("a", today)], [A], today);
    expect(r.show).toBe(false);
  });

  it("hides when no completions this week", () => {
    const r = computeFairnessBalance([], [A, B], today);
    expect(r.show).toBe(false);
  });

  it("50/50 → balanced", () => {
    const r = computeFairnessBalance([mk("a", today), mk("b", today)], [A, B], today);
    expect(r.show).toBe(true);
    expect(r.verdict).toBe("balanced");
    expect(r.shares.find((s) => s.userId === "a")?.pct).toBe(50);
  });

  it("100/0 → skewed, headline names the TOP contributor (no shaming)", () => {
    const r = computeFairnessBalance([mk("a", today), mk("a", today), mk("a", today)], [A, B], today);
    expect(r.verdict).toBe("skewed");
    expect(r.headline).toContain("אלעד"); // top contributor named positively
    expect(r.headline).not.toContain("ענבל"); // low contributor never blamed
  });

  it("ignores completions older than 7 days", () => {
    const r = computeFairnessBalance([mk("a", "2026-05-01"), mk("b", today)], [A, B], today);
    expect(r.total).toBe(1);
  });
});
