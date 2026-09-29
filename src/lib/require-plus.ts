/**
 * Server-side Plus-tier gate for API routes that back a gated feature
 * (AI coaching tip, coaching insights, ...). UI-only gating (useSubscription
 * in the client) is not enforcement — anyone can call the API directly and
 * skip the UI entirely, so the real check has to live here too.
 *
 * Reads via the request-scoped Supabase client (respects RLS —
 * subscriptions_select_own in 022_billing.sql lets a household member read
 * their own household's row), so no service-role key is needed just to check.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PlusCheckResult {
  allowed: boolean;
  householdId: string | null;
}

export async function requirePlus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
): Promise<PlusCheckResult> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", userId)
    .single();

  const householdId = (profile?.household_id as string | undefined) ?? null;
  if (!householdId) return { allowed: false, householdId: null };

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("household_id", householdId)
    .eq("status", "active")
    .maybeSingle();

  return { allowed: sub?.tier === "plus", householdId };
}
