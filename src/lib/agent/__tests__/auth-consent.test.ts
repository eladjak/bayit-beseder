/**
 * Agent tokens prove WHICH household an assistant may act on. They do not prove
 * the people in it accepted the current policy. verifyAgentRequest (with the real
 * consent helper, only the database faked) must refuse without consent and when
 * the consent check cannot run.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POLICY_VERSION } from "@/lib/privacy/policy";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
import { createClient } from "@supabase/supabase-js";
import { verifyAgentRequest } from "../auth";

const H = "65337bdd-3ade-4c1d-a618-ef316d9d93d2";
const RAW = "bbs_agent_test_token";
const FULL = { policy_version: POLICY_VERSION, age_confirmed: true, privacy_accepted: true, terms_accepted: true };

interface Cfg {
  createdBy: string | null;
  members: string[];
  consentedIds: string[];
  consentThrows?: boolean;
  consentError?: boolean;
}

function fake(cfg: Cfg) {
  return {
    from(table: string) {
      const b: Record<string, unknown> = {
        select: () => b,
        is: () => b,
        in: () => b,
        eq: () =>
          table === "household_members"
            ? Promise.resolve({ data: cfg.members.map((user_id) => ({ user_id })), error: null })
            : b,
        maybeSingle: async () => ({
          data: { id: "t1", household_id: H, label: "x", scopes: ["read"], created_by: cfg.createdBy },
          error: null,
        }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          if (table !== "privacy_consents") return Promise.resolve({ data: [], error: null }).then(res, rej);
          if (cfg.consentThrows) return Promise.reject(new Error("down")).then(res, rej);
          if (cfg.consentError) return Promise.resolve({ data: null, error: { message: "x" } }).then(res, rej);
          return Promise.resolve({ data: cfg.consentedIds.map((user_id) => ({ user_id, ...FULL })), error: null }).then(res, rej);
        },
      };
      return b;
    },
  };
}

const req = () => new Request("https://x.example/api/agent/brief", { headers: { authorization: `Bearer ${RAW}` } });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
  delete process.env.BAYIT_AGENT_KEY;
});

describe("verifyAgentRequest privacy gate", () => {
  it("control: token whose creator consented is served", async () => {
    vi.mocked(createClient).mockReturnValue(fake({ createdBy: "u1", members: ["u1"], consentedIds: ["u1"] }) as never);
    const r = await verifyAgentRequest(req());
    expect(r.ok).toBe(true);
    expect(r.householdId).toBe(H);
  });

  it("token whose creator has NOT consented: 403 consent_required, no household returned", async () => {
    vi.mocked(createClient).mockReturnValue(fake({ createdBy: "u1", members: ["u1", "u2"], consentedIds: ["u2"] }) as never);
    const r = await verifyAgentRequest(req());
    expect(r).toMatchObject({ ok: false, status: 403, error: "consent_required", householdId: null });
  });

  it("token with no known creator: needs at least one consenting member", async () => {
    vi.mocked(createClient).mockReturnValue(fake({ createdBy: null, members: ["u1", "u2"], consentedIds: [] }) as never);
    expect((await verifyAgentRequest(req())).status).toBe(403);
    vi.mocked(createClient).mockReturnValue(fake({ createdBy: null, members: ["u1", "u2"], consentedIds: ["u2"] }) as never);
    expect((await verifyAgentRequest(req())).ok).toBe(true);
  });

  it.each([{ consentThrows: true }, { consentError: true }])("consent lookup fails (%j): refused, not served", async (extra) => {
    vi.mocked(createClient).mockReturnValue(fake({ createdBy: "u1", members: ["u1"], consentedIds: ["u1"], ...extra }) as never);
    const r = await verifyAgentRequest(req());
    expect(r.ok).toBe(false);
    expect(r.householdId).toBeNull();
  });
});
