/**
 * Proves the fix for the gap documented in
 * docs/AGENT-API-MULTI-TENANT-GAP.md and designed in
 * docs/DESIGN-per-household-agent-tokens.md.
 *
 * Before this fix (see the now-superseded
 * `multi-tenant-gap.test.ts` history in git — replaced by this file): any
 * caller holding the ONE global `BAYIT_AGENT_KEY` could act on ANY
 * household by simply naming its id in the request body. These tests prove
 * that is no longer true:
 *
 *  1. A per-household token only ever acts on the household it was issued
 *     for — even when the request body NAMES a different household.
 *  2. A missing or invalid bearer token is rejected outright.
 *  3. `householdId` in the request body is IGNORED for authorization; the
 *     household is always the one resolved from the token.
 *
 * Supabase is faked (no local Supabase/Docker available in this worktree),
 * the same approach as the file this one replaces. The fake backs BOTH
 * tables the real code touches through one shared client: `tasks` (what the
 * route reads/writes) and `household_agent_tokens` (what
 * verifyAgentRequest's own internal client — also created via the mocked
 * `createClient` — looks the presented token up in).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";

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

interface FakeTokenRow {
  household_id: string;
  token_hash: string;
  revoked_at: string | null;
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function createFakeSupabase(tasks: FakeTask[], tokens: FakeTokenRow[] = []) {
  const calls: Array<Record<string, unknown>> = [];
  const store = new Map(tasks.map((t) => [t.id, { ...t }]));

  function from(table: string) {
    const state: {
      op: "select" | "insert" | "update";
      eqs: [string, unknown][];
      isNulls: string[];
      updateRow?: Record<string, unknown>;
    } = { op: "select", eqs: [], isNulls: [] };

    const resolve = (): { data: unknown; error: unknown } => {
      if (table === "household_agent_tokens") {
        const hashEq = state.eqs.find(([c]) => c === "token_hash")?.[1] as string | undefined;
        calls.push({ table, op: "select", eqs: state.eqs });
        const match = tokens.find(
          (t) => t.token_hash === hashEq && t.revoked_at === null
        );
        return { data: match ? { household_id: match.household_id } : null, error: null };
      }

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

          // handleList's fetch: .eq("household_id", householdId) (always present now)
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
      is: (col: string, val: unknown) => typeof builder;
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
      is(col) {
        state.isNulls.push(col);
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
      "x-forwarded-for": `10.2.0.${ipCounter}`,
      ...headers,
    },
  });
}

const ORIGINAL_ENV = { ...process.env };
const HOUSEHOLD_A = "65337bdd-3ade-4c1d-a618-ef316d9d93d2";
const HOUSEHOLD_B = "6bbc6a8b-2e2c-48cd-922a-27330eb42883";
const TOKEN_A_RAW = "bbs_agent_household_a_test_token";
const TOKEN_B_RAW = "bbs_agent_household_b_test_token";

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
  delete process.env.BAYIT_AGENT_KEY;
  delete process.env.AGENT_API_TOKEN;
  delete process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const TOKENS = [
  { household_id: HOUSEHOLD_A, token_hash: hashToken(TOKEN_A_RAW), revoked_at: null },
  { household_id: HOUSEHOLD_B, token_hash: hashToken(TOKEN_B_RAW), revoked_at: null },
];

describe("POST /api/agent/task — per-household token isolation (the fix)", () => {
  it("household A's token CANNOT complete a task in household B, even though the request names household B explicitly", async () => {
    const fake = createFakeSupabase(
      [
        {
          id: "80441b02-db8a-45a6-ac43-e755f08daa4b",
          household_id: HOUSEHOLD_B,
          title: "משימה פרטית של בית B",
          status: "pending",
          due_date: "2026-09-25",
          assigned_to: null,
          points: 0,
          category_id: null,
        },
      ],
      TOKENS
    );
    vi.mocked(createClient).mockReturnValue(fake.client);

    const res = await POST(
      makeRequest(
        { action: "complete", householdId: HOUSEHOLD_B, taskId: "80441b02-db8a-45a6-ac43-e755f08daa4b" },
        { authorization: `Bearer ${TOKEN_A_RAW}` }
      )
    );

    // The task fetch is scoped to household A (from the token), so a task
    // that only exists in household B is simply "not found" — never touched.
    expect(res.status).toBe(404);
    expect(fake.store.get("80441b02-db8a-45a6-ac43-e755f08daa4b")?.status).toBe("pending");
  });

  it("household A's token, with NO householdId in the body at all, can complete its OWN task", async () => {
    const fake = createFakeSupabase(
      [
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
      ],
      TOKENS
    );
    vi.mocked(createClient).mockReturnValue(fake.client);

    const res = await POST(
      makeRequest(
        { action: "complete", taskId: "e350a5e4-cfc7-43e7-a557-35600a51ed31" },
        { authorization: `Bearer ${TOKEN_A_RAW}` }
      )
    );

    expect(res.status).toBe(200);
    expect(fake.store.get("e350a5e4-cfc7-43e7-a557-35600a51ed31")?.status).toBe("completed");
  });

  it("list scopes strictly to the token's household — household B's task never appears, even though B's id and task id are both real and guessable", async () => {
    const fake = createFakeSupabase(
      [
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
      ],
      TOKENS
    );
    vi.mocked(createClient).mockReturnValue(fake.client);

    // Request-supplied householdId (household B!) must be IGNORED — the
    // scope always comes from the token (household A).
    const res = await POST(
      makeRequest(
        { action: "list", householdId: HOUSEHOLD_B },
        { authorization: `Bearer ${TOKEN_A_RAW}` }
      )
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    const ids = (json.tasks as Array<{ id: string }>).map((t) => t.id);
    expect(ids).toContain("e350a5e4-cfc7-43e7-a557-35600a51ed31");
    expect(ids).not.toContain("80441b02-db8a-45a6-ac43-e755f08daa4b");
    expect(json.meta.householdScoped).toBe(true);
  });

  it("rejects a request with no bearer token at all", async () => {
    const fake = createFakeSupabase([], TOKENS);
    vi.mocked(createClient).mockReturnValue(fake.client);

    const res = await POST(makeRequest({ action: "list" }));
    expect(res.status).toBe(401);
  });

  it("rejects an unrecognized bearer token", async () => {
    const fake = createFakeSupabase([], TOKENS);
    vi.mocked(createClient).mockReturnValue(fake.client);

    const res = await POST(
      makeRequest({ action: "list" }, { authorization: "Bearer not-a-real-token" })
    );
    expect(res.status).toBe(403);
  });

  it("rejects a REVOKED token, even though its hash used to be valid", async () => {
    const REVOKED_RAW = "bbs_agent_household_a_revoked_token";
    const fake = createFakeSupabase(
      [],
      [
        ...TOKENS,
        {
          household_id: HOUSEHOLD_A,
          token_hash: hashToken(REVOKED_RAW),
          revoked_at: "2026-09-01T00:00:00.000Z",
        },
      ]
    );
    vi.mocked(createClient).mockReturnValue(fake.client);

    const res = await POST(
      makeRequest({ action: "list" }, { authorization: `Bearer ${REVOKED_RAW}` })
    );
    expect(res.status).toBe(403);
  });
});
