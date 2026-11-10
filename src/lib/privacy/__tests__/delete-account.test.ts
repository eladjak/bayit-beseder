/**
 * deleteAccount: scoping (user A can never touch user B's rows), household
 * handling, the shared-database rule, and the active-subscription block.
 * The database is a recording fake: no network, no real data.
 */
import { describe, it, expect } from "vitest";
import { DeleteAccountError, deleteAccount } from "../delete-account";

interface Call {
  table: string;
  op: "select" | "update" | "delete";
  payload?: unknown;
  filters: [string, string, unknown][];
}

function makeDb(respond: (c: Call) => unknown[] | null | { error: { code?: string; message: string } }) {
  const calls: Call[] = [];
  const removed: string[][] = [];
  const deletedAuthUsers: string[] = [];

  function from(table: string) {
    const call: Call = { table, op: "select", filters: [] };
    let committed = false;
    const settle = () => {
      if (!committed) {
        committed = true;
        calls.push(call);
      }
      const out = respond(call);
      if (out && !Array.isArray(out) && "error" in out) return { data: null, error: out.error };
      return { data: out ?? [], error: null };
    };
    const chain: Record<string, unknown> = {
      select: () => chain,
      update: (p: unknown) => ((call.op = "update"), (call.payload = p), chain),
      delete: () => ((call.op = "delete"), chain),
      eq: (c: string, v: unknown) => (call.filters.push(["eq", c, v]), chain),
      neq: (c: string, v: unknown) => (call.filters.push(["neq", c, v]), chain),
      in: (c: string, v: unknown) => (call.filters.push(["in", c, v]), chain),
      not: (c: string, _o: string, v: unknown) => (call.filters.push(["not", c, v]), chain),
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => {
        const r = settle();
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
      },
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(settle()).then(resolve, reject),
    };
    return chain;
  }

  const db = {
    from,
    storage: { from: () => ({ remove: async (names: string[]) => (removed.push(names), { error: null }) }) },
    auth: { admin: { deleteUser: async (id: string) => (deletedAuthUsers.push(id), { error: null }) } },
  };
  return { db: db as never, calls, removed, deletedAuthUsers };
}

const A = "user-a";
const B = "user-b";

/** Every filter on every write must be scoped by A, or by A's last household / its tasks. */
function writes(calls: Call[]) {
  return calls.filter((c) => c.op !== "select");
}

