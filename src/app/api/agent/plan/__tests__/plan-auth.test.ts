/**
 * RED-FIRST for fix #6 (adversarial review, PR #13): every other
 * /api/agent/* route already returns 403 when the bearer token authorizes
 * NO household (e.g. an unpinned legacy BAYIT_AGENT_KEY) — /api/agent/plan
 * was the one inconsistency, since it treated a `null` household as "no
 * context" and generated (and could `deliver: "whatsapp"`) a plan anyway.
 *
 * Against the pre-fix plan/route.ts, the first test below fails: it expects
 * 403 and gets 200 (a plan is generated), and `generateWeekPlan`/
 * `maybeDeliverToOwner` both actually ran.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@supabase/supabase-js";
import { POST } from "../route";

/**
 * A fake Supabase client shared by BOTH verifyAgentRequest's own internal
 * client (the token lookup) and plan/route.ts's own client (existing
 * tasks/profiles, once a household is authorized) — the same `createClient`
 * mock backs both call sites. `household_agent_tokens` always resolves "not
 * found" (this test exercises the legacy-key path, not a real token); every
 * other table returns an empty result set, which is all plan/route.ts needs
 * to still successfully generate a (contextless) plan.
 */
function fakeClient() {
  const from = (table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      neq: () => builder,
      is: () => builder,
      maybeSingle: () =>
        table === "household_agent_tokens"
          ? Promise.resolve({ data: null, error: null })
          : Promise.resolve({ data: null, error: null }),
      then: (onFulfilled: (v: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled),
    };
    return builder;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from } as any;
}

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://example.com/api/agent/plan", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  });
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
  process.env.BAYIT_AGENT_KEY = "legacy-shared-key";
  delete process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID;
  vi.mocked(createClient).mockReturnValue(fakeClient());
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("POST /api/agent/plan — refuses an unpinned legacy key", () => {
  it("returns 403 (never generates or delivers a plan) when the legacy key has no household pinned", async () => {
    const res = await POST(
      makeRequest({}, { authorization: "Bearer legacy-shared-key" })
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.plan).toBeUndefined();
    expect(json.whatsappText).toBeUndefined();
  });

  it("succeeds once the legacy key IS pinned to a household", async () => {
    process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID = "65337bdd-3ade-4c1d-a618-ef316d9d93d2";
    const res = await POST(
      makeRequest({}, { authorization: "Bearer legacy-shared-key" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.plan).toBeDefined();
    expect(typeof json.whatsappText).toBe("string");
  });

  it("still 401s with no bearer token at all", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });
});
