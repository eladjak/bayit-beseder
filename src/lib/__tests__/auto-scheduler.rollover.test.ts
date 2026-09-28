/**
 * Tests for the nightly planner's "gentle rollover" behavior (Sept 2026,
 * Elad's decision after seeing the first version's plan).
 *
 * Two-part split of overdue, undone tasks (status pending/in_progress):
 *   - overdue MORE than 14 days: never moved. Flagged instead
 *     (flagged_for_review_at) so a person decides what to do with them.
 *   - overdue 1-14 days: rolled forward, capped at 5 new due-dates per day
 *     per assignee (unassigned tasks share one household-wide cap of 5/day),
 *     the rest spread over the following days, oldest due_date first.
 *
 * Two layers are tested:
 *   1. planGentleRollover() -- pure, no I/O. This is where the cap/spread/
 *      14-day-boundary logic actually lives, so most cases live here.
 *   2. runNightlyPlannerForHousehold()/runNightlyPlannerForHouseholds() --
 *      the Supabase-facing wrapper, tested against a fake in-memory client
 *      (same approach as
 *      src/app/api/agent/task/__tests__/household-token-isolation.test.ts)
 *      that actually applies filters, so these prove the query logic, not
 *      just that a function got called.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  planGentleRollover,
  runNightlyPlannerForHousehold,
  runNightlyPlannerForHouseholds,
  getTodayInIsrael,
  REVIEW_THRESHOLD_DAYS,
  DAILY_CAP_PER_GROUP,
  UNASSIGNED_GROUP_KEY,
  type OverdueTaskInput,
} from "@/lib/auto-scheduler";

const TODAY_STR = "2026-09-28";

function task(id: string, daysOverdue: number, assigned_to: string | null = null): OverdueTaskInput {
  const d = new Date(`${TODAY_STR}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - daysOverdue);
  return { id, due_date: d.toISOString().slice(0, 10), assigned_to };
}

describe("planGentleRollover — pure planning logic", () => {
  // These boundary numbers are LITERAL (14, 15, 20), not derived from
  // REVIEW_THRESHOLD_DAYS. If they were derived from the constant, a
  // sabotage that changed the constant's value would silently pass these
  // tests too (the test's expectation would drift with the bug). Verified:
  // bumping REVIEW_THRESHOLD_DAYS from 14 to 30 was caught ONLY by the two
  // literal tests below, not by any test written in terms of the constant.
  it("REVIEW_THRESHOLD_DAYS is exactly 14 (the literal product decision, not a derived value)", () => {
    expect(REVIEW_THRESHOLD_DAYS).toBe(14);
  });

  it("flags a task overdue by a literal 20 days, never moves it", () => {
    const t20 = task("t20", 20);
    const plan = planGentleRollover([t20], TODAY_STR);
    expect(plan.flagIds).toEqual(["t20"]);
    expect(plan.moves).toEqual([]);
  });

  it("moves a task overdue by a literal 14 days (boundary: not flagged)", () => {
    const t14 = task("t14", 14);
    const plan = planGentleRollover([t14], TODAY_STR);
    expect(plan.flagIds).toEqual([]);
    expect(plan.moves).toEqual([{ id: "t14", due_date: TODAY_STR }]);
  });

  it("flags a task overdue by a literal 15 days (boundary: flagged)", () => {
    const t15 = task("t15", 15);
    const plan = planGentleRollover([t15], TODAY_STR);
    expect(plan.flagIds).toEqual(["t15"]);
    expect(plan.moves).toEqual([]);
  });

  it("moves a task overdue by exactly 1 day to today", () => {
    const t1 = task("t1", 1);
    const plan = planGentleRollover([t1], TODAY_STR);
    expect(plan.moves).toEqual([{ id: "t1", due_date: TODAY_STR }]);
  });

  it("caps at 5 per assignee per day and spreads the rest to following days", () => {
    // 7 tasks for the same assignee, all overdue 1-14 days, oldest first.
    const tasks = [
      task("a", 10, "user-1"),
      task("b", 9, "user-1"),
      task("c", 8, "user-1"),
      task("d", 7, "user-1"),
      task("e", 6, "user-1"),
      task("f", 5, "user-1"),
      task("g", 4, "user-1"),
    ];
    const plan = planGentleRollover(tasks, TODAY_STR);
    const byId = Object.fromEntries(plan.moves.map((m) => [m.id, m.due_date]));

    // First 5 (oldest-first: a,b,c,d,e) land on today.
    expect(byId.a).toBe(TODAY_STR);
    expect(byId.b).toBe(TODAY_STR);
    expect(byId.c).toBe(TODAY_STR);
    expect(byId.d).toBe(TODAY_STR);
    expect(byId.e).toBe(TODAY_STR);
    // The 6th and 7th spill to tomorrow.
    expect(byId.f).toBe("2026-09-29");
    expect(byId.g).toBe("2026-09-29");
  });

  it("keeps separate caps per assignee -- one assignee's overflow doesn't touch another's slots", () => {
    const tasks = [
      task("a1", 5, "user-1"),
      task("a2", 4, "user-1"),
      task("a3", 3, "user-1"),
      task("a4", 2, "user-1"),
      task("a6", 6, "user-1"), // most overdue of the 6 -> processed first
      task("a5", 1, "user-1"), // LEAST overdue of the 6 -> processed last, spills
      task("b1", 5, "user-2"),
    ];
    const plan = planGentleRollover(tasks, TODAY_STR);
    const byId = Object.fromEntries(plan.moves.map((m) => [m.id, m.due_date]));

    // Oldest-due-date-first means the LEAST overdue of the 6 (a5, 1 day
    // overdue) is the one bumped to tomorrow -- the other 5 (including the
    // most-overdue a6) claim today first.
    expect(byId.a6).toBe(TODAY_STR);
    expect(byId.a5).toBe("2026-09-29");
    // user-2's only task still lands on today -- user-1's overflow must not
    // consume user-2's cap.
    expect(byId.b1).toBe(TODAY_STR);
  });

  it("treats unassigned tasks as one shared per-household group, capped at 5/day", () => {
    const tasks = Array.from({ length: 6 }, (_, i) => task(`u${i}`, 10 - i, null));
    const plan = planGentleRollover(tasks, TODAY_STR);
    const todays = plan.moves.filter((m) => m.due_date === TODAY_STR);
    const tomorrows = plan.moves.filter((m) => m.due_date === "2026-09-29");
    expect(todays).toHaveLength(DAILY_CAP_PER_GROUP);
    expect(tomorrows).toHaveLength(1);
  });

  it("accounts for already-scheduled tasks when computing the cap (idempotency building block)", () => {
    // 3 slots already taken today for user-1 (e.g. from a prior run, or a
    // real future-dated task); only 2 more fit before spilling.
    const alreadyScheduled = [
      { due_date: TODAY_STR, assigned_to: "user-1" },
      { due_date: TODAY_STR, assigned_to: "user-1" },
      { due_date: TODAY_STR, assigned_to: "user-1" },
    ];
    const tasks = [task("x1", 5, "user-1"), task("x2", 4, "user-1"), task("x3", 3, "user-1")];
    const plan = planGentleRollover(tasks, TODAY_STR, alreadyScheduled);
    const byId = Object.fromEntries(plan.moves.map((m) => [m.id, m.due_date]));
    expect(byId.x1).toBe(TODAY_STR);
    expect(byId.x2).toBe(TODAY_STR);
    expect(byId.x3).toBe("2026-09-29"); // the 6th for user-1 today -> spills
  });

  it("is a pure function: identical inputs produce an identical plan", () => {
    const tasks = [task("a", 10, "user-1"), task("b", 2, null)];
    const plan1 = planGentleRollover(tasks, TODAY_STR);
    const plan2 = planGentleRollover(tasks, TODAY_STR);
    expect(plan1).toEqual(plan2);
  });

  it("UNASSIGNED_GROUP_KEY is exported and distinct from any real user id shape", () => {
    expect(UNASSIGNED_GROUP_KEY).toBe("__unassigned__");
  });
});

// --------------------------------------------
// Supabase-facing wrapper
// --------------------------------------------

interface FakeTask {
  id: string;
  household_id: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  due_date: string | null;
  assigned_to: string | null;
  flagged_for_review_at: string | null;
}

/**
 * Minimal fake of the Supabase query builder covering exactly the calls
 * runNightlyPlannerForHousehold makes: two SELECTs (eq/lt/in/is and
 * eq/gte/in) and per-date UPDATE...in()...select() calls. It actually
 * filters and mutates an in-memory store.
 */
