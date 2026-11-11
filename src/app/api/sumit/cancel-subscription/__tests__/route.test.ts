/**
 * The privacy gate screen learns "is there a billing subscription to cancel" from this route, and
 * cancels through it, for a person who has NOT consented (so the database closes this app's tables
 * to their browser session). Therefore: every lookup uses the service client, never the session
 * client; GET returns a boolean and nothing else; and only the caller's own households count.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

interface Tables {
  household_members: { household_id: string; user_id: string; role: string }[];
  subscriptions: { id: string; household_id: string; tier: string; status: string; user_id?: string; sumit_payment_method_id?: string | null }[];
}
let tables: Tables;
let sessionUser: { id: string } | null;
const updates: { id: string; patch: Record<string, unknown> }[] = [];
let sessionTouchedTables: string[];

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: sessionUser } }) },
    // The session client is RLS-bound: after migration 028 it reads nothing for an unconsented user.
    // Using it here would make the cancel option silently disappear, so any use is recorded.
    from: (t: string) => {
      sessionTouchedTables.push(t);
      throw new Error("the session client must not be used for household data in this route");
    },
  }),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ check: async () => ({ success: true, limit: 10, remaining: 9, reset: 1000 }) }),
  getClientIp: () => "1.2.3.4",
}));
vi.mock("@/lib/sumit-client-inline", () => ({ createSumitClient: () => ({ paymentMethods: { remove: async () => ({}) } }) }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from(table: keyof Tables) {
      let rows: Record<string, unknown>[] = (tables[table] as unknown as Record<string, unknown>[]).slice();
      let patch: Record<string, unknown> | null = null;
      const b = {
        select: () => b,
        update: (p: Record<string, unknown>) => ((patch = p), b),
        eq: (c: string, v: unknown) => ((rows = rows.filter((r) => r[c] === v)), b),
        neq: (c: string, v: unknown) => ((rows = rows.filter((r) => r[c] !== v)), b),
        in: (c: string, vs: unknown[]) => ((rows = rows.filter((r) => vs.includes(r[c]))), b),
        limit: () => b,
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          if (patch) for (const r of rows) updates.push({ id: r.id as string, patch });
          return Promise.resolve({ data: rows, error: null }).then(res, rej);
        },
      };
      return b;
    },
  }),
}));

import { GET, POST } from "../route";

const post = (body: unknown) => new Request("http://x.example/api/sumit/cancel-subscription", { method: "POST", body: JSON.stringify(body) }) as never;
const get = () => new Request("http://x.example/api/sumit/cancel-subscription") as never;

beforeEach(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = `t${Math.random().toString(36).slice(2)}`;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://sb.test";
  sessionUser = { id: "me" };
  updates.length = 0;
  sessionTouchedTables = [];
  tables = {
    household_members: [
      { household_id: "h-mine", user_id: "me", role: "owner" },
      { household_id: "h-other", user_id: "someone", role: "owner" },
      { household_id: "h-member", user_id: "me", role: "member" },
    ],
    subscriptions: [
      { id: "s-mine", household_id: "h-mine", tier: "plus", status: "active" },
      { id: "s-other", household_id: "h-other", tier: "plus", status: "active" },
      { id: "s-member", household_id: "h-member", tier: "plus", status: "active" },
    ],
  };
});

describe("GET /api/sumit/cancel-subscription (for the gate screen)", () => {
  it("returns a boolean and NOTHING else, true for an owner with an active paid plan", async () => {
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cancellable: true });
  });

  it("never touches the session client's tables (red under the old route, which read household_members through the session)", async () => {
    await GET(get());
    expect(sessionTouchedTables).toEqual([]);
  });

  it("false when the only plan is free, cancelled, someone else's, or one where the caller is only a member", async () => {
    tables.subscriptions = [
      { id: "a", household_id: "h-mine", tier: "free", status: "active" },
      { id: "b", household_id: "h-other", tier: "plus", status: "active" },
      { id: "c", household_id: "h-member", tier: "plus", status: "active" },
    ];
    expect(await (await GET(get())).json()).toEqual({ cancellable: false });
    tables.subscriptions = [{ id: "d", household_id: "h-mine", tier: "plus", status: "canceled" }];
    expect(await (await GET(get())).json()).toEqual({ cancellable: false });
  });

  it("lets a non-owner payer find and cancel their own plan", async () => {
    tables.subscriptions = [{ id: "payer", household_id: "h-member", user_id: "me", tier: "plus", status: "active" }];
    expect(await (await GET(get())).json()).toEqual({ cancellable: true });
    expect((await POST(post({}))).status).toBe(200);
    expect(updates).toEqual([{ id: "payer", patch: expect.objectContaining({ status: "canceled" }) }]);
  });

  it("offers cancellation for a past-due paid plan", async () => {
    tables.subscriptions = [{ id: "late", household_id: "h-mine", tier: "plus", status: "past_due" }];
    expect(await (await GET(get())).json()).toEqual({ cancellable: true });
    expect((await POST(post({}))).status).toBe(200);
  });

  it("401 without a session", async () => {
    sessionUser = null;
    expect((await GET(get())).status).toBe(401);
  });
});

describe("POST /api/sumit/cancel-subscription", () => {
  it("cancels the caller's own plan with no body (the gate does not know the household id)", async () => {
    const res = await POST(post({}));
    expect(res.status).toBe(200);
    expect(updates).toEqual([{ id: "s-mine", patch: expect.objectContaining({ status: "canceled" }) }]);
    expect(sessionTouchedTables).toEqual([]);
  });

  it("refuses a household the caller does not own (negative control: nothing is updated)", async () => {
    for (const id of ["h-other", "h-member"]) {
      const res = await POST(post({ householdId: id }));
      expect(res.status).toBe(403);
    }
    expect(updates).toEqual([]);
  });

  it("a free row is never 'cancelled'", async () => {
    tables.subscriptions = [{ id: "a", household_id: "h-mine", tier: "free", status: "active" }];
    expect((await POST(post({}))).status).toBe(404);
    expect(updates).toEqual([]);
  });

  it("401 without a session", async () => {
    sessionUser = null;
    expect((await POST(post({}))).status).toBe(401);
  });
});
