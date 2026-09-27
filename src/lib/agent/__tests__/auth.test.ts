/**
 * Tests for verifyAgentRequest's household-resolution logic
 * (docs/DESIGN-per-household-agent-tokens.md).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHash } from "node:crypto";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@supabase/supabase-js";
import { verifyAgentRequest } from "../auth";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function fakeSupabase(
  rows: Array<{ household_id: string; token_hash: string; revoked_at: string | null }>,
  options: { errorOnLookup?: string } = {}
) {
  const from = (table: string) => {
    if (table !== "household_agent_tokens") {
      throw new Error(`unexpected table ${table}`);
    }
    const state: { eqs: [string, unknown][] } = { eqs: [] };
    const builder = {
      select() {
        return builder;
      },
      eq(col: string, val: unknown) {
        state.eqs.push([col, val]);
        return builder;
      },
      is() {
        return builder;
      },
      maybeSingle: () => {
        if (options.errorOnLookup) {
          return Promise.resolve({ data: null, error: { message: options.errorOnLookup } });
        }
        const hashEq = state.eqs.find(([c]) => c === "token_hash")?.[1];
        const match = rows.find((r) => r.token_hash === hashEq && r.revoked_at === null);
        return Promise.resolve({
          data: match ? { household_id: match.household_id } : null,
          error: null,
        });
      },
    };
    return builder;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from } as any;
}

function requestWith(authorization?: string) {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  return new Request("https://example.com/api/agent/task", { headers });
}

const ORIGINAL_ENV = { ...process.env };
const HOUSEHOLD_A = "65337bdd-3ade-4c1d-a618-ef316d9d93d2";
const HOUSEHOLD_B = "6bbc6a8b-2e2c-48cd-922a-27330eb42883";
const TOKEN_A_RAW = "bbs_agent_household_a_test_token";

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

describe("verifyAgentRequest", () => {
  it("rejects a request with no Authorization header (401)", async () => {
    vi.mocked(createClient).mockReturnValue(fakeSupabase([]));
    const result = await verifyAgentRequest(requestWith());
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.householdId).toBeNull();
  });

  it("resolves the household for a valid per-household token", async () => {
    vi.mocked(createClient).mockReturnValue(
      fakeSupabase([{ household_id: HOUSEHOLD_A, token_hash: hashToken(TOKEN_A_RAW), revoked_at: null }])
    );
    const result = await verifyAgentRequest(requestWith(`Bearer ${TOKEN_A_RAW}`));
    expect(result.ok).toBe(true);
    expect(result.householdId).toBe(HOUSEHOLD_A);
  });

  it("rejects an unknown token (403), authorizing no household", async () => {
    vi.mocked(createClient).mockReturnValue(fakeSupabase([]));
    const result = await verifyAgentRequest(requestWith("Bearer not-a-real-token"));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.householdId).toBeNull();
  });

  it("rejects a revoked token even though its hash is present", async () => {
    vi.mocked(createClient).mockReturnValue(
      fakeSupabase([
        {
          household_id: HOUSEHOLD_A,
          token_hash: hashToken(TOKEN_A_RAW),
          revoked_at: "2026-09-01T00:00:00.000Z",
        },
      ])
    );
    const result = await verifyAgentRequest(requestWith(`Bearer ${TOKEN_A_RAW}`));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });

  it("household A's token never resolves to household B", async () => {
    vi.mocked(createClient).mockReturnValue(
      fakeSupabase([{ household_id: HOUSEHOLD_A, token_hash: hashToken(TOKEN_A_RAW), revoked_at: null }])
    );
    const result = await verifyAgentRequest(requestWith(`Bearer ${TOKEN_A_RAW}`));
    expect(result.householdId).not.toBe(HOUSEHOLD_B);
  });

  it("legacy BAYIT_AGENT_KEY with no pinned household authenticates but authorizes NO household (fail closed)", async () => {
    process.env.BAYIT_AGENT_KEY = "legacy-shared-key";
    vi.mocked(createClient).mockReturnValue(fakeSupabase([]));
    const result = await verifyAgentRequest(requestWith("Bearer legacy-shared-key"));
    expect(result.ok).toBe(true);
    expect(result.householdId).toBeNull();
  });

  it("legacy BAYIT_AGENT_KEY WITH a pinned household (transition mode) authorizes exactly that household", async () => {
    process.env.BAYIT_AGENT_KEY = "legacy-shared-key";
    process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID = HOUSEHOLD_A;
    vi.mocked(createClient).mockReturnValue(fakeSupabase([]));
    const result = await verifyAgentRequest(requestWith("Bearer legacy-shared-key"));
    expect(result.ok).toBe(true);
    expect(result.householdId).toBe(HOUSEHOLD_A);
  });

  it("a per-household token takes precedence over the legacy key when both are configured", async () => {
    process.env.BAYIT_AGENT_KEY = "legacy-shared-key";
    process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID = HOUSEHOLD_B;
    vi.mocked(createClient).mockReturnValue(
      fakeSupabase([{ household_id: HOUSEHOLD_A, token_hash: hashToken(TOKEN_A_RAW), revoked_at: null }])
    );
    const result = await verifyAgentRequest(requestWith(`Bearer ${TOKEN_A_RAW}`));
    expect(result.householdId).toBe(HOUSEHOLD_A);
  });

  it("returns 503 when neither Supabase env nor a legacy key is configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const result = await verifyAgentRequest(requestWith(`Bearer ${TOKEN_A_RAW}`));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
  });

  // RED-FIRST for fix #5 (adversarial review, PR #13): a DB/network failure
  // during the token lookup must surface as 503 (an outage), NOT 403 (a bad
  // credential) — and it must NOT silently fall through to the legacy-key
  // check either. Against the pre-fix auth.ts (which called the old
  // `string | null`-returning resolveHouseholdForToken and treated any falsy
  // result, including a DB error, as "not this token") this test fails: no
  // legacy key is configured here, so the old code would return the generic
  // 403 "אסימון הרשאה שגוי" instead of surfacing the DB failure.
  it("returns 503 (never 403) when the per-household token lookup itself fails (DB/network error)", async () => {
    vi.mocked(createClient).mockReturnValue(
      fakeSupabase([], { errorOnLookup: "connection reset by peer" })
    );
    const result = await verifyAgentRequest(requestWith(`Bearer ${TOKEN_A_RAW}`));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.householdId).toBeNull();
  });

  // RED-FIRST for the round-2 adversarial review (PR #13): the legacy key
  // comparison must happen BEFORE the DB token lookup, chronologically, so
  // that a pinned legacy key keeps working even if household_agent_tokens
  // does not exist yet (e.g. this code deployed before migration 020 is
  // applied) or the DB is briefly unreachable for any other reason. Against
  // the round-1 fix (which returned 503 unconditionally on ANY DB lookup
  // error, even when the presented value also matched the legacy key), this
  // test fails: it got 503 with householdId null, not 200 with the pinned
  // household.
  it("a DB lookup error falls through to a MATCHING, PINNED legacy key instead of surfacing 503 — the DB being broken/missing must not break the transition-period legacy key", async () => {
    process.env.BAYIT_AGENT_KEY = TOKEN_A_RAW;
    process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID = HOUSEHOLD_A;
    vi.mocked(createClient).mockReturnValue(
      fakeSupabase([], { errorOnLookup: "relation \"household_agent_tokens\" does not exist" })
    );
    const result = await verifyAgentRequest(requestWith(`Bearer ${TOKEN_A_RAW}`));
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.householdId).toBe(HOUSEHOLD_A);
  });

  it("a DB lookup error STILL surfaces as 503 when the presented value does NOT also match the legacy key", async () => {
    process.env.BAYIT_AGENT_KEY = "some-other-legacy-key-entirely";
    process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID = HOUSEHOLD_A;
    vi.mocked(createClient).mockReturnValue(
      fakeSupabase([], { errorOnLookup: "connection reset by peer" })
    );
    const result = await verifyAgentRequest(requestWith(`Bearer ${TOKEN_A_RAW}`));
    // TOKEN_A_RAW does not match "some-other-legacy-key-entirely", so this
    // really is an unrecoverable outage for this credential — 503, not a
    // silent fallback to a key that was never presented.
    expect(result.status).toBe(503);
    expect(result.householdId).toBeNull();
  });

  it("a real per-household token STILL takes priority over a matching legacy key, even though the legacy comparison now runs first", async () => {
    process.env.BAYIT_AGENT_KEY = TOKEN_A_RAW;
    process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID = HOUSEHOLD_B;
    vi.mocked(createClient).mockReturnValue(
      fakeSupabase([{ household_id: HOUSEHOLD_A, token_hash: hashToken(TOKEN_A_RAW), revoked_at: null }])
    );
    const result = await verifyAgentRequest(requestWith(`Bearer ${TOKEN_A_RAW}`));
    // The DB lookup succeeds ("ok"), so it wins over the legacy pin (which
    // would have said HOUSEHOLD_B) even though the legacy comparison is
    // evaluated first in the code.
    expect(result.householdId).toBe(HOUSEHOLD_A);
  });

  it("logs a warning when the legacy key is presented with no household pinned", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.BAYIT_AGENT_KEY = "legacy-shared-key";
    vi.mocked(createClient).mockReturnValue(fakeSupabase([]));

    await verifyAgentRequest(requestWith("Bearer legacy-shared-key"));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/BAYIT_AGENT_KEY_HOUSEHOLD_ID/);
    warnSpy.mockRestore();
  });

  it("does NOT log the warning when the legacy key is pinned to a household", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.BAYIT_AGENT_KEY = "legacy-shared-key";
    process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID = HOUSEHOLD_A;
    vi.mocked(createClient).mockReturnValue(fakeSupabase([]));

    await verifyAgentRequest(requestWith("Bearer legacy-shared-key"));

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
