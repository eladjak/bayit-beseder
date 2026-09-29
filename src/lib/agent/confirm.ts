/**
 * Two-step confirmation for the sensitive agent actions.
 *
 * Step 1 (no confirm_token): the API returns a PREVIEW of what would happen and
 * a single-use `confirm_token`. Nothing has been done.
 * Step 2 (with confirm_token): the action executes, but only if the token is
 *   - one this server issued (only its SHA-256 is stored),
 *   - issued to THIS agent token (a different token's confirm is rejected),
 *   - for THIS action and THIS target (a task id / a recipient+kind),
 *   - not older than 5 minutes,
 *   - not used before. Consumption is a conditional UPDATE, so two concurrent
 *     confirms cannot both win.
 *
 * Fails closed: if the confirmations table is unavailable (migration 024 not
 * applied) no confirm token can be issued or accepted, so no sensitive action
 * can run.
 */
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export const CONFIRM_TTL_MS = 5 * 60_000;
const CONFIRM_PREFIX = "bbs_confirm_";

export type ConfirmAction = "delete_task" | "deliver_to_me";
type Client = SupabaseClient<Database>;

export interface ConfirmBinding {
  tokenId: string;
  householdId: string;
  action: ConfirmAction;
  /** Task id, or `<what>:<recipient fingerprint>`. */
  target: string;
}

const hash = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/** Non-reversible short fingerprint of a phone number, for binding/logging. */
export function fingerprint(value: string): string {
  return hash(value.replace(/\D/g, "")).slice(0, 16);
}

export type CreateConfirmResult =
  | { ok: true; confirmToken: string; expiresAt: string; expiresInSeconds: number }
  | { ok: false; reason: "unavailable" };

export async function createConfirmation(
  supabase: Client,
  b: ConfirmBinding,
  now: Date = new Date()
): Promise<CreateConfirmResult> {
  const confirmToken = `${CONFIRM_PREFIX}${randomBytes(24).toString("hex")}`;
  const expiresAt = new Date(now.getTime() + CONFIRM_TTL_MS).toISOString();
  try {
    const { error } = await supabase.from("agent_confirmations").insert({
      confirm_hash: hash(confirmToken),
      token_id: b.tokenId,
      household_id: b.householdId,
      action: b.action,
      target: b.target,
      expires_at: expiresAt,
    });
    if (error) return { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  return { ok: true, confirmToken, expiresAt, expiresInSeconds: CONFIRM_TTL_MS / 1000 };
}

export type ConsumeReason = "invalid" | "mismatch" | "used" | "expired" | "unavailable";
export type ConsumeResult = { ok: true } | { ok: false; reason: ConsumeReason };

export const CONSUME_MESSAGES: Record<ConsumeReason, string> = {
  invalid: "קוד האישור אינו מוכר. בקשו תצוגה מקדימה חדשה.",
  mismatch: "קוד האישור אינו שייך לפעולה הזו. בקשו תצוגה מקדימה חדשה.",
  used: "קוד האישור כבר נוצל. בקשו תצוגה מקדימה חדשה.",
  expired: "קוד האישור פג תוקף (5 דקות). בקשו תצוגה מקדימה חדשה.",
  unavailable: "מנגנון האישור אינו זמין כרגע, הפעולה לא בוצעה.",
};

export async function consumeConfirmation(
  supabase: Client,
  b: ConfirmBinding,
  confirmToken: string,
  now: Date = new Date()
): Promise<ConsumeResult> {
  const confirmHash = hash(confirmToken);
  try {
    const { data: row, error } = await supabase
      .from("agent_confirmations")
      .select("token_id, household_id, action, target, expires_at, used_at")
      .eq("confirm_hash", confirmHash)
      .maybeSingle();
    if (error) return { ok: false, reason: "unavailable" };
    if (!row) return { ok: false, reason: "invalid" };

    if (
      row.token_id !== b.tokenId ||
      row.household_id !== b.householdId ||
      row.action !== b.action ||
      row.target !== b.target
    ) {
      return { ok: false, reason: "mismatch" };
    }
    if (row.used_at) return { ok: false, reason: "used" };
    if (new Date(row.expires_at as string).getTime() <= now.getTime()) {
      return { ok: false, reason: "expired" };
    }

    // Atomic single-use: only one concurrent caller gets a row back.
    const { data: won, error: updErr } = await supabase
      .from("agent_confirmations")
      .update({ used_at: now.toISOString() })
      .eq("confirm_hash", confirmHash)
      .is("used_at", null)
      .gt("expires_at", now.toISOString())
      .select("confirm_hash");
    if (updErr) return { ok: false, reason: "unavailable" };
    if (!won || won.length === 0) return { ok: false, reason: "used" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