function createFakeTasksClient(initialTasks: FakeTask[]) {
  const store = new Map(initialTasks.map((t) => [t.id, { ...t }]));

  function from(table: string) {
    if (table !== "tasks") {
      throw new Error(`fake supabase: unexpected table "${table}"`);
    }

    const state: {
      op: "select" | "update";
      eqs: [string, unknown][];
      lt?: [string, unknown];
      gte?: [string, unknown];
      inFilter?: [string, unknown[]];
      isNulls: string[];
      updateRow?: Record<string, unknown>;
    } = { op: "select", eqs: [], isNulls: [] };

    const builder = {
      // .select() only DECLARES which columns to return -- it must never
      // clobber an earlier .update() call. The real code chains
      // .update(row)...in(...).select("id"), i.e. select() comes AFTER
      // update() on the wire.
      select() {
        return builder;
      },
      update(row: Record<string, unknown>) {
        state.op = "update";
        state.updateRow = row;
        return builder;
      },
      eq(col: string, val: unknown) {
        state.eqs.push([col, val]);
        return builder;
      },
      lt(col: string, val: unknown) {
        state.lt = [col, val];
        return builder;
      },
      gte(col: string, val: unknown) {
        state.gte = [col, val];
        return builder;
      },
      in(col: string, vals: unknown[]) {
        state.inFilter = [col, vals];
        return builder;
      },
      is(col: string) {
        state.isNulls.push(col);
        return builder;
      },
      // The real code always terminates the chain with .select("id") (even
      // on update() calls, to get back which rows were touched), so that's
      // the single place we resolve.
      then(onFulfilled: (v: { data: unknown; error: unknown }) => unknown) {
        let rows = Array.from(store.values());
        for (const [col, val] of state.eqs) {
          rows = rows.filter((r) => (r as Record<string, unknown>)[col] === val);
        }
        if (state.lt) {
          const [col, val] = state.lt;
          rows = rows.filter((r) => {
            const v = (r as Record<string, unknown>)[col];
            return v != null && (v as string) < (val as string);
          });
        }
        if (state.gte) {
          const [col, val] = state.gte;
          rows = rows.filter((r) => {
            const v = (r as Record<string, unknown>)[col];
            return v != null && (v as string) >= (val as string);
          });
        }
        if (state.inFilter) {
          const [col, vals] = state.inFilter;
          rows = rows.filter((r) => vals.includes((r as Record<string, unknown>)[col]));
        }
        for (const col of state.isNulls) {
          rows = rows.filter((r) => (r as Record<string, unknown>)[col] == null);
        }

        if (state.op === "update" && state.updateRow) {
          for (const r of rows) {
            store.set(r.id, { ...r, ...state.updateRow });
          }
        }

        return Promise.resolve({ data: rows, error: null }).then(onFulfilled);
      },
    };

    return builder;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { from } as any, store };
}

