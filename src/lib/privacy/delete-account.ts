import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Delete one user's account and personal data.
 *
 * SAFETY MODEL
 *  - Every statement is scoped by `userId` (or by the household that the user
 *    is the LAST member of). The id comes from the verified session in the
 *    route, never from the request body.
 *  - The Supabase project is shared with another app (the events app,
 *    "kidushishi"): `profiles` and the auth user are shared. If the user also
 *    is really used by the events app (an elevated role, or rows of its own
 *    such as assignments, notifications, messages) we only scrub the Bayit
 *    fields and KEEP the profile row and the auth user. We never delete
 *    another app's access.
 *    NOTE: measured 10.11.2026: a database trigger gives EVERY new sign-up a
 *    default `youth_volunteer` row in `user_roles`, so the mere existence of a
 *    row proves nothing. Only a different role, or other rows, count.
 *  - Re-runnable: every step is a no-op when there is nothing left to delete,
 *    so a failed run can simply be tried again. The auth user goes last.
 *  - A paid subscription that is still billing blocks deletion (otherwise
 *    the card would keep being charged for an account that no longer exists).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export class DeleteAccountError extends Error {
  constructor(
    public readonly code: "active_subscription" | "step_failed",
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
  /** Steps skipped because the table or column does not exist in this database. */
  skipped: string[];
}

// Postgres / PostgREST codes for "table or column does not exist".
const MISSING = new Set(["42P01", "42703", "PGRST205", "PGRST204", "PGRST200"]);

interface Ctx {
  db: Db;
  skipped: string[];
}

interface Res {
  data?: unknown;
  error: { code?: string; message: string } | null;
}

async function step(ctx: Ctx, name: string, run: PromiseLike<Res>): Promise<Res> {
  const res = await run;
  if (res.error) {
    if (res.error.code && MISSING.has(res.error.code)) {
      ctx.skipped.push(name);
      return { data: null, error: null };
    }
    throw new DeleteAccountError("step_failed", `${name}: ${res.error.message}`, name);
  }
  return res;
}

const PHOTO_BUCKET = "task-photos";

/** Remove the stored photos behind these public URLs. Failure is reported, never silent. */
async function removePhotos(ctx: Ctx, urls: (string | null)[]) {
  const names = urls
    .map((u) => (u ? u.split(`/${PHOTO_BUCKET}/`)[1]?.split("?")[0] : undefined))
    .filter((n): n is string => !!n)
    .map((n) => decodeURIComponent(n));
  if (names.length === 0) return;
  const { error } = await ctx.db.storage.from(PHOTO_BUCKET).remove(names);
  if (error) {
    console.error("[delete-account] could not remove stored photos:", error.message);
    ctx.skipped.push("storage.task-photos");
  }
}

/** The role every new account gets automatically from the events app's trigger. */
const DEFAULT_EVENTS_ROLE = "youth_volunteer";

/** [table, column] pairs where a row means the events app has its own data about this user. */
const EVENTS_APP_FOOTPRINT: [string, string][] = [
  ["event_assignments", "user_id"],
  ["notifications", "user_id"],
  ["messages", "sender_id"],
  ["events", "created_by"],
  ["audit_logs", "user_id"],
];

async function usedByEventsApp(ctx: Ctx, userId: string): Promise<boolean> {
  const roles = await step(ctx, "user_roles.check", ctx.db.from("user_roles").select("role").eq("user_id", userId));
  const elevated = ((roles.data as { role: string }[] | null) ?? []).some((r) => r.role !== DEFAULT_EVENTS_ROLE);
  if (elevated) return true;
  for (const [table, col] of EVENTS_APP_FOOTPRINT) {
    const res = await step(ctx, `${table}.footprint`, ctx.db.from(table).select(col).eq(col, userId).limit(1));
    if (((res.data as unknown[] | null) ?? []).length > 0) return true;
  }
  return false;
}

/** Tables keyed by a household id, children first (FK-safe order). */
const HOUSEHOLD_TABLES = [
  "meal_plan",
  "meals",
  "shopping_items",
  "task_instances",
  "task_templates",
  "streaks",
  "love_tokens",
  "wheel_spins",
  "surprise_box_opens",
  "user_medals",
  "coaching_events",
  "weekly_syncs",
  "agent_confirmations",
  "agent_audit_log",
  "household_agent_tokens",
  "subscriptions",
] as const;

async function deleteHouseholdCompletely(ctx: Ctx, householdId: string) {
  const { db } = ctx;
  // Tasks and the rows that point at them.
  const tasks = await step(ctx, "tasks.select", db.from("tasks").select("id").eq("household_id", householdId));
  const taskIds = ((tasks.data as { id: string }[] | null) ?? []).map((t) => t.id);
  for (let i = 0; i < taskIds.length; i += 100) {
    const chunk = taskIds.slice(i, i + 100);
    const photos = await step(ctx, "task_completions.photos", db.from("task_completions").select("photo_url").in("task_id", chunk).not("photo_url", "is", null));
    await removePhotos(ctx, ((photos.data as { photo_url: string | null }[] | null) ?? []).map((p) => p.photo_url));
    await step(ctx, "task_completions", db.from("task_completions").delete().in("task_id", chunk));
    await step(ctx, "whatsapp_webhook_events", db.from("whatsapp_webhook_events").delete().in("task_id", chunk));
  }
  await step(ctx, "tasks", db.from("tasks").delete().eq("household_id", householdId));
  for (const table of HOUSEHOLD_TABLES) {
    await step(ctx, table, db.from(table).delete().eq("household_id", householdId));
  }
  await step(ctx, "household_members", db.from("household_members").delete().eq("household_id", householdId));
}

export async function deleteAccount(db: Db, userId: string): Promise<DeleteAccountResult> {
  const ctx: Ctx = { db, skipped: [] };

  // 0. A subscription that is still billing must be cancelled first.
  const subs = await step(
    ctx,
    "subscriptions.check",
    db.from("subscriptions").select("status").eq("user_id", userId).in("status", ["active", "past_due"]).limit(1),
  );
  if (((subs.data as unknown[] | null) ?? []).length > 0) {
    throw new DeleteAccountError("active_subscription", "cancel the subscription first", "subscriptions.check");
  }

  // 1. Who is in my household?
  const prof = await step(ctx, "profiles.select", db.from("profiles").select("household_id").eq("id", userId).maybeSingle());
  const mem = await step(
    ctx,
    "household_members.select",
    db.from("household_members").select("household_id").eq("user_id", userId),
  );
  const householdIds = new Set<string>();
  const profHousehold = (prof.data as { household_id: string | null } | null)?.household_id;
  if (profHousehold) householdIds.add(profHousehold);
  for (const m of (mem.data as { household_id: string }[] | null) ?? []) householdIds.add(m.household_id);

  let household: DeleteAccountResult["household"] = "none";
  let newOwnerId: string | null = null;

  for (const householdId of householdIds) {
    const others = await step(
      ctx,
      "household_members.others",
      db
        .from("household_members")
        .select("user_id, role, joined_at")
        .eq("household_id", householdId)
        .neq("user_id", userId)
        .order("joined_at", { ascending: true }),
    );
    const otherProfiles = await step(
      ctx,
      "profiles.others",
      db.from("profiles").select("id").eq("household_id", householdId).neq("id", userId).limit(1),
    );
    const otherMembers = (others.data as { user_id: string; role: string }[] | null) ?? [];
    const anyoneElse = otherMembers.length > 0 || ((otherProfiles.data as unknown[] | null) ?? []).length > 0;

    if (!anyoneElse) {
      // I am the last one: the household goes with me.
      await step(ctx, "profiles.detach", db.from("profiles").update({ household_id: null }).eq("id", userId));
      await deleteHouseholdCompletely(ctx, householdId);
      await step(ctx, "households", db.from("households").delete().eq("id", householdId));
      household = "deleted";
      continue;
    }

    // Others remain: hand over ownership if needed, then leave.
    if (!otherMembers.some((m) => m.role === "owner")) {
      const next = otherMembers[0];
      if (next) {
        await step(
          ctx,
          "household_members.promote",
          db.from("household_members").update({ role: "owner" }).eq("household_id", householdId).eq("user_id", next.user_id),
        );
        newOwnerId = next.user_id;
      }
    }
    // Shared records stay with the household but no longer point at me.
    await step(ctx, "tasks.unassign", db.from("tasks").update({ assigned_to: null }).eq("household_id", householdId).eq("assigned_to", userId));
    await step(ctx, "task_instances.unassign", db.from("task_instances").update({ assigned_to: null }).eq("household_id", householdId).eq("assigned_to", userId));
    await step(ctx, "task_instances.completed_by", db.from("task_instances").update({ completed_by: null }).eq("household_id", householdId).eq("completed_by", userId));
    await step(ctx, "shopping_items.added_by", db.from("shopping_items").update({ added_by: null }).eq("household_id", householdId).eq("added_by", userId));
    await step(ctx, "agent_audit_log.actor", db.from("agent_audit_log").update({ actor_user_id: null }).eq("household_id", householdId).eq("actor_user_id", userId));
    // Access tokens I created for assistants stop working.
    await step(
      ctx,
      "household_agent_tokens.revoke",
      db.from("household_agent_tokens").update({ revoked_at: new Date().toISOString(), created_by: null }).eq("household_id", householdId).eq("created_by", userId),
    );
    await step(ctx, "household_members.leave", db.from("household_members").delete().eq("household_id", householdId).eq("user_id", userId));
    if (household !== "deleted") household = "left";
  }

  // 2. My personal records, in any household.
  await step(ctx, "love_tokens.sent", db.from("love_tokens").delete().eq("sender_id", userId));
  await step(ctx, "love_tokens.received", db.from("love_tokens").delete().eq("recipient_id", userId));
  await step(ctx, "wheel_spins", db.from("wheel_spins").delete().eq("spun_by_user_id", userId));
  await step(ctx, "wheel_spins.redeemed", db.from("wheel_spins").update({ redeemed_by_user_id: null }).eq("redeemed_by_user_id", userId));
  await step(ctx, "surprise_box_opens", db.from("surprise_box_opens").delete().eq("user_id", userId));
  await step(ctx, "user_medals", db.from("user_medals").delete().eq("user_id", userId));
  await step(ctx, "user_achievements", db.from("user_achievements").delete().eq("user_id", userId));
  await step(ctx, "streaks", db.from("streaks").delete().eq("user_id", userId));
  const myPhotos = await step(ctx, "task_completions.myphotos", db.from("task_completions").select("photo_url").eq("user_id", userId).not("photo_url", "is", null));
  await removePhotos(ctx, ((myPhotos.data as { photo_url: string | null }[] | null) ?? []).map((p) => p.photo_url));
  await step(ctx, "task_completions.mine", db.from("task_completions").delete().eq("user_id", userId));
  await step(ctx, "coaching_events.mine", db.from("coaching_events").delete().eq("user_id", userId));
  await step(ctx, "weekly_syncs.mine", db.from("weekly_syncs").delete().eq("created_by", userId));
  await step(ctx, "app_feedback", db.from("app_feedback").delete().eq("user_id", userId));
  await step(ctx, "subscriptions.mine", db.from("subscriptions").delete().eq("user_id", userId));
  await step(ctx, "privacy_consents", db.from("privacy_consents").delete().eq("user_id", userId));

  // 3. Profile and sign-in. The events app shares both.
  const usedByOtherApp = await usedByEventsApp(ctx, userId);

  if (usedByOtherApp) {
    await step(
      ctx,
      "profiles.scrub",
      db
        .from("profiles")
        .update({
          household_id: null,
          points: 0,
          streak: 0,
          push_subscription: null,
          notification_preferences: null,
          google_calendar_tokens: null,
          google_calendar_id: null,
          whatsapp_phone: null,
        })
        .eq("id", userId),
    );
    return { authUserDeleted: false, household, newOwnerId, skipped: ctx.skipped };
  }

  // The automatic default role row belongs to this person alone; remove it so the auth user can go.
  await step(ctx, "user_roles.default", db.from("user_roles").delete().eq("user_id", userId).eq("role", DEFAULT_EVENTS_ROLE));
  await step(ctx, "profiles", db.from("profiles").delete().eq("id", userId));
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw new DeleteAccountError("step_failed", `auth.deleteUser: ${error.message}`, "auth.deleteUser");

  return { authUserDeleted: true, household, newOwnerId, skipped: ctx.skipped };
}
