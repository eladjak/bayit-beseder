import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Delete one user's BayitBeSeder data, and their sign-in only when that is safe.
 *
 * THE DECISIONS LIVE IN THE DATABASE, NOT HERE.
 * The Supabase project is shared with the events app, so "is it safe to delete
 * the auth user?" has to be answered and acted on inside ONE transaction with
 * the user row locked, otherwise the other app can write between the check and
 * the delete. That is `public.bayit_delete_account(uuid)` (migration 027,
 * service role only). It:
 *   - removes this app's own rows for the user (and the household, if the user
 *     is its last member), enumerated in the migration;
 *   - deletes the profile, the default role row and the auth user ONLY if no
 *     table outside this app's list holds anything for the user (foreign keys
 *     are found from the catalog, so tables nobody listed are still seen);
 *   - otherwise KEEPS the auth user and profile and clears only this app's own
 *     profile columns;
 *   - rolls everything back if any step fails.
 * This file only calls it and then removes the stored photos it reports.
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
  /** The auth user and profile row were deleted. False when the events app still needs them. */
  authUserDeleted: boolean;
  /** What happened to the user's household. */
  household: "none" | "left" | "deleted";
  /** If the user was the owner and others remained, who became owner (id only). */
  newOwnerId: string | null;
  /** Steps that did not complete and need a human look (e.g. stored photos that could not be removed). */
  skipped: string[];
}

const PHOTO_BUCKET = "task-photos";

interface RpcResult {
  auth_user_deleted?: unknown;
  household?: unknown;
  new_owner_id?: unknown;
  photo_urls?: unknown;
  kept_because?: unknown;
}

/** Remove the stored photos behind these public URLs. Failure is reported, never silent. */
async function removePhotos(db: Db, urls: string[], skipped: string[]) {
  const names = urls
    .map((u) => u.split(`/${PHOTO_BUCKET}/`)[1]?.split("?")[0])
    .filter((n): n is string => !!n)
    .map((n) => decodeURIComponent(n));
  if (names.length === 0) return;
  try {
    const { error } = await db.storage.from(PHOTO_BUCKET).remove(names);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[delete-account] could not remove stored photos:", err instanceof Error ? err.message : err);
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
  if (typeof r.auth_user_deleted !== "boolean") {
    throw new DeleteAccountError("step_failed", "bayit_delete_account returned an unexpected answer", "bayit_delete_account");
  }
  const skipped: string[] = [];
  const photoUrls = Array.isArray(r.photo_urls) ? (r.photo_urls as unknown[]).filter((u): u is string => typeof u === "string") : [];
  await removePhotos(db, photoUrls, skipped);

  if (r.auth_user_deleted === false && Array.isArray(r.kept_because) && r.kept_because.length > 0) {
    // Table names only, no personal data: tells the operator which other-app data kept the sign-in.
    console.info("[delete-account] auth user kept because of:", (r.kept_because as unknown[]).join(", "));
  }

  const household = r.household === "left" || r.household === "deleted" ? r.household : "none";
  return {
    authUserDeleted: r.auth_user_deleted,
    household,
    newOwnerId: typeof r.new_owner_id === "string" ? r.new_owner_id : null,
    skipped,
  };
}