const HOUSEHOLD_A = "11111111-1111-1111-1111-111111111111";
const HOUSEHOLD_B = "22222222-2222-2222-2222-222222222222";

function makeTask(overrides: Partial<FakeTask> & { id: string; household_id: string }): FakeTask {
  return {
    status: "pending",
    due_date: null,
    assigned_to: null,
    flagged_for_review_at: null,
    ...overrides,
  };
}

describe("runNightlyPlannerForHousehold", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves an overdue (1-14 day) pending task to today", async () => {
    const { client, store } = createFakeTasksClient([
      makeTask({ id: "t1", household_id: HOUSEHOLD_A, due_date: "2026-09-20" }),
    ]);
    const today = new Date("2026-09-28T00:00:00.000Z");

    const result = await runNightlyPlannerForHousehold(client, HOUSEHOLD_A, today);

    expect(result.movedToday).toBe(1);
    expect(result.movedLater).toBe(0);
    expect(result.flaggedForReview).toBe(0);
    expect(result.errors).toEqual([]);
    expect(store.get("t1")?.due_date).toBe("2026-09-28");
  });

  it("flags (does not move) a task overdue more than 14 days", async () => {
    const { client, store } = createFakeTasksClient([
      makeTask({ id: "old", household_id: HOUSEHOLD_A, due_date: "2026-02-20" }),
    ]);
    const today = new Date("2026-09-28T00:00:00.000Z");

    const result = await runNightlyPlannerForHousehold(client, HOUSEHOLD_A, today);

    expect(result.flaggedForReview).toBe(1);
    expect(result.movedToday).toBe(0);
    expect(result.movedLater).toBe(0);
    // due_date is untouched -- that's the whole point of flagging instead
    // of moving.
    expect(store.get("old")?.due_date).toBe("2026-02-20");
    expect(store.get("old")?.flagged_for_review_at).not.toBeNull();
  });

  it("leaves completed and skipped tasks untouched (sabotage-verified control)", async () => {
    const { client, store } = createFakeTasksClient([
      makeTask({ id: "c1", household_id: HOUSEHOLD_A, status: "completed", due_date: "2026-02-20" }),
      makeTask({ id: "s1", household_id: HOUSEHOLD_A, status: "skipped", due_date: "2026-09-20" }),
    ]);
    const today = new Date("2026-09-28T00:00:00.000Z");

    const result = await runNightlyPlannerForHousehold(client, HOUSEHOLD_A, today);

    expect(result.movedToday + result.movedLater + result.flaggedForReview).toBe(0);
    expect(store.get("c1")?.due_date).toBe("2026-02-20");
    expect(store.get("s1")?.due_date).toBe("2026-09-20");
  });

  it("never changes fields other than due_date / flagged_for_review_at", async () => {
    const { client, store } = createFakeTasksClient([
      makeTask({ id: "t1", household_id: HOUSEHOLD_A, due_date: "2026-09-20", assigned_to: "user-1" }),
    ]);
    const today = new Date("2026-09-28T00:00:00.000Z");
    await runNightlyPlannerForHousehold(client, HOUSEHOLD_A, today);
    const row = store.get("t1");
    expect(row?.assigned_to).toBe("user-1");
    expect(row?.status).toBe("pending");
    expect(row?.household_id).toBe(HOUSEHOLD_A);
  });

  it("respects the household boundary", async () => {
    const { client, store } = createFakeTasksClient([
      makeTask({ id: "mine", household_id: HOUSEHOLD_A, due_date: "2026-09-20" }),
      makeTask({ id: "theirs", household_id: HOUSEHOLD_B, due_date: "2026-09-20" }),
    ]);
    const today = new Date("2026-09-28T00:00:00.000Z");
    await runNightlyPlannerForHousehold(client, HOUSEHOLD_A, today);
    expect(store.get("mine")?.due_date).toBe("2026-09-28");
    expect(store.get("theirs")?.due_date).toBe("2026-09-20");
  });

  it("is idempotent: a second run the same Israel day moves and flags nothing further", async () => {
    const { client, store } = createFakeTasksClient([
      makeTask({ id: "t1", household_id: HOUSEHOLD_A, due_date: "2026-09-20" }), // 1-14 days
      makeTask({ id: "old", household_id: HOUSEHOLD_A, due_date: "2026-02-20" }), // >14 days
    ]);
    const today = new Date("2026-09-28T00:00:00.000Z");

    const first = await runNightlyPlannerForHousehold(client, HOUSEHOLD_A, today);
    expect(first.movedToday).toBe(1);
    expect(first.flaggedForReview).toBe(1);

    const flaggedAtAfterFirst = store.get("old")?.flagged_for_review_at;

    const second = await runNightlyPlannerForHousehold(client, HOUSEHOLD_A, today);
    expect(second.movedToday).toBe(0);
    expect(second.movedLater).toBe(0);
    expect(second.flaggedForReview).toBe(0);
    // The flag timestamp itself is untouched by the second run.
    expect(store.get("old")?.flagged_for_review_at).toBe(flaggedAtAfterFirst);
    expect(store.get("t1")?.due_date).toBe("2026-09-28");
  });

  it("caps at 5/day per assignee through the real fetch+apply path and spreads the rest", async () => {
    // due_date 14, 13, ..., 8 days before today -- all strictly inside the
    // 1-14 day rollover window (14 is the inclusive boundary), so all 7 are
    // rollover candidates, none get flagged.
    const tasks: FakeTask[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date("2026-09-28T00:00:00.000Z");
      d.setUTCDate(d.getUTCDate() - (14 - i));
      tasks.push(
        makeTask({
          id: `t${i}`,
          household_id: HOUSEHOLD_A,
          assigned_to: "user-1",
          due_date: d.toISOString().slice(0, 10),
        })
      );
    }
    const { client, store } = createFakeTasksClient(tasks);
    const today = new Date("2026-09-28T00:00:00.000Z");

    const result = await runNightlyPlannerForHousehold(client, HOUSEHOLD_A, today);

    expect(result.movedToday).toBe(5);
    expect(result.movedLater).toBe(2);
    expect(result.spreadDays).toBe(1);

    const dueDates = Array.from(store.values())
      .filter((t) => t.household_id === HOUSEHOLD_A)
      .map((t) => t.due_date)
      .sort();
    expect(dueDates.filter((d) => d === "2026-09-28")).toHaveLength(5);
    expect(dueDates.filter((d) => d === "2026-09-29")).toHaveLength(2);
  });

  it("reports a Supabase fetch error without throwing", async () => {
    const client = {
      from: () => {
        throw new Error("should not be called for this test's assertion path");
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    // Override with a controlled failing chain instead of the throwing stub above.
    client.from = () => ({
      select: () => ({
        eq: () => ({
          lt: () => ({
            in: () => ({
              is: () => Promise.resolve({ data: null, error: { message: "connection refused" } }),
            }),
          }),
        }),
      }),
    });

    const result = await runNightlyPlannerForHousehold(
      client,
      HOUSEHOLD_A,
      new Date("2026-09-28T00:00:00.000Z")
    );
    expect(result.movedToday).toBe(0);
    expect(result.errors[0]).toMatch(/connection refused/);
  });
});

