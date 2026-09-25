import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export type SessionResult =
  | { ok: true; userId: string; householdId: string }
  | { ok: false; status: number; error: string };

/**
 * Resolve the signed-in user's household_id via their profile row.
 * Used by every /api/meals/* route (session-scoped, RLS-enforced).
 */
export async function resolveHousehold(
  supabase: SupabaseClient<Database>
): Promise<SessionResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, status: 401, error: "יש להתחבר כדי להשתמש במתכנן הארוחות." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.household_id) {
    return { ok: false, status: 404, error: "לא נמצא בית משק בית מקושר למשתמש." };
  }

  return { ok: true, userId: user.id, householdId: profile.household_id };
}
