/**
 * RED-FIRST for the round-2 adversarial review defect (PR #13): this route
 * used to call `verifyAgentRequest` (which queries `household_agent_tokens`)
 * with no rate limiting at all — every other /api/agent/* route rate-limits
 * per IP before touching the DB; this one did not touch the DB at all before
 * this PR's own auth rewrite made it start doing so, and nobody added the
 * limiter when that happened.
 *
 * This test proves TWO things, and the second is the one that actually
 * matters for the defect: not just "there is a limiter", but that it runs
 * BEFORE the token lookup — a request that gets rejected by the rate limiter
 * must never reach the database at all.
 *
 * Against the pre-fix route.ts (no limiter), this test fails at the 21st
 * call: it expects 429 and gets 403 instead (every request reaches the DB
 * lookup, none are ever rate-limited), and the DB call count keeps climbing
 * past the window instead of freezing at the limit.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let dbCallCount = 0;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: (table: string) => {
      if (table !== "household_agent_tokens") {
        throw new Error(`unexpected table ${table}`);
      }
      dbCallCount += 1;
      const builder = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      };
      return builder;
    },
  })),
}));

const ORIGINAL_ENV = { ...process.env };
const SAME_IP = "203.0.113.42"; // RFC 5737 test-net address, kept identical
// across every call in this file so they all share one rate-limit bucket.

function makeRequest(token = "some-invalid-token") {
  return new Request("http://x/api/agent/capabilities", {
    headers: {
      authorization: `Bearer ${token}`,
      "x-forwarded-for": SAME_IP,
    },
  });
}

beforeEach(() => {
  dbCallCount = 0;
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
  delete process.env.BAYIT_AGENT_KEY;
  delete process.env.AGENT_API_TOKEN;
  delete process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("GET /api/agent/capabilities — rate limit runs BEFORE the token lookup", () => {
  it("rate-limits the (max+1)th request from the same IP with 429, WITHOUT ever querying the token table for that request", async () => {
    const { GET } = await import("../route");

    // The route's own limiter is `rateLimit({ windowMs: 60_000, max: 20 })`.
    // Exhaust it exactly, then make one more call.
    const MAX = 20;
    const statuses: number[] = [];
    for (let i = 0; i < MAX; i++) {
      const res = await GET(makeRequest(`invalid-token-${i}`));
      statuses.push(res.status);
    }

    // Every one of the first MAX requests should have actually reached the
    // DB lookup (they're all "bad token", so 403 — the point isn't the
    // status, it's that the lookup ran).
    expect(dbCallCount).toBe(MAX);
    expect(statuses.every((s) => s === 403)).toBe(true);

    const dbCallsBeforeOverLimit = dbCallCount;
    const overLimitRes = await GET(makeRequest("invalid-token-over-limit"));

    expect(overLimitRes.status).toBe(429);
    // The critical assertion: the DB was NOT queried for the rate-limited
    // request. If the route checked auth before the rate limiter (the
    // pre-fix bug), dbCallCount would be dbCallsBeforeOverLimit + 1 here.
    expect(dbCallCount).toBe(dbCallsBeforeOverLimit);
  });

  it("still returns a Retry-After header on the 429, like every other agent route", async () => {
    const { GET } = await import("../route");
    for (let i = 0; i < 20; i++) {
      await GET(makeRequest(`invalid-token-${i}`));
    }
    const res = await GET(makeRequest("invalid-token-over-limit"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).not.toBeNull();
  });
});
