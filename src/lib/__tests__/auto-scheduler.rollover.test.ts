/**
 * Tests for the nightly planner's rollover behavior (Sept 2026 rewrite).
 *
 * Background: the old auto-schedule cron wrote into task_templates /
 * task_instances, which production data showed were EMPTY in every
 * household -- the cron had been doing nothing since it was wired up. The
 * live task list lives in `tasks`, and every pending/in_progress task in
 * production had a due_date in the past (oldest: Feb 2026; none due today
 * or later). rollOverdueTasksToToday() is the replacement: it moves those
 * stuck tasks forward to today's Israel date so they're actually visible
 * again, and does nothing else -- no schedule is invented for `recurring`,
 * because `tasks` carries no cadence to generate one from.
 *
 * Supabase is faked (same approach as
 * src/app/api/agent/task/__tests__/household-token-isolation.test.ts) --
 * an in-memory store behind a minimal `.from("tasks").update().eq().lt()
 * .in().select()` chain that actually applies the filters, so these tests
 * prove the query logic, not just that the function was called.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  rollOverdueTasksToToday,
  runNightlyPlannerForHouseholds,
  getTodayInIsrael,
} from "@/lib/auto-scheduler";

interface FakeTask {
  id: string;
  household_id: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  due_date: string | null;
}

/**
 * Minimal fake of the Supabase query builder, scoped to exactly the calls
 * rollOverdueTasksToToday makes: .from("tasks").update(row).eq(col,val)
 * .lt(col,val).in(col,vals).select("id"). It actually filters and mutates
 * an in-memory store, so a test asserting "N rows moved" or "this row's
 * due_date is now X" is asserting on real filter behavior, not a stub.
 */
