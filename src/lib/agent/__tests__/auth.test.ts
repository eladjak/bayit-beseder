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

function fakeSupabase(rows: Array<{ household_id: string; token_hash: string; revoked_at: string | null }>) {
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
});
