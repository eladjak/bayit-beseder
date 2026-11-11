/**
 * /api/privacy/consent: auth, validation, and that the record is always for the
 * SESSION user and the CURRENT version, whatever the body says.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POLICY_VERSION } from "@/lib/privacy/policy";

let user: { id: string } | null;
let upserts: { row: Record<string, unknown>; opts: unknown }[];
let upsertError: { message: string } | null;
let existing: Record<string, unknown> | null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    from(table: string) {
      if (table !== "privacy_consents") throw new Error(`unexpected ${table}`);
      const b = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data: existing, error: null }),
        upsert: async (row: Record<string, unknown>, opts: unknown) => {
          upserts.push({ row, opts });
          return { error: upsertError };
        },
      };
      return b;
    },
  }),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ check: async () => ({ success: true, limit: 20, remaining: 19, reset: 1000 }) }),
  getClientIp: () => "1.2.3.4",
}));

import { GET, POST } from "../route";

const ok = { ageConfirmed: true, privacyAccepted: true, termsAccepted: true };
const post = (body: unknown) =>
  POST(new Request("http://x/api/privacy/consent", { method: "POST", body: JSON.stringify(body) }) as never);

describe("/api/privacy/consent", () => {
  beforeEach(() => {
    user = { id: "user-a" };
    upserts = [];
    upsertError = null;
    existing = null;
  });

  it("401 without a session, nothing written", async () => {
    user = null;
    expect((await post(ok)).status).toBe(401);
    expect((await GET()).status).toBe(401);
    expect(upserts).toHaveLength(0);
  });

  it.each(["ageConfirmed", "privacyAccepted", "termsAccepted"])("400 when %s is not true", async (k) => {
    const res = await post({ ...ok, [k]: false });
    expect(res.status).toBe(400);
    expect((await res.json()).missing[k]).toBe(true);
    expect(upserts).toHaveLength(0);
  });

  it("400 when a flag is the string 'true' (must be the boolean)", async () => {
    expect((await post({ ...ok, ageConfirmed: "true" })).status).toBe(400);
    expect(upserts).toHaveLength(0);
  });

  it("records for the session user and the current version, ignoring a user id or version in the body", async () => {
    const res = await post({ ...ok, userId: "victim", user_id: "victim", policy_version: "1999", locale: "en", source: "invite" });
    expect(res.status).toBe(200);
    expect(upserts).toHaveLength(1);
    expect(upserts[0].row).toMatchObject({
      user_id: "user-a",
      policy_version: POLICY_VERSION,
      age_confirmed: true,
      privacy_accepted: true,
      terms_accepted: true,
      locale: "en",
      source: "invite",
    });
    expect(JSON.stringify(upserts[0].row)).not.toContain("victim");
  });

  it("falls back to safe values for an unknown locale or source", async () => {
    await post({ ...ok, locale: "xx", source: "<script>" });
    expect(upserts[0].row).toMatchObject({ locale: "he", source: "gate" });
  });

  it("500 when the save fails (never reports success)", async () => {
    upsertError = { message: "db down" };
    expect((await post(ok)).status).toBe(500);
  });

  it("GET reports whether the current version is accepted", async () => {
    expect(await (await GET()).json()).toEqual({ accepted: false, version: POLICY_VERSION });
    existing = { policy_version: POLICY_VERSION, age_confirmed: true, privacy_accepted: true, terms_accepted: true };
    expect(await (await GET()).json()).toEqual({ accepted: true, version: POLICY_VERSION });
  });
});