function createFakeTasksClient(initialTasks: FakeTask[]) {
  const store = new Map(initialTasks.map((t) => [t.id, { ...t }]));
  const calls: Array<{ table: string; eqs: [string, unknown][]; lt?: [string, unknown]; in?: [string, unknown[]] }> = [];

  function from(table: string) {
    if (table !== "tasks") {
      return {
        select: () => Promise.resolve({ data: [], error: null }),
      } as unknown;
    }

    const state: {
      eqs: [string, unknown][];
      lt?: [string, unknown];
      inFilter?: [string, unknown[]];
      updateRow?: Record<string, unknown>;
    } = { eqs: [] };

    const builder = {
      update(row: Record<string, unknown>) {
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
      in(col: string, vals: unknown[]) {
        state.inFilter = [col, vals];
        return builder;
      },
      select(_cols: string) {
        calls.push({ table, eqs: state.eqs, lt: state.lt, in: state.inFilter });

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
        if (state.inFilter) {
          const [col, vals] = state.inFilter;
          rows = rows.filter((r) => vals.includes((r as Record<string, unknown>)[col]));
        }

        if (state.updateRow) {
          for (const r of rows) {
            store.set(r.id, { ...r, ...state.updateRow });
          }
        }

        return Promise.resolve({
          data: rows.map((r) => ({ id: r.id })),
          error: null,
        });
      },
    };

    return builder;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { from } as any, store, calls };
}

const HOUSEHOLD_A = "11111111-1111-1111-1111-111111111111";
const HOUSEHOLD_B = "22222222-2222-2222-2222-222222222222";
const TODAY = new Date("2026-09-28T00:00:00.000Z");

describe("rollOverdueTasksToToday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves an overdue pending task's due_date to today", async () => {
    const { client, store } = createFakeTasksClient([
      { id: "t1", household_id: HOUSEHOLD_A, status: "pending", due_date: "2026-02-20" },
    ]);

    const result = await rollOverdueTasksToToday(client, HOUSEHOLD_A, TODAY);

    expect(result.rolledOver).toBe(1);
    expect(result.errors).toEqual([]);
    expect(store.get("t1")?.due_date).toBe("2026-09-28");
  });

  it("moves an overdue in_progress task too", async () => {
    const { client, store } = createFakeTasksClient([
      { id: "t1", household_id: HOUSEHOLD_A, status: "in_progress", due_date: "2026-09-02" },
    ]);

    const result = await rollOverdueTasksToToday(client, HOUSEHOLD_A, TODAY);

    expect(result.rolledOver).toBe(1);
    expect(store.get("t1")?.due_date).toBe("2026-09-28");
  });

  it("leaves completed and skipped tasks untouched (control: status filter is real)", async () => {
    const { client, store } = createFakeTasksClient([
      { id: "completed", household_id: HOUSEHOLD_A, status: "completed", due_date: "2026-02-20" },
      { id: "skipped", household_id: HOUSEHOLD_A, status: "skipped", due_date: "2026-02-20" },
    ]);

    const result = await rollOverdueTasksToToday(client, HOUSEHOLD_A, TODAY);

    // Sabotage check: if the .in("status", [...]) filter were dropped or
    // broadened, this would report 2 and both dates would move. It must
    // report 0 and leave both rows exactly as they were.
    expect(result.rolledOver).toBe(0);
    expect(store.get("completed")?.due_date).toBe("2026-02-20");
    expect(store.get("skipped")?.due_date).toBe("2026-02-20");
  });

  it("leaves tasks with no due_date untouched", async () => {
    const { client, store } = createFakeTasksClient([
      { id: "t1", household_id: HOUSEHOLD_A, status: "pending", due_date: null },
    ]);

    const result = await rollOverdueTasksToToday(client, HOUSEHOLD_A, TODAY);

    expect(result.rolledOver).toBe(0);
    expect(store.get("t1")?.due_date).toBeNull();
  });

  it("leaves tasks due today or in the future untouched", async () => {
    const { client, store } = createFakeTasksClient([
      { id: "today", household_id: HOUSEHOLD_A, status: "pending", due_date: "2026-09-28" },
      { id: "future", household_id: HOUSEHOLD_A, status: "pending", due_date: "2026-10-05" },
    ]);

    const result = await rollOverdueTasksToToday(client, HOUSEHOLD_A, TODAY);

    expect(result.rolledOver).toBe(0);
    expect(store.get("today")?.due_date).toBe("2026-09-28");
    expect(store.get("future")?.due_date).toBe("2026-10-05");
  });

  it("only touches the given household (household isolation)", async () => {
    const { client, store } = createFakeTasksClient([
      { id: "mine", household_id: HOUSEHOLD_A, status: "pending", due_date: "2026-02-20" },
      { id: "theirs", household_id: HOUSEHOLD_B, status: "pending", due_date: "2026-02-20" },
    ]);

    const result = await rollOverdueTasksToToday(client, HOUSEHOLD_A, TODAY);

    expect(result.rolledOver).toBe(1);
    expect(store.get("mine")?.due_date).toBe("2026-09-28");
    expect(store.get("theirs")?.due_date).toBe("2026-02-20");
  });

  it("is idempotent: running twice for the same day only moves rows once", async () => {
    const { client, store } = createFakeTasksClient([
      { id: "t1", household_id: HOUSEHOLD_A, status: "pending", due_date: "2026-02-20" },
      { id: "t2", household_id: HOUSEHOLD_A, status: "pending", due_date: "2026-06-01" },
    ]);

    const first = await rollOverdueTasksToToday(client, HOUSEHOLD_A, TODAY);
    expect(first.rolledOver).toBe(2);

    const second = await rollOverdueTasksToToday(client, HOUSEHOLD_A, TODAY);
    expect(second.rolledOver).toBe(0);

    expect(store.get("t1")?.due_date).toBe("2026-09-28");
    expect(store.get("t2")?.due_date).toBe("2026-09-28");
  });

  it("uses Israel's calendar day, not UTC's, at the 22:00 UTC cron trigger time", async () => {
    // The cron fires at 22:00 UTC (vercel.json). On 2026-09-27T22:00:00Z
    // it is already 2026-09-28 01:00 in Israel (UTC+3, DST). A task overdue
    // relative to Israel's "today" (2026-09-28) but not yet overdue by the
    // UTC calendar date must still be rolled forward.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T22:00:00.000Z"));
    const israelToday = getTodayInIsrael();
    expect(israelToday.toISOString().slice(0, 10)).toBe("2026-09-28");

    const { client, store } = createFakeTasksClient([
      { id: "t1", household_id: HOUSEHOLD_A, status: "pending", due_date: "2026-09-27" },
    ]);

    const result = await rollOverdueTasksToToday(client, HOUSEHOLD_A, israelToday);
    expect(result.rolledOver).toBe(1);
    expect(store.get("t1")?.due_date).toBe("2026-09-28");
  });

  it("reports a Supabase error without throwing", async () => {
    const client = {
      from: () => ({
        update: () => ({
          eq: () => ({
            lt: () => ({
              in: () => ({
                select: () =>
                  Promise.resolve({ data: null, error: { message: "connection refused" } }),
              }),
            }),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = await rollOverdueTasksToToday(client, HOUSEHOLD_A, TODAY);
    expect(result.rolledOver).toBe(0);
    expect(result.errors[0]).toMatch(/connection refused/);
  });
});

describe("runNightlyPlannerForHouseholds", () => {
  it("aggregates rolledOver counts across households and reports counts only", async () => {
    const { client } = createFakeTasksClient([
      { id: "a1", household_id: HOUSEHOLD_A, status: "pending", due_date: "2026-02-20" },
      { id: "a2", household_id: HOUSEHOLD_A, status: "pending", due_date: "2026-02-21" },
      { id: "b1", household_id: HOUSEHOLD_B, status: "pending", due_date: "2026-02-20" },
    ]);

    const { summary, results } = await runNightlyPlannerForHouseholds(
      client,
      [HOUSEHOLD_A, HOUSEHOLD_B],
      TODAY
    );

    expect(summary.householdsProcessed).toBe(2);
    expect(summary.tasksRolledOver).toBe(3);
    expect(summary.errors).toEqual([]);
    expect(results).toHaveLength(2);
    // The summary is counts-only -- no household id, task id, or title.
    expect(Object.keys(summary)).toEqual(["householdsProcessed", "tasksRolledOver", "errors"]);
  });

  it("keeps going and collects errors when one household fails", async () => {
    const { client } = createFakeTasksClient([
      { id: "a1", household_id: HOUSEHOLD_A, status: "pending", due_date: "2026-02-20" },
    ]);
    const originalFrom = client.from;
    let calls = 0;
    client.from = (table: string) => {
      calls += 1;
      if (calls === 2) {
        return {
          update: () => ({
            eq: () => ({
              lt: () => ({
                in: () => ({
                  select: () => Promise.resolve({ data: null, error: { message: "boom" } }),
                }),
              }),
            }),
          }),
        };
      }
      return originalFrom(table);
    };

    const { summary } = await runNightlyPlannerForHouseholds(
      client,
      [HOUSEHOLD_A, HOUSEHOLD_B],
      TODAY
    );

    expect(summary.householdsProcessed).toBe(2);
    expect(summary.tasksRolledOver).toBe(1);
    expect(summary.errors).toHaveLength(1);
  });
});
