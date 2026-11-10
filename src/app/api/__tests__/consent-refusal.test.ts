/**
 * Server routes that handle household data refuse a signed-in user who has
 * not accepted the CURRENT policy, and let them through once they have.
 * (Each "refuses" case has a "lets through" twin: a guard that only ever
 * refuses would pass the first half and break the app.)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POLICY_VERSION } from "@/lib/privacy/policy";
import { makeSupabaseMock } from "@/lib/meals/__tests__/supabaseMock";

let consentRow: Record<string, unknown> | null;

const FULL = {
  policy_version: POLICY_VERSION,
  age_confirmed: true,
  privacy_accepted: true,
  terms_accepted: true,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user-a" } }, error: null }) },
    from(table: string) {
      const b = {
        select: () => b,
        eq: () => b,
        order: () => b,
        limit: () => b,
        lt: () => b,
        maybeSingle: async () => ({ data: table === "privacy_consents" ? consentRow : null, error: null }),
        single: async () => ({ data: null, error: { message: "not found" } }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
      };
      return b;
    },
  }),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ check: async () => ({ success: true, limit: 99, remaining: 98, reset: 1000 }) }),
  getClientIp: () => "1.2.3.4",
}));

const post = (url: string, body: unknown) =>
  new Request(url, { method: "POST", body: JSON.stringify(body) }) as never;

describe("consent refusal on household routes", () => {
  beforeEach(() => {
    consentRow = null;
  });

  it("POST /api/invite/join: 403 consent_required without consent", async () => {
    const { POST } = await import("../invite/join/route");
    const res = await POST(post("http://x/api/invite/join", { code: "ABC123" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("consent_required");
  });

  it("POST /api/invite/join: passes the guard once consent exists", async () => {
    consentRow = FULL;
    const { POST } = await import("../invite/join/route");
    const res = await POST(post("http://x/api/invite/join", {}));
    // Past the guard it reaches the body validation, which is the next check.
    expect(res.status).toBe(400);
  });

  it("GET /api/love-tokens/sent: 403 without consent, not 403 with it", async () => {
    const { GET } = await import("../love-tokens/sent/route");
    const req = () => new Request("http://x/api/love-tokens/sent") as never;
    expect((await GET(req())).status).toBe(403);
    consentRow = FULL;
    expect((await GET(req())).status).not.toBe(403);
  });

  it("meals / prices / first-week session helper: 403 without consent, ok with it", async () => {
    const { resolveHousehold } = await import("@/lib/meals/session");
    const none = makeSupabaseMock({ privacy_consents: [], profiles: [{ household_id: "h1" }] });
    expect(await resolveHousehold(none as never)).toMatchObject({ ok: false, status: 403, error: "consent_required" });

    const yes = makeSupabaseMock({ profiles: [{ household_id: "h1" }] }); // default: consented
    expect(await resolveHousehold(yes as never)).toMatchObject({ ok: true, householdId: "h1" });
  });

  it("an OLD policy version does not count (bumping the version re-prompts)", async () => {
    consentRow = { ...FULL, policy_version: "2020-01-01" };
    const { POST } = await import("../invite/join/route");
    expect((await POST(post("http://x/api/invite/join", { code: "X" }))).status).toBe(403);
  });
});
