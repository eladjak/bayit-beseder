/**
 * Demonstrates the real gap in POST /api/agent/task, per the 2026-09-25
 * prep-stage task: BAYIT_AGENT_KEY proves "this caller is an authorized
 * agent", not "this caller may act on household X". `householdId` is a
 * plain body field the caller chooses, not something derived from auth.
 *
 * These tests do NOT prove the per-eq filters inside handleList/handleComplete
 * are broken — they are not; `.eq("household_id", ...)` genuinely narrows
 * the query. They prove that a caller who only holds the ONE global key can
 * supply ANY household's id and be honored for it. See
 * docs/AGENT-API-MULTI-TENANT-GAP.md for the write-up and why this is left
 * undone rather than half-fixed in a prep task.
 *
 * Supabase is faked the same way as the WhatsApp webhook tests — no local
 * Supabase/Docker was available in this worktree.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@supabase/supabase-js";
import { POST } from "../route";

interface FakeTask {
  id: string;
  household_id: string;
  title: string;
  status: string;
  due_date: string;
  assigned_to: string | null;
  points: number;
  category_id: string | null;
}

function createFakeSupabase(tasks: FakeTask[]) {
  const calls: Array<Record<string, unknown>> = [];
  const store = new Map(tasks.map((t) => [t.id, { ...t }]));

  function from(table: string) {
    const state: {
      op: "select" | "insert" | "update";
      eqs: [string, unknown][];
      updateRow?: Record<string, unknown>;
    } = { op: "select", eqs: [] };

    const resolve = (): { data: unknown; error: unknown } => {
      if (table === "tasks") {
        if (state.op === "select") {
          const idEq = state.eqs.find(([c]) => c === "id")?.[1] as string | undefined;
          const hidEq = state.eqs.find(([c]) => c === "household_id")?.[1] as
            | string
            | undefined;
          calls.push({ table, op: "select", eqs: state.eqs });

          if (idEq) {
            // handleComplete's fetch: .eq("id", taskId).eq("household_id", householdId).single()
            const t = store.get(idEq);
            if (t && (!hidEq || t.household_id === hidEq)) {
              return { data: t, error: null };
            }
            return { data: null, error: { message: "not found" } };
          }

          // handleList's fetch: optionally .eq("household_id", householdId)
          let all = Array.from(store.values());
          if (hidEq) all = all.filter((t) => t.household_id === hidEq);
          return { data: all, error: null };
        }
        if (state.op === "update") {
          const idEq = state.eqs.find(([c]) => c === "id")?.[1] as string;
          calls.push({ table, op: "update", row: state.updateRow, eqs: state.eqs });
          const existing = store.get(idEq);
          if (existing) store.set(idEq, { ...existing, ...(state.updateRow as object) });
          return { data: null, error: null };
        }
      }
      if (table === "task_completions" || table === "household_members" || table === "profiles") {
        // Not exercised meaningfully by these two tests (fixture tasks use
        // points: 0 and a pre-assigned completor so these branches are
        // best-effort no-ops) — return an inert result either way.
        calls.push({ table, op: state.op });
        return { data: null, error: null };
      }
      return { data: null, error: { message: `fake supabase: unhandled table "${table}"` } };
    };

    const builder: {
      select: (cols: string) => typeof builder;
      insert: (row: Record<string, unknown>) => typeof builder;
      update: (row: Record<string, unknown>) => typeof builder;
      eq: (col: string, val: unknown) => typeof builder;
      in: (col: string, vals: unknown[]) => typeof builder;
      order: () => typeof builder;
      limit: () => typeof builder;
      single: () => Promise<{ data: unknown; error: unknown }>;
      maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      then: <T>(onFulfilled: (value: { data: unknown; error: unknown }) => T) => Promise<T>;
    } = {
      select() {
        state.op = "select";
        return builder;
      },
      insert() {
        state.op = "insert";
        return builder;
      },
      update(row) {
        state.op = "update";
        state.updateRow = row;
        return builder;
      },
      eq(col, val) {
        state.eqs.push([col, val]);
        return builder;
      },
      in() {
        return builder;
      },
      order() {
        return builder;
      },
      limit() {
        return builder;
      },
      single: () => Promise.resolve(resolve()),
      maybeSingle: () => Promise.resolve(resolve()),
      then: (onFulfilled) => Promise.resolve(resolve()).then(onFulfilled),
    };

    return builder;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { from } as any, calls, store };
}

let ipCounter = 0;
function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  ipCounter += 1;
  return new NextRequest("https://example.com/api/agent/task", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `10.1.0.${ipCounter}`,
      authorization: "Bearer test-agent-key",
      ...headers,
    },
  });
}

const ORIGINAL_ENV = { ...process.env };
const HOUSEHOLD_A = "65337bdd-3ade-4c1d-a618-ef316d9d93d2";
const HOUSEHOLD_B = "6bbc6a8b-2e2c-48cd-922a-27330eb42883";

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
  process.env.BAYIT_AGENT_KEY = "test-agent-key";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("POST /api/agent/task — the multi-tenant gap (documented, not fixed here)", () => {
  it("a holder of the ONE global agent key can complete a task in a household they were never granted for that request beyond naming its id", async () => {
    const fake = createFakeSupabase([
      {
        id: "80441b02-db8a-45a6-ac43-e755f08daa4b",
        household_id: HOUSEHOLD_B,
        title: "משימה פרטית של בית B",
        status: "pending",
        due_date: "2026-09-25",
        assigned_to: "c3438dfa-f34c-4dca-9111-8ff8f7c1675a",
        points: 0,
        category_id: null,
      },
    ]);
    vi.mocked(createClient).mockReturnValue(fake.client);

    // The caller presents ONLY the global BAYIT_AGENT_KEY — nothing ties
    // them to household B specifically. They just have to know/guess its
    // UUID and a task id inside it (both of which this endpoint's OWN
    // `list` action, called without householdId, can hand them — see the
    // next test).
    const res = await POST(
      makeRequest({ action: "complete", householdId: HOUSEHOLD_B, taskId: "80441b02-db8a-45a6-ac43-e755f08daa4b" })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe("complete");
    expect(json.taskId).toBe("80441b02-db8a-45a6-ac43-e755f08daa4b");

    // The task really did flip to completed — this is a live write, not a
    // permission that merely LOOKED like it would have been granted.
    expect(fake.store.get("80441b02-db8a-45a6-ac43-e755f08daa4b")?.status).toBe("completed");
  });

  it("list without a householdId returns tasks from EVERY household to any global-key holder — including how an attacker would first learn a target household's id and task ids", async () => {
    const fake = createFakeSupabase([
      {
        id: "e350a5e4-cfc7-43e7-a557-35600a51ed31",
        household_id: HOUSEHOLD_A,
        title: "משימה של בית A",
        status: "pending",
        due_date: "2026-09-25",
        assigned_to: null,
        points: 5,
        category_id: null,
      },
      {
        id: "80441b02-db8a-45a6-ac43-e755f08daa4b",
        household_id: HOUSEHOLD_B,
        title: "משימה פרטית של בית B",
        status: "pending",
        due_date: "2026-09-25",
        assigned_to: null,
        points: 5,
        category_id: null,
      },
    ]);
    vi.mocked(createClient).mockReturnValue(fake.client);

    // No householdId at all — the schema allows it (optional), and nothing
    // else scopes the query.
    const res = await POST(makeRequest({ action: "list" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta.householdScoped).toBe(false);

    const ids = (json.tasks as Array<{ id: string }>).map((t) => t.id);
    // Both households' tasks came back to a caller who never named a
    // household at all — this is the id/reconnaissance step that feeds the
    // cross-household completion in the previous test.
    expect(ids).toContain("e350a5e4-cfc7-43e7-a557-35600a51ed31");
    expect(ids).toContain("80441b02-db8a-45a6-ac43-e755f08daa4b");
  });
});
