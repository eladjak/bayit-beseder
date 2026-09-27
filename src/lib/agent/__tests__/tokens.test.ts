import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  generateRawToken,
  hashToken,
  issueHouseholdToken,
  revokeHouseholdToken,
  resolveHouseholdForToken,
} from "../tokens";

function fakeSupabase(
  rows: Array<{ id: string; household_id: string; token_hash: string; revoked_at: string | null }>,
  options: { errorOnLookup?: string } = {}
) {
  const insertedRows: Array<Record<string, unknown>> = [];
  const updatedIds: string[] = [];

  const from = (table: string) => {
    if (table !== "household_agent_tokens") {
      throw new Error(`unexpected table ${table}`);
    }
    const state: { eqs: [string, unknown][]; insertRow?: Record<string, unknown> } = { eqs: [] };
    const builder = {
      insert(row: Record<string, unknown>) {
        state.insertRow = row;
        insertedRows.push(row);
        return builder;
      },
      update(row: Record<string, unknown>) {
        state.insertRow = { ...state.insertRow, ...row };
        return builder;
      },
      select() {
        return builder;
      },
      eq(col: string, val: unknown) {
        state.eqs.push([col, val]);
        if (col === "id") updatedIds.push(String(val));
        return builder;
      },
      is() {
        return builder;
      },
      single: () =>
        Promise.resolve({
          data: {
            id: "new-token-id",
            household_id: state.insertRow?.household_id,
            created_at: "2026-09-27T00:00:00.000Z",
          },
          error: null,
        }),
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
      // update(...).eq(...).is(...) resolves without select/single in revoke()
      then: (onFulfilled: (v: { data: null; error: null }) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled),
    };
    return builder;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { from } as any, insertedRows, updatedIds };
}

describe("generateRawToken / hashToken", () => {
  it("generates tokens with the expected prefix and sufficient entropy", () => {
    const a = generateRawToken();
    const b = generateRawToken();
    expect(a).toMatch(/^bbs_agent_[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  it("hashToken is deterministic and matches a manually computed SHA-256", () => {
    const raw = "bbs_agent_deadbeef";
    const expected = createHash("sha256").update(raw, "utf8").digest("hex");
    expect(hashToken(raw)).toBe(expected);
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  it("different raw tokens hash to different values", () => {
    expect(hashToken(generateRawToken())).not.toBe(hashToken(generateRawToken()));
  });
});

describe("issueHouseholdToken", () => {
  it("stores only the hash, never the raw token, and returns the raw token exactly once", async () => {
    const fake = fakeSupabase([]);
    const issued = await issueHouseholdToken(fake.client, "household-a", "test label");

    expect(issued.rawToken).toMatch(/^bbs_agent_/);
    expect(issued.householdId).toBe("household-a");

    const insertedRow = fake.insertedRows[0];
    expect(insertedRow.token_hash).toBe(hashToken(issued.rawToken));
    expect(insertedRow.token_hash).not.toBe(issued.rawToken);
    expect(JSON.stringify(insertedRow)).not.toContain(issued.rawToken);
  });
});

describe("resolveHouseholdForToken", () => {
  it("resolves the household for a known, active token", async () => {
    const raw = "bbs_agent_known";
    const fake = fakeSupabase([
      { id: "t1", household_id: "household-a", token_hash: hashToken(raw), revoked_at: null },
    ]);
    await expect(resolveHouseholdForToken(fake.client, raw)).resolves.toEqual({
      status: "ok",
      householdId: "household-a",
    });
  });

  it("returns status 'not_found' for an unknown token", async () => {
    const fake = fakeSupabase([]);
    await expect(resolveHouseholdForToken(fake.client, "bbs_agent_unknown")).resolves.toEqual({
      status: "not_found",
    });
  });

  it("returns status 'not_found' for a REVOKED token, even though its hash exists in the table", async () => {
    const raw = "bbs_agent_revoked";
    const fake = fakeSupabase([
      {
        id: "t1",
        household_id: "household-a",
        token_hash: hashToken(raw),
        revoked_at: "2026-09-01T00:00:00.000Z",
      },
    ]);
    await expect(resolveHouseholdForToken(fake.client, raw)).resolves.toEqual({
      status: "not_found",
    });
  });

  it("never confuses two different households' tokens", async () => {
    const rawA = "bbs_agent_a";
    const rawB = "bbs_agent_b";
    const fake = fakeSupabase([
      { id: "t1", household_id: "household-a", token_hash: hashToken(rawA), revoked_at: null },
      { id: "t2", household_id: "household-b", token_hash: hashToken(rawB), revoked_at: null },
    ]);
    await expect(resolveHouseholdForToken(fake.client, rawA)).resolves.toEqual({
      status: "ok",
      householdId: "household-a",
    });
    await expect(resolveHouseholdForToken(fake.client, rawB)).resolves.toEqual({
      status: "ok",
      householdId: "household-b",
    });
  });

  // RED-FIRST for fix #5 (adversarial review, PR #13): a DB/network failure
  // during the lookup must NOT be reported the same way as "token unknown".
  // Against the pre-fix implementation (`if (error || !data) return null`)
  // this test fails, because a lookup error collapsed into the exact same
  // `null` as a genuinely unknown token — see auth.test.ts for the
  // higher-level assertion that this becomes an HTTP 503, not a 403.
  it("returns status 'error' (never 'not_found') when the lookup itself fails", async () => {
    const fake = fakeSupabase([], { errorOnLookup: "connection reset" });
    const result = await resolveHouseholdForToken(fake.client, "bbs_agent_whatever");
    expect(result.status).toBe("error");
    expect(result).not.toEqual({ status: "not_found" });
    if (result.status === "error") {
      expect(result.message).toBe("connection reset");
    }
  });
});

describe("revokeHouseholdToken", () => {
  it("issues an update targeting the token's id", async () => {
    const fake = fakeSupabase([]);
    await revokeHouseholdToken(fake.client, "token-123");
    expect(fake.updatedIds).toContain("token-123");
  });

  it("propagates a Supabase error as a thrown Error", async () => {
    const failingClient = {
      from: () => ({
        update: () => ({
          eq: () => ({
            is: () => Promise.resolve({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    await expect(revokeHouseholdToken(failingClient, "token-x")).rejects.toThrow(/boom/);
  });
});

