/**
 * deleteAccount (TypeScript side). WHAT gets deleted is decided inside the database function
 * bayit_delete_account (migration 027) and is proven against a real Postgres in
 * supabase/tests/privacy/run.sh. The shared login (auth user, profile) is never deleted by it.
 * Here: the wrapper calls only that function, with only the given id, never touches the auth admin
 * API or other tables itself, maps its answers, removes the reported photo objects (and clears them
 * from the durable queue), and fails closed (nothing deleted) when the function is missing or misbehaves.
 */
import { describe, it, expect } from "vitest";
import { DeleteAccountError, deleteAccount } from "../delete-account";

function makeDb(rpcResult: { data?: unknown; error?: { code?: string; message: string } | null } | "throw") {
  const rpcCalls: [string, unknown][] = [];
  const removed: string[][] = [];
  const touched: string[] = [];
  const dequeued: string[][] = [];
  const db = {
    rpc: async (fn: string, args: unknown) => {
      rpcCalls.push([fn, args]);
      if (rpcResult === "throw") throw new TypeError("fetch failed");
      return { data: rpcResult.data ?? null, error: rpcResult.error ?? null };
    },
    // The only table the wrapper may touch is the cleanup queue, and only to clear removed objects.
    from: (t: string) => {
      if (t !== "bayit_storage_cleanup") touched.push(`from:${t}`);
      return { delete: () => ({ in: async (_c: string, names: string[]) => (dequeued.push(names), { error: null }) }) };
    },
    // Anything on the auth admin API would mean the wrapper deletes the shared login again: record it.
    auth: { admin: { deleteUser: async (id: string) => (touched.push(`deleteUser:${id}`), { error: null }) } },
    storage: { from: () => ({ remove: async (names: string[]) => (removed.push(names), { error: null }) }) },
  };
  return { db: db as never, rpcCalls, removed, touched, dequeued };
}

const OK = { identity_deletion_requested: true, household: "deleted", new_owner_id: null, object_names: [] };

describe("deleteAccount", () => {
  it("calls ONLY bayit_delete_account with the given id, and never touches other tables or the auth admin API", async () => {
    const { db, rpcCalls, touched } = makeDb({ data: OK });
    await deleteAccount(db, "user-a");
    expect(rpcCalls).toEqual([["bayit_delete_account", { p_user: "user-a" }]]);
    expect(touched).toEqual([]);
  });

  it("maps the answer: the data is deleted and a full identity deletion is REQUESTED (never done here)", async () => {
    const { db } = makeDb({ data: OK });
    expect(await deleteAccount(db, "u")).toEqual({ identityDeletionRequested: true, household: "deleted", newOwnerId: null, keptShared: [], skipped: [] });
  });

  it("reports an EMPTIED household (kept and marked, because former members' rows remain) and the rows that still carry the id", async () => {
    const { db } = makeDb({ data: { ...OK, household: "emptied", kept_shared: ["love_tokens.sender_id", 5, "weekly_syncs.created_by"] } });
    expect(await deleteAccount(db, "u")).toMatchObject({ household: "emptied", keptShared: ["love_tokens.sender_id", "weekly_syncs.created_by"] });
  });

  it("reports a household that was left and the new owner", async () => {
    const { db } = makeDb({ data: { ...OK, household: "left", new_owner_id: "u2" } });
    expect(await deleteAccount(db, "u")).toMatchObject({ household: "left", newOwnerId: "u2" });
  });

  it("removes the reported photo objects by name and then clears them from the queue", async () => {
    const { db, removed, dequeued } = makeDb({ data: { ...OK, object_names: ["u/h1-a%20b.webp", "u/h2.webp"] } });
    const r = await deleteAccount(db, "u");
    expect(removed).toEqual([["u/h1-a b.webp", "u/h2.webp"]]);
    expect(dequeued).toEqual([["u/h1-a%20b.webp", "u/h2.webp"]]);
    expect(r.skipped).toEqual([]);
  });

  it("a photo that cannot be removed stays QUEUED and is reported, not hidden", async () => {
    const { db, dequeued } = makeDb({ data: { ...OK, object_names: ["u/a.webp"] } });
    (db as { storage: unknown }).storage = { from: () => ({ remove: async () => ({ error: { message: "boom" } }) }) };
    expect((await deleteAccount(db, "u")).skipped).toEqual(["storage.task-photos"]);
    expect(dequeued).toEqual([]);
  });

  it("active (billing) subscription -> DeleteAccountError(active_subscription)", async () => {
    const { db } = makeDb({ error: { code: "P0001", message: "active_subscription" } });
    await expect(deleteAccount(db, "u")).rejects.toMatchObject({ name: "DeleteAccountError", code: "active_subscription" });
  });

  it("function missing (migration 027 not applied) -> not_available, and nothing else is attempted", async () => {
    const { db, touched } = makeDb({ error: { code: "PGRST202", message: "Could not find the function" } });
    await expect(deleteAccount(db, "u")).rejects.toMatchObject({ code: "not_available" });
    expect(touched).toEqual([]);
  });

  it.each([
    ["a database error", { error: { code: "XX000", message: "boom" } }],
    ["a thrown network error", "throw" as const],
    ["an answer that is not the expected shape", { data: { hello: "world" } }],
    ["the OLD answer shape (it would have meant the login was deleted)", { data: { auth_user_deleted: true, household: "none" } }],
    ["an empty answer", { data: null }],
  ])("fails closed on %s (DeleteAccountError, no fallback deletion)", async (_n, result) => {
    const { db, touched } = makeDb(result as never);
    await expect(deleteAccount(db, "u")).rejects.toBeInstanceOf(DeleteAccountError);
    expect(touched).toEqual([]);
  });
});