describe("deleteAccount", () => {
  it("refuses while a paid subscription is still billing, and deletes nothing", async () => {
    const { db, calls } = makeDb((c) => (c.table === "subscriptions" && c.op === "select" ? [{ status: "active" }] : []));
    await expect(deleteAccount(db, A)).rejects.toMatchObject({ code: "active_subscription" });
    await expect(deleteAccount(db, A)).rejects.toBeInstanceOf(DeleteAccountError);
    expect(writes(calls)).toHaveLength(0);
  });

  it("last member: deletes the household with everything in it, then profile and auth user", async () => {
    const { db, calls, deletedAuthUsers, removed } = makeDb((c) => {
      if (c.table === "profiles" && c.op === "select" && c.filters.some((f) => f[0] === "eq" && f[1] === "id"))
        return [{ household_id: "h1" }];
      if (c.table === "household_members" && c.filters.some((f) => f[1] === "user_id" && f[0] === "eq"))
        return [{ household_id: "h1" }];
      if (c.table === "tasks" && c.op === "select") return [{ id: "t1" }, { id: "t2" }];
      if (c.table === "task_completions" && c.op === "select")
        return [{ photo_url: "https://x.supabase.co/storage/v1/object/public/task-photos/t1-1.jpg" }];
      return []; // no other members, no subscriptions, no user_roles
    });
    const res = await deleteAccount(db, A);
    expect(res).toMatchObject({ household: "deleted", authUserDeleted: true });
    const del = writes(calls).filter((c) => c.op === "delete").map((c) => c.table);
    for (const t of ["task_completions", "tasks", "meals", "meal_plan", "shopping_items", "household_members", "households", "profiles", "privacy_consents"]) {
      expect(del).toContain(t);
    }
    expect(del.indexOf("households")).toBeGreaterThan(del.indexOf("household_members"));
    expect(del.indexOf("households")).toBeGreaterThan(del.indexOf("tasks"));
    expect(deletedAuthUsers).toEqual([A]);
    expect(removed.flat()).toContain("t1-1.jpg");
  });

  it("other members remain: leaves the household, hands over ownership, deletes NO shared rows", async () => {
    const { db, calls, deletedAuthUsers } = makeDb((c) => {
      if (c.table === "profiles" && c.op === "select" && c.filters.some((f) => f[1] === "id" && f[0] === "eq"))
        return [{ household_id: "h1" }];
      if (c.table === "household_members" && c.op === "select" && c.filters.some((f) => f[0] === "neq"))
        return [{ user_id: B, role: "member", joined_at: "2026-01-01" }];
      if (c.table === "household_members" && c.op === "select") return [{ household_id: "h1" }];
      return [];
    });
    const res = await deleteAccount(db, A);
    expect(res).toMatchObject({ household: "left", newOwnerId: B, authUserDeleted: true });
    const w = writes(calls);
    // B is promoted, and only B.
    const promote = w.find((c) => c.table === "household_members" && c.op === "update");
    expect(promote?.payload).toEqual({ role: "owner" });
    expect(promote?.filters).toContainEqual(["eq", "user_id", B]);
    // The household itself and its shared tables are untouched.
    const deletedTables = w.filter((c) => c.op === "delete").map((c) => c.table);
    expect(deletedTables).not.toContain("households");
    expect(deletedTables).not.toContain("tasks");
    expect(deletedTables).not.toContain("meals");
    expect(deletedTables).not.toContain("shopping_items");
    expect(deletedAuthUsers).toEqual([A]);
  });

  it("never writes with user B's id except to promote B to owner", async () => {
    const { db, calls } = makeDb((c) => {
      if (c.table === "profiles" && c.op === "select" && c.filters.some((f) => f[1] === "id" && f[0] === "eq"))
        return [{ household_id: "h1" }];
      if (c.table === "household_members" && c.op === "select" && c.filters.some((f) => f[0] === "neq"))
        return [{ user_id: B, role: "member", joined_at: "2026-01-01" }];
      if (c.table === "household_members" && c.op === "select") return [{ household_id: "h1" }];
      return [];
    });
    await deleteAccount(db, A);
    const touchingB = writes(calls).filter((c) => JSON.stringify(c.filters).includes(B));
    expect(touchingB.map((c) => `${c.table}:${c.op}`)).toEqual(["household_members:update"]);
  });

  it("the automatic default role row (every sign-up gets one) does NOT block deletion", async () => {
    const { db, calls, deletedAuthUsers } = makeDb((c) =>
      c.table === "user_roles" && c.op === "select" ? [{ role: "youth_volunteer" }] : [],
    );
    const res = await deleteAccount(db, A);
    expect(res.authUserDeleted).toBe(true);
    expect(deletedAuthUsers).toEqual([A]);
    const w = writes(calls);
    const roleDel = w.find((c) => c.table === "user_roles" && c.op === "delete");
    expect(roleDel?.filters).toContainEqual(["eq", "user_id", A]);
    expect(roleDel?.filters).toContainEqual(["eq", "role", "youth_volunteer"]);
  });

  it("shared database: an elevated events-app role keeps the profile and the sign-in", async () => {
    const { db, calls, deletedAuthUsers } = makeDb((c) =>
      c.table === "user_roles" && c.op === "select" ? [{ role: "admin" }] : [],
    );
    const res = await deleteAccount(db, A);
    expect(res.authUserDeleted).toBe(false);
    expect(deletedAuthUsers).toEqual([]);
    const w = writes(calls);
    expect(w.some((c) => c.table === "profiles" && c.op === "delete")).toBe(false);
    const scrub = w.find((c) => c.table === "profiles" && c.op === "update");
    expect(scrub?.payload).toMatchObject({ household_id: null, push_subscription: null, google_calendar_tokens: null, whatsapp_phone: null });
  });

  it("shared database: rows of the events app's own (e.g. assignments) also keep the sign-in", async () => {
    const { db, deletedAuthUsers } = makeDb((c) => (c.table === "event_assignments" ? [{ user_id: A }] : []));
    const res = await deleteAccount(db, A);
    expect(res.authUserDeleted).toBe(false);
    expect(deletedAuthUsers).toEqual([]);
  });

  it("a missing table or column is skipped and reported, not fatal", async () => {
    const { db } = makeDb((c) =>
      c.table === "wheel_spins" ? { error: { code: "42P01", message: "relation does not exist" } } : [],
    );
    const res = await deleteAccount(db, A);
    expect(res.skipped).toContain("wheel_spins");
  });

  it("any other database error aborts (and the auth user is NOT deleted)", async () => {
    const { db, deletedAuthUsers } = makeDb((c) =>
      c.table === "streaks" ? { error: { code: "23503", message: "fk violation" } } : [],
    );
    await expect(deleteAccount(db, A)).rejects.toMatchObject({ code: "step_failed", step: "streaks" });
    expect(deletedAuthUsers).toEqual([]);
  });
});
