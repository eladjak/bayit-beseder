/**
 * POST /api/account/delete: only ever the signed-in user, only with the right
 * confirmation. User A can never delete user B.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let sessionUser: { id: string; email: string } | null;
let deleteCalls: string[];
let deleteImpl: (id: string) => Promise<unknown>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: sessionUser } }), signOut: async () => ({}) },
    from: () => {
      const b = { select: () => b, eq: () => b, maybeSingle: async () => ({ data: null }) };
      return b;
    },
  }),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ service: true }) }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ check: async () => ({ success: true, limit: 5, remaining: 4, reset: 1000 }) }),
  getClientIp: () => "1.2.3.4",
}));
vi.mock("@/lib/privacy/delete-account", async (orig) => {
  const real = await orig<typeof import("@/lib/privacy/delete-account")>();
  return {
    ...real,
    deleteAccount: async (_db: unknown, id: string) => {
      deleteCalls.push(id);
      return deleteImpl(id);
    },
  };
});

import { POST } from "../route";
import { DeleteAccountError } from "@/lib/privacy/delete-account";

const call = (body: unknown) =>
  POST(new Request("http://x/api/account/delete", { method: "POST", body: JSON.stringify(body) }) as never);

describe("POST /api/account/delete", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://sb.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-placeholder";
    sessionUser = { id: "user-a", email: "A@Example.com" };
    deleteCalls = [];
    deleteImpl = async () => ({ authUserDeleted: true, household: "none", newOwnerId: null, skipped: [] });
  });

  it("401 without a session, deletes nothing", async () => {
    sessionUser = null;
    expect((await call({ confirmEmail: "a@example.com" })).status).toBe(401);
    expect(deleteCalls).toEqual([]);
  });

  it.each([{}, { confirmEmail: "" }, { confirmEmail: "someone-else@example.com" }, { confirmEmail: 42 }])(
    "400 on a wrong or missing confirmation (%j), deletes nothing",
    async (body) => {
      const res = await call(body);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("confirmation_mismatch");
      expect(deleteCalls).toEqual([]);
    },
  );

  it("deletes the SESSION user even if the body names someone else (A cannot delete B)", async () => {
    const res = await call({ confirmEmail: "a@example.com", userId: "user-b", id: "user-b", user_id: "user-b" });
    expect(res.status).toBe(200);
    expect(deleteCalls).toEqual(["user-a"]);
  });

  it("matches the email case-insensitively and ignores surrounding spaces", async () => {
    expect((await call({ confirmEmail: "  a@EXAMPLE.com " })).status).toBe(200);
  });

  it("409 active_subscription when billing is still active", async () => {
    deleteImpl = async () => {
      throw new DeleteAccountError("active_subscription", "cancel first");
    };
    const res = await call({ confirmEmail: "a@example.com" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("active_subscription");
  });

  it("500 on an unexpected failure, without leaking the internal message", async () => {
    deleteImpl = async () => {
      throw new Error("internal detail xyz");
    };
    const res = await call({ confirmEmail: "a@example.com" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("internal detail xyz");
  });
});
