/**
 * The privacy gate's server rules: what counts as "consented", and that the
 * guard FAILS CLOSED (a broken check is a refusal, never a pass).
 */
import { describe, it, expect } from "vitest";
import { POLICY_VERSION, isConsentCurrent } from "../policy";
import { hasCurrentConsent, requireConsent, getConsentStatus, filterConsentedUserIds, householdConsentOk, consentedHouseholdIds } from "../consent-server";

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

/** A service client over small in-memory tables, honouring .in / .eq / .not for what the helpers use. */
function dbClient(cfg: { consents?: Record<string, unknown>[]; members?: { household_id: string; user_id: string }[]; profiles?: { id: string; household_id: string | null }[]; fail?: "consents" | "members" | "throw" }) {
  return {
    from(table: string) {
      let rows: Record<string, unknown>[] =
        table === "privacy_consents" ? cfg.consents ?? [] : table === "household_members" ? (cfg.members as never) ?? [] : table === "profiles" ? (cfg.profiles as never) ?? [] : [];
      let start = 0, end = 999;
      const b = {
        select: () => b,
        order: () => b,
        range: (a: number, z: number) => ((start = a), (end = z), b),
        eq: (c: string, v: unknown) => ((rows = rows.filter((r) => r[c] === v)), b),
        in: (c: string, vs: unknown[]) => ((rows = rows.filter((r) => vs.includes(r[c]))), b),
        not: (c: string, _op: string, v: unknown) => ((rows = rows.filter((r) => r[c] !== v)), b),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          if (cfg.fail === "throw") return Promise.reject(new Error("down")).then(res, rej);
          if ((cfg.fail === "consents" && table === "privacy_consents") || (cfg.fail === "members" && table === "household_members"))
            return Promise.resolve({ data: null, error: { message: "x" } }).then(res, rej);
          return Promise.resolve({ data: rows.slice(start, end + 1), error: null }).then(res, rej);
        },
      };
      return b;
    },
  } as never;
}
const C = (user_id: string, over: Record<string, unknown> = {}) => ({ user_id, ...FULL, ...over });

describe("filterConsentedUserIds (no session: webhook, cron)", () => {
  it("returns only users with a FULL, CURRENT record", async () => {
    const db = dbClient({ consents: [C("a"), C("b", { terms_accepted: false }), C("c", { policy_version: "old" })] });
    expect([...(await filterConsentedUserIds(db, ["a", "b", "c", "d"]))]).toEqual(["a"]);
  });
  it("fails closed on an error, a throw, and an empty list", async () => {
    expect((await filterConsentedUserIds(dbClient({ fail: "consents" }), ["a"])).size).toBe(0);
    expect((await filterConsentedUserIds(dbClient({ fail: "throw" }), ["a"])).size).toBe(0);
    expect((await filterConsentedUserIds(dbClient({ consents: [C("a")] }), [])).size).toBe(0);
  });
  it("handles more ids than one query takes (chunking)", async () => {
    const ids = Array.from({ length: 400 }, (_, i) => `u${i}`);
    const db = dbClient({ consents: ids.map((i) => C(i)) });
    expect((await filterConsentedUserIds(db, ids)).size).toBe(400);
  });
});

describe("consentedHouseholdIds / householdConsentOk: EVERY member must have consented", () => {
  const members = [
    { household_id: "h1", user_id: "a" },
    { household_id: "h1", user_id: "b" },
    { household_id: "h2", user_id: "c" },
    { household_id: "h3", user_id: "d" },
  ];
  it("serves a household only when all of its members consented", async () => {
    const db = dbClient({ members, profiles: [], consents: [C("a"), C("c"), C("d")] }); // b has not consented
    expect(await consentedHouseholdIds(db)).toEqual(["h2", "h3"]);
    expect(await householdConsentOk(db, "h1")).toBe(false);
    expect(await householdConsentOk(db, "h2")).toBe(true);
  });
  it("one person's consent does not cover another: two members, one consent, refused (red under the old 'creator or any one member' rule)", async () => {
    const db = dbClient({ members: members.slice(0, 2), profiles: [], consents: [C("a")] });
    expect(await householdConsentOk(db, "h1")).toBe(false);
  });
  it("a member known only through profiles.household_id counts too", async () => {
    const db = dbClient({ members: [{ household_id: "h1", user_id: "a" }], profiles: [{ id: "z", household_id: "h1" }], consents: [C("a")] });
    expect(await householdConsentOk(db, "h1")).toBe(false);
  });
  it("a new member who has not consented closes the household again; an old-version consent does not count", async () => {
    const db = dbClient({ members: members.slice(0, 2), profiles: [], consents: [C("a"), C("b", { policy_version: "old" })] });
    expect(await householdConsentOk(db, "h1")).toBe(false);
  });
  it("does not miss an unconsented member beyond the PostgREST row limit", async () => {
    const members = Array.from({ length: 1001 }, (_, i) => ({ household_id: "h1", user_id: `u${i}` }));
    const db = dbClient({ members, consents: members.slice(0, 1000).map(({ user_id }) => C(user_id)) });
    expect(await householdConsentOk(db, "h1")).toBe(false);
  });
  it("a household with no members is not served", async () => {
    expect(await householdConsentOk(dbClient({ members: [], profiles: [], consents: [C("a")] }), "h1")).toBe(false);
  });
  it("fails closed on a lookup error and on a throw", async () => {
    expect(await householdConsentOk(dbClient({ members, profiles: [], consents: [C("a"), C("b")], fail: "consents" }), "h1")).toBe(false);
    expect(await householdConsentOk(dbClient({ members, profiles: [], consents: [C("a"), C("b")], fail: "members" }), "h1")).toBe(false);
    expect(await householdConsentOk(dbClient({ fail: "throw" }), "h1")).toBe(false);
  });
});
