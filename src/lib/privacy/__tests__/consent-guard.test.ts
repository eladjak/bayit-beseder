/**
 * The privacy gate's server rules: what counts as "consented", and that the
 * guard FAILS CLOSED (a broken check is a refusal, never a pass).
 */
import { describe, it, expect } from "vitest";
import { POLICY_VERSION, isConsentCurrent } from "../policy";
import { hasCurrentConsent, requireConsent } from "../consent-server";

const FULL = {
  policy_version: POLICY_VERSION,
  age_confirmed: true,
  privacy_accepted: true,
  terms_accepted: true,
};

/** A fake client whose privacy_consents query returns exactly what the test says. */
function fakeClient(result: { data: unknown; error: { message: string } | null }, seen: unknown[][] = []) {
  const b = {
    select: () => b,
    eq: (col: string, val: unknown) => {
      seen.push([col, val]);
      return b;
    },
    maybeSingle: async () => result,
  };
  return { from: (t: string) => (t === "privacy_consents" ? b : (() => { throw new Error(`unexpected ${t}`); })()) } as never;
}

describe("isConsentCurrent", () => {
  it("accepts a full record for the current version", () => {
    expect(isConsentCurrent(FULL)).toBe(true);
  });
  it("rejects an older policy version (bumping the version re-prompts everyone)", () => {
    expect(isConsentCurrent({ ...FULL, policy_version: "2020-01-01" })).toBe(false);
  });
  it.each(["age_confirmed", "privacy_accepted", "terms_accepted"] as const)("rejects when %s is false", (k) => {
    expect(isConsentCurrent({ ...FULL, [k]: false })).toBe(false);
  });
  it("rejects null, undefined and an empty object", () => {
    expect(isConsentCurrent(null)).toBe(false);
    expect(isConsentCurrent(undefined)).toBe(false);
    expect(isConsentCurrent({})).toBe(false);
  });
});

describe("hasCurrentConsent / requireConsent", () => {
  it("queries by the user id and the CURRENT version", async () => {
    const seen: unknown[][] = [];
    await hasCurrentConsent(fakeClient({ data: FULL, error: null }, seen), "user-a");
    expect(seen).toEqual([
      ["user_id", "user-a"],
      ["policy_version", POLICY_VERSION],
    ]);
  });

  it("lets a consenting user through (null = no refusal)", async () => {
    expect(await requireConsent(fakeClient({ data: FULL, error: null }), { id: "u" })).toBeNull();
  });

  it("refuses with 403 consent_required when there is no record", async () => {
    const res = await requireConsent(fakeClient({ data: null, error: null }), { id: "u" });
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: "consent_required" });
  });

  it("refuses when the stored record is for an old version", async () => {
    const res = await requireConsent(fakeClient({ data: { ...FULL, policy_version: "old" }, error: null }), { id: "u" });
    expect(res?.status).toBe(403);
  });

  it("FAILS CLOSED when the lookup itself errors (e.g. table missing, network)", async () => {
    const res = await requireConsent(fakeClient({ data: FULL, error: { message: "boom" } }), { id: "u" });
    expect(res?.status).toBe(403);
  });
});
