/**
 * Tests for POST /api/sumit/checkout.
 *
 * Modeled on the webhook route tests — Supabase is faked with a small
 * in-memory query-builder, no real DB/Docker needed.
 *
 * Focus of this file: the 2026-09-28 adversarial-review addition — a
 * server-side guard against starting a SECOND real Sumit checkout for a
 * household that already has an active Plus subscription (a stale tab, a
 * double click, or a direct POST could otherwise cause a genuine duplicate
 * charge; the webhook would just extend the existing row's period again,
 * so Sumit still took the money twice for no extra benefit to the user).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const AUTH_USER = { id: "user-1", email: "a@b.com", user_metadata: {} };

interface FakeConfig {
  membership?: { household_id: string } | null;
  activeSub?: { tier: string } | null;
  subLookupError?: { message: string } | null;
}

let cfg: FakeConfig;
let beginRedirectCalls = 0;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: AUTH_USER } }) },
    from(table: string) {
      const state: { eqs: [string, unknown][] } = { eqs: [] };
      const builder = {
        select() {
          return builder;
        },
        eq(col: string, val: unknown) {
          state.eqs.push([col, val]);
          return builder;
        },
        async maybeSingle() {
          if (table === "household_members") {
            return { data: cfg.membership ?? null, error: null };
          }
          if (table === "subscriptions") {
            if (cfg.subLookupError) return { data: null, error: cfg.subLookupError };
            return { data: cfg.activeSub ?? null, error: null };
          }
          return { data: null, error: { message: `fake supabase: unhandled table "${table}"` } };
        },
      };
      return builder;
    },
  }),
}));

vi.mock("@/lib/sumit-client-inline", () => ({
  createSumitClient: () => ({
    payments: {
      beginRedirect: async () => {
        beginRedirectCalls++;
        return { RedirectURL: "https://pay.sumit.co.il/x", PaymentID: "PAY-1" };
      },
    },
  }),
}));

function makeRequest(body: unknown) {
  return new Request("http://x/api/sumit/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  }) as never;
}

describe("POST /api/sumit/checkout", () => {
  beforeEach(() => {
    cfg = { membership: { household_id: "house-1" }, activeSub: null };
    beginRedirectCalls = 0;
    process.env.SUMIT_COMPANY_ID = "co-1";
    process.env.SUMIT_API_KEY = "key-1";
  });

  it(
    "starts a real checkout for a household with no active subscription",
    async () => {
      const { POST } = await import("../route");
      const res = await POST(makeRequest({ householdId: "house-1" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.checkoutUrl).toBe("https://pay.sumit.co.il/x");
      expect(beginRedirectCalls).toBe(1);
    },
    // First test in the file pays the cold `next/server` + jsdom environment
    // setup cost (seen elsewhere in this repo too, e.g.
    // src/app/api/agent/__tests__/prep.test.ts's first test) — bump past the
    // 5s default so that one-time cost doesn't flake this test specifically.
    15_000,
  );

  it("starts a real checkout for a household whose only row is 'free'", async () => {
    cfg.activeSub = { tier: "free" };
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ householdId: "house-1" }));
    expect(res.status).toBe(200);
    expect(beginRedirectCalls).toBe(1);
  });

  it("refuses to start a second real charge when the household already has an active Plus subscription", async () => {
    cfg.activeSub = { tier: "plus" };
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ householdId: "house-1" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("already_plus");
    expect(beginRedirectCalls).toBe(0);
  });

  it("returns 500 (not a silent pass-through to Sumit) when the subscription lookup itself errors", async () => {
    cfg.subLookupError = { message: "db down" };
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ householdId: "house-1" }));
    expect(res.status).toBe(500);
    expect(beginRedirectCalls).toBe(0);
  });

  it("still rejects a caller who isn't a member of the household, before ever checking subscription status", async () => {
    cfg.membership = null;
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ householdId: "house-1" }));
    expect(res.status).toBe(403);
    expect(beginRedirectCalls).toBe(0);
  });
});
