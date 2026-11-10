/**
 * The privacy gate's server rules: what counts as "consented", and that the
 * guard FAILS CLOSED (a broken check is a refusal, never a pass).
 */
import { describe, it, expect } from "vitest";
import { POLICY_VERSION, isConsentCurrent } from "../policy";
import { hasCurrentConsent, requireConsent, getConsentStatus, filterConsentedUserIds, householdConsentOk } from "../consent-server";

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

  it("a lookup that RETURNS an error is 'unavailable': 503, not 403 (we could not check, the person did not refuse)", async () => {
    const res = await requireConsent(fakeClient({ data: FULL, error: { message: "boom" } }), { id: "u" });
    expect(res?.status).toBe(503);
    expect(await res?.json()).toEqual({ error: "consent_unavailable" });
  });

  it("a lookup that THROWS fails closed, never rejects, and is 'unavailable' (red before the fix: it rejected / was read as no-consent)", async () => {
    const throwing = { from: () => { throw new Error("network down"); } } as never;
    await expect(getConsentStatus(throwing, "u")).resolves.toBe("unavailable");
    await expect(hasCurrentConsent(throwing, "u")).resolves.toBe(false);
    const res = await requireConsent(throwing, { id: "u" });
    expect(res?.status).toBe(503);
  });

  it("a lookup whose promise REJECTS fails closed too", async () => {
    const rejecting = {
      from: () => {
        const b = { select: () => b, eq: () => b, maybeSingle: async () => { throw new TypeError("fetch failed"); } };
        return b;
      },
    } as never;
    await expect(getConsentStatus(rejecting, "u")).resolves.toBe("unavailable");
  });

  it("tells the three answers apart", async () => {
    expect(await getConsentStatus(fakeClient({ data: FULL, error: null }), "u")).toBe("accepted");
    expect(await getConsentStatus(fakeClient({ data: null, error: null }), "u")).toBe("needed");
    expect(await getConsentStatus(fakeClient({ data: null, error: { message: "x" } }), "u")).toBe("unavailable");
  });
});

/** A service-style client for the "who has consent" questions (no session involved). */
function listClient(result: { data: unknown; error: { message: string } | null } | "throw", households: { user_id: string }[] = []) {
  return {
    from: (t: string) => {
      let only: string[] | null = null;
      const b = {
        select: () => b,
        in: (_c: string, ids: string[]) => ((only = ids), b),
        eq: () => (t === "household_members" ? Promise.resolve({ data: households, error: null }) : b),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          (result === "throw"
            ? Promise.reject(new Error("down"))
            : Promise.resolve(
                only && Array.isArray(result.data)
                  ? { ...result, data: (result.data as { user_id: string }[]).filter((r) => only!.includes(r.user_id)) }
                  : result,
              )
          ).then(res, rej),
      };
      return b;
    },
  } as never;
}

describe("filterConsentedUserIds / householdConsentOk (no session: agent tokens, webhook, cron)", () => {
  const rows = [
    { user_id: "a", ...FULL },
    { user_id: "b", ...FULL, terms_accepted: false },
    { user_id: "c", ...FULL, policy_version: "old" },
  ];
  it("returns only users with a FULL, CURRENT record", async () => {
    expect([...(await filterConsentedUserIds(listClient({ data: rows, error: null }), ["a", "b", "c", "d"]))]).toEqual(["a"]);
  });
  it("fails closed on an error, a throw, and an empty list", async () => {
    expect((await filterConsentedUserIds(listClient({ data: null, error: { message: "x" } }), ["a"])).size).toBe(0);
    expect((await filterConsentedUserIds(listClient("throw"), ["a"])).size).toBe(0);
    expect((await filterConsentedUserIds(listClient({ data: rows, error: null }), [])).size).toBe(0);
  });
  it("a token needs its creator to have consented; with no creator, one consenting member is enough", async () => {
    const c = listClient({ data: rows, error: null }, [{ user_id: "b" }, { user_id: "a" }]);
    expect(await householdConsentOk(c, "h", "a")).toBe(true);
    expect(await householdConsentOk(c, "h", "b")).toBe(false);
    expect(await householdConsentOk(c, "h", null)).toBe(true);
    expect(await householdConsentOk(listClient({ data: rows, error: null }, [{ user_id: "b" }]), "h", null)).toBe(false);
    expect(await householdConsentOk(listClient("throw"), "h", "a")).toBe(false);
  });
});
