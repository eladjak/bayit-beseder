/**
 * Love Tokens — Quick Love button mechanic (Alopik v2 #1).
 *
 * Bidirectional micro-recognition between household members.
 * Rate-limited per sender→recipient to preserve meaning.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md (commit b0f7561)
 * Schema: supabase/migrations/012_alopik_v2.sql
 */

import { createClient } from "@/lib/supabase";

// NOTE: Tables (love_tokens) + RPC (count_love_tokens_today) added in
// migration 012 but Database type regen not yet run. Cast supabase client
// to bypass stale types until `bunx supabase gen types` is run post-deploy.
// Spec: docs/ALOPIK-INTEGRATION-SPEC.md
type AnySupabase = ReturnType<typeof createClient> & { from: (t: string) => any; rpc: (n: string, a?: any) => any };

export const DAILY_SEND_LIMIT = 6;
export const PRESET_VALUES = [1, 3, 5, 10] as const;
export const MAX_VALUE = 100;
export const MAX_MESSAGE_LEN = 200;

export type LoveTokenInput = {
  readonly recipientId: string;
  readonly value: number;
  readonly message?: string;
};

export type LoveToken = {
  readonly id: string;
  readonly householdId: string;
  readonly senderId: string;
  readonly recipientId: string;
  readonly value: number;
  readonly message: string | null;
  readonly sentAt: string;
  readonly readAt: string | null;
};

export type SendResult =
  | { ok: true; token: LoveToken }
  | { ok: false; error: "RATE_LIMIT_EXCEEDED" | "INVALID_INPUT" | "NOT_HOUSEHOLD_MEMBER" | "DB_ERROR"; details?: string };

const validateInput = (input: LoveTokenInput): { ok: true } | { ok: false; reason: string } => {
  if (!input.recipientId) return { ok: false, reason: "missing recipientId" };
  if (!Number.isInteger(input.value) || input.value <= 0 || input.value > MAX_VALUE) {
    return { ok: false, reason: `value must be integer 1..${MAX_VALUE}` };
  }
  if (input.message != null && input.message.length > MAX_MESSAGE_LEN) {
    return { ok: false, reason: `message must be ≤${MAX_MESSAGE_LEN} chars` };
  }
  return { ok: true };
};

export async function sendLoveToken(input: LoveTokenInput): Promise<SendResult> {
  const validation = validateInput(input);
  if (!validation.ok) return { ok: false, error: "INVALID_INPUT", details: validation.reason };

  const supabase = createClient() as AnySupabase;
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "NOT_HOUSEHOLD_MEMBER", details: "no auth" };

  // Self-send guard (DB also enforces via CHECK constraint)
  if (input.recipientId === userData.user.id) {
    return { ok: false, error: "INVALID_INPUT", details: "cannot send to self" };
  }

  // Rate-limit check via DB helper function (timezone-aware Asia/Jerusalem)
  const { data: countData, error: countErr } = await supabase.rpc("count_love_tokens_today", {
    p_sender_id: userData.user.id,
    p_recipient_id: input.recipientId,
  });
  if (countErr) return { ok: false, error: "DB_ERROR", details: countErr.message };
  const sentToday = (countData as number | null) ?? 0;
  if (sentToday >= DAILY_SEND_LIMIT) {
    return { ok: false, error: "RATE_LIMIT_EXCEEDED", details: `already sent ${sentToday}/${DAILY_SEND_LIMIT} today` };
  }

  // Fetch sender's household_id (RLS will enforce match)
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", userData.user.id)
    .single();
  if (profileErr || !profile?.household_id) {
    return { ok: false, error: "NOT_HOUSEHOLD_MEMBER", details: profileErr?.message ?? "no household" };
  }

  const { data, error } = await supabase
    .from("love_tokens")
    .insert({
      household_id: profile.household_id,
      sender_id: userData.user.id,
      recipient_id: input.recipientId,
      value: input.value,
      message: input.message ?? null,
    })
    .select()
    .single();

  if (error || !data) return { ok: false, error: "DB_ERROR", details: error?.message };

  return {
    ok: true,
    token: {
      id: data.id,
      householdId: data.household_id,
      senderId: data.sender_id,
      recipientId: data.recipient_id,
      value: data.value,
      message: data.message,
      sentAt: data.sent_at,
      readAt: data.read_at,
    },
  };
}

export async function getRemainingSendsToday(recipientId: string): Promise<number> {
  const supabase = createClient() as AnySupabase;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return 0;
  const { data, error } = await supabase.rpc("count_love_tokens_today", {
    p_sender_id: userData.user.id,
    p_recipient_id: recipientId,
  });
  if (error) return 0;
  const sent = (data as number | null) ?? 0;
  return Math.max(0, DAILY_SEND_LIMIT - sent);
}