describe("runNightlyPlannerForHouseholds", () => {
  it("aggregates across households and reports counts only", async () => {
    const { client } = createFakeTasksClient([
      makeTask({ id: "a1", household_id: HOUSEHOLD_A, due_date: "2026-09-20" }),
      makeTask({ id: "a2", household_id: HOUSEHOLD_A, due_date: "2026-02-01" }),
      makeTask({ id: "b1", household_id: HOUSEHOLD_B, due_date: "2026-09-21" }),
    ]);
    const today = new Date("2026-09-28T00:00:00.000Z");

    const { summary, results } = await runNightlyPlannerForHouseholds(
      client,
      [HOUSEHOLD_A, HOUSEHOLD_B],
      today
    );

    expect(summary.householdsProcessed).toBe(2);
    expect(summary.tasksMovedToday).toBe(2);
    expect(summary.tasksFlaggedForReview).toBe(1);
    expect(summary.errors).toEqual([]);
    expect(results).toHaveLength(2);
    expect(Object.keys(summary)).toEqual([
      "householdsProcessed",
      "tasksMovedToday",
      "tasksMovedLater",
      "tasksFlaggedForReview",
      "errors",
    ]);
  });
});

describe("Israel-date boundary (reused from getTodayInIsrael, exercised through the planner)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses Israel's calendar day, not UTC's, at the 22:00 UTC cron trigger time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T22:00:00.000Z")); // 01:00 IDT next day
    const israelToday = getTodayInIsrael();
    expect(israelToday.toISOString().slice(0, 10)).toBe("2026-09-28");

    const { client, store } = createFakeTasksClient([
      makeTask({ id: "t1", household_id: HOUSEHOLD_A, due_date: "2026-09-27" }),
    ]);

    const result = await runNightlyPlannerForHousehold(client, HOUSEHOLD_A, israelToday);
    expect(result.movedToday).toBe(1);
    expect(store.get("t1")?.due_date).toBe("2026-09-28");
  });
});
