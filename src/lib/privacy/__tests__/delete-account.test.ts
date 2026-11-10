/**
 * deleteAccount (TypeScript side). WHAT gets deleted, and whether the shared auth
 * user may go, is decided inside the database function bayit_delete_account
 * (migration 027) and is proven against a real Postgres in
 * supabase/tests/privacy/run.sh. Here: the wrapper calls only that function, with
 * only the given id, never deletes the auth user itself, maps its answers, and
 * fails closed (nothing deleted) when the function is missing or misbehaves.
 */
import { describe, it, expect } from "vitest";
import { DeleteAccountError, deleteAccount } from "../delete-account";

function makeDb(rpcResult: { data?: unknown; error?: { code?: string; message: string } | null } | "throw") {
  const rpcCalls: [string, unknown][] = [];
  const removed: string[][] = [];
  const touched: string[] = [];
  const db = {
    rpc: async (fn: string, args: unknown) => {
      rpcCalls.push([fn, args]);
      if (rpcResult === "throw") throw new TypeError("fetch failed");
      return { data: rpcResult.data ?? null, error: rpcResult.error ?? null };
    },
    // Anything else would mean the wrapper is deleting by itself again: record it.
    from: (t: string) => (touched.push(`from:${t}`), {}),
    auth: { admin: { deleteUser: async (id: string) => (touched.push(`deleteUser:${id}`), { error: null }) } },
    storage: { from: () => ({ remove: async (names: string[]) => (removed.push(names), { error: null }) }) },
  };
  return { db: db as never, rpcCalls, removed, touched };
}

const OK = { auth_user_deleted: true, household: "deleted", new_owner_id: null, photo_urls: [], kept_because: [] };

describe("deleteAccount", () => {
  it("calls ONLY bayit_delete_account with the given id, and never touches tables or the auth admin API itself", async () => {
    const { db, rpcCalls, touched } = makeDb({ data: OK });
    await deleteAccount(db, "user-a");
    expect(rpcCalls).toEqual([["bayit_delete_account", { p_user: "user-a" }]]);
    expect(touched).toEqual([]);
  });

  it("maps the answer: signed-in user deleted / household deleted", async () => {
    const { db } = makeDb({ data: OK });
    expect(await deleteAccount(db, "u")).toEqual({ authUserDeleted: true, household: "deleted", newOwnerId: null, skipped: [] });
  });

  it("KEPT sign-in (the events app still has data): authUserDeleted is false, so the person is told", async () => {
    const { db } = makeDb({
      data: { ...OK, auth_user_deleted: false, household: "left", new_owner_id: "u2", kept_because: ["public.event_assignments"] },
    });
    expect(await deleteAccount(db, "u")).toEqual({ authUserDeleted: false, household: "left", newOwnerId: "u2", skipped: [] });
  });

  it("removes the stored photos the database reported, by object name", async () => {
    const { db, removed } = makeDb({
      data: {
        ...OK,
        photo_urls: ["https://x.supabase.co/storage/v1/object/public/task-photos/h1/a%20b.jpg?t=1", "https://other.example/none.jpg"],
      },
    });
    const r = await deleteAccount(db, "u");
    expect(removed).toEqual([["h1/a b.jpg"]]);
    expect(r.skipped).toEqual([]);
  });

  it("a photo that cannot be removed is reported, not hidden", async () => {
    const { db } = makeDb({ data: { ...OK, photo_urls: ["https://x/task-photos/a.jpg"] } });
    (db as { storage: unknown }).storage = { from: () => ({ remove: async () => ({ error: { message: "boom" } }) }) };
    expect((await deleteAccount(db, "u")).skipped).toEqual(["storage.task-photos"]);
  });

  it("active subscription -> DeleteAccountError(active_subscription)", async () => {
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
    ["an empty answer", { data: null }],
  ])("fails closed on %s (DeleteAccountError, no fallback deletion)", async (_n, result) => {
    const { db, touched } = makeDb(result as never);
    await expect(deleteAccount(db, "u")).rejects.toBeInstanceOf(DeleteAccountError);
    expect(touched).toEqual([]);
  });
});
