import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Delete one user's BayitBeSeder data. The shared login is NEVER deleted here.
 *
 * THE DECISIONS LIVE IN THE DATABASE, NOT HERE.
 * The Supabase project is shared with the events app, so the auth user and the profile row
 * belong to both apps and nobody can prove from this app that the other one no longer needs them.
 * `public.bayit_delete_account(uuid)` (migration 027, service role only), in one transaction:
 *   - deletes only the requester's OWN rows. Rows authored by or addressed to another person are never
 *     deleted (not even when the requester is the last current member): where a row is shared, the
 *     requester's side is set to NULL, or the row is kept and listed (keptShared). A household left
 *     with nobody is marked for cleanup and only loses rows that belong to nobody else;
 *   - clears this app's own columns on the shared profile and KEEPS the profile and the auth user;
 *   - records "full identity deletion requested" in bayit_identity_deletion_requests, for the owner
 *     to handle by hand within the legal time;
 *   - queues the person's stored photo objects (bayit_storage_cleanup) and returns their names;
 *   - refuses only for a subscription that really bills (a paid plan), never for a free row;
 *   - rolls everything back if any step fails.
 * This file only calls it, then removes the photo objects and clears them from the queue.
 * If migration 027 is not applied the call fails and NOTHING is deleted.
 *
 * The id comes from the verified session in the route, never from the body.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export class DeleteAccountError extends Error {
  constructor(
    public readonly code: "active_subscription" | "step_failed" | "not_available",
    message: string,
    public readonly step?: string,
  ) {
    super(message);
    this.name = "DeleteAccountError";
  }
}

export interface DeleteAccountResult {
  /** Always true on success: the login stays until the owner removes it by hand. */
  identityDeletionRequested: boolean;
  /** What happened to the user's household. */
  household: "none" | "left" | "deleted" | "emptied";
  /** Shared rows that could not be anonymised (NOT NULL columns) and still carry the person's id: table.column. */
  keptShared: string[];
  /** If the user was the owner and others remained, who became owner (id only). */
  newOwnerId: string | null;
  /** Steps that did not complete and need a human look (e.g. stored photos that could not be removed). */
  skipped: string[];
}

const PHOTO_BUCKET = "task-photos";

interface RpcResult {
  identity_deletion_requested?: unknown;
  household?: unknown;
  new_owner_id?: unknown;
  object_names?: unknown;
  kept_shared?: unknown;
}

/**
 * Remove the stored photo objects the database reported (it only reports names that provably
 * belong to the person) and clear them from the durable queue. A failure keeps them queued
 * and is reported, never hidden.
 */
async function removePhotos(db: Db, names: string[], skipped: string[]) {
  if (names.length === 0) return;
  const objects = names.map((n) => {
    try {
      return decodeURIComponent(n);
    } catch {
      return n;
    }
  });
  try {
    const { error } = await db.storage.from(PHOTO_BUCKET).remove(objects);
    if (error) throw new Error(error.message);
    await db.from("bayit_storage_cleanup").delete().in("object_name", names);
  } catch (err) {
    console.error("[delete-account] could not remove stored photos (kept in the cleanup queue):", err instanceof Error ? err.message : err);
    skipped.push("storage.task-photos");
  }
}

export async function deleteAccount(db: Db, userId: string): Promise<DeleteAccountResult> {
  let data: unknown;
  try {
    const res = await db.rpc("bayit_delete_account", { p_user: userId });
    if (res.error) {
      const msg = res.error.message ?? "";
      if (msg.includes("active_subscription")) {
        throw new DeleteAccountError("active_subscription", "cancel the subscription first", "bayit_delete_account");
      }
      // PGRST202 / 42883: the function does not exist (migration 027 not applied). Nothing was deleted.
      if (res.error.code === "PGRST202" || res.error.code === "42883") {
        throw new DeleteAccountError("not_available", "migration 027 is not applied", "bayit_delete_account");
      }
      throw new DeleteAccountError("step_failed", `bayit_delete_account: ${msg}`, "bayit_delete_account");
    }
    data = res.data;
  } catch (err) {
    if (err instanceof DeleteAccountError) throw err;
    throw new DeleteAccountError("step_failed", `bayit_delete_account: ${err instanceof Error ? err.message : String(err)}`, "bayit_delete_account");
  }

  const r = (data ?? {}) as RpcResult;
  if (r.identity_deletion_requested !== true) {
    throw new DeleteAccountError("step_failed", "bayit_delete_account returned an unexpected answer", "bayit_delete_account");
  }
  const skipped: string[] = [];
  const names = Array.isArray(r.object_names) ? (r.object_names as unknown[]).filter((u): u is string => typeof u === "string") : [];
  await removePhotos(db, names, skipped);

  const household = r.household === "left" || r.household === "deleted" || r.household === "emptied" ? r.household : "none";
  return {
    identityDeletionRequested: true,
    household,
    newOwnerId: typeof r.new_owner_id === "string" ? r.new_owner_id : null,
    keptShared: Array.isArray(r.kept_shared) ? (r.kept_shared as unknown[]).filter((x): x is string => typeof x === "string") : [],
    skipped,
  };
}
