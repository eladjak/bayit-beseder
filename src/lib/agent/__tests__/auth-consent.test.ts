/**
 * Agent tokens prove WHICH household an assistant may act on. They do not prove the people in it
 * accepted the current policy. verifyAgentRequest (with the real consent helper, only the database
 * faked) serves a household only when EVERY current member has current consent, for new tokens,
 * old tokens (no creator) and the legacy key alike, and refuses when the check cannot run.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POLICY_VERSION } from "@/lib/privacy/policy";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
import { createClient } from "@supabase/supabase-js";
import { verifyAgentRequest } from "../auth";

const H = "65337bdd-3ade-4c1d-a618-ef316d9d93d2";
const RAW = `t${Math.random().toString(36).slice(2)}`; // generated at run time: no key-shaped literal is committed
const FULL = { policy_version: POLICY_VERSION, age_confirmed: true, privacy_accepted: true, terms_accepted: true };

interface Cfg {
  createdBy: string | null;
  members: string[];
  consentedIds: string[];
  oldVersionIds?: string[];
  consentThrows?: boolean;
  consentError?: boolean;
}

function fake(cfg: Cfg) {
  return {
    from(table: string) {
      let only: unknown[] | null = null;
      const b: Record<string, unknown> = {
        select: () => b,
        is: () => b,
        not: () => b,
        eq: () => b,
        in: (_c: string, vs: unknown[]) => ((only = vs), b),
        maybeSingle: async () => ({
          data: { id: "t1", household_id: H, label: "x", scopes: ["read"], created_by: cfg.createdBy },
          error: null,
        }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          if (table === "household_members") {
            return Promise.resolve({ data: cfg.members.map((user_id) => ({ household_id: H, user_id })), error: null }).then(res, rej);
          }
          if (table === "profiles") return Promise.resolve({ data: [], error: null }).then(res, rej);
          if (table !== "privacy_consents") return Promise.resolve({ data: [], error: null }).then(res, rej);
          if (cfg.consentThrows) return Promise.reject(new Error("down")).then(res, rej);
          if (cfg.consentError) return Promise.resolve({ data: null, error: { message: "x" } }).then(res, rej);
          const rows = [
            ...cfg.consentedIds.map((user_id) => ({ user_id, ...FULL })),
            ...(cfg.oldVersionIds ?? []).map((user_id) => ({ user_id, ...FULL, policy_version: "old" })),
          ].filter((r) => (only ? only.includes(r.user_id) : true));
          return Promise.resolve({ data: rows, error: null }).then(res, rej);
        },
      };
      return b;
    },
  };
}

const req = () => new Request("https://x.example/api/agent/brief", { headers: { authorization: `Bearer ${RAW}` } });
const use = (cfg: Cfg) => vi.mocked(createClient).mockReturnValue(fake(cfg) as never);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = `t${Math.random().toString(36).slice(2)}`;
  delete process.env.BAYIT_AGENT_KEY;
});

describe("verifyAgentRequest privacy gate: every current member must have consented", () => {
  it("control: all members consented -> served", async () => {
    use({ createdBy: "u1", members: ["u1", "u2"], consentedIds: ["u1", "u2"] });
    const r = await verifyAgentRequest(req());
    expect(r.ok).toBe(true);
    expect(r.householdId).toBe(H);
  });

  it("the token creator consented but ANOTHER member did not: refused with a message the agent can pass on (red under the old creator-only rule)", async () => {
    use({ createdBy: "u1", members: ["u1", "u2"], consentedIds: ["u1"] });
    const r = await verifyAgentRequest(req());
    expect(r).toMatchObject({ ok: false, status: 403, householdId: null });
    expect(r.error).toContain("consent_required");
    expect(r.error).toContain("every member");
  });

  it("an OLD token (no creator) follows the same rule: one consenting member is not enough", async () => {
    use({ createdBy: null, members: ["u1", "u2"], consentedIds: ["u2"] });
    expect((await verifyAgentRequest(req())).status).toBe(403);
    use({ createdBy: null, members: ["u1", "u2"], consentedIds: ["u1", "u2"] });
    expect((await verifyAgentRequest(req())).ok).toBe(true);
  });

  it("a member who consented to an OLD policy version does not count; a member who joins later closes it again", async () => {
    use({ createdBy: "u1", members: ["u1", "u2"], consentedIds: ["u1"], oldVersionIds: ["u2"] });
    expect((await verifyAgentRequest(req())).status).toBe(403);
    use({ createdBy: "u1", members: ["u1", "u2", "u3"], consentedIds: ["u1", "u2"] });
    expect((await verifyAgentRequest(req())).status).toBe(403);
  });

  it("a household with no members is not served", async () => {
    use({ createdBy: "u1", members: [], consentedIds: ["u1"] });
    expect((await verifyAgentRequest(req())).ok).toBe(false);
  });

  it.each([{ consentThrows: true }, { consentError: true }])("consent lookup fails (%j): refused, not served", async (extra) => {
    use({ createdBy: "u1", members: ["u1"], consentedIds: ["u1"], ...extra });
    const r = await verifyAgentRequest(req());
    expect(r.ok).toBe(false);
    expect(r.householdId).toBeNull();
  });
});
