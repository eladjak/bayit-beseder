import type { SupabaseClient } from "@supabase/supabase-js";
import { MEAL_SEED_PACK } from "./seed-data";

/**
 * Seed the default ~25-meal rotation for a household, but ONLY if it has no
 * meals yet (requirement 2: "applied per new household on first use, not
 * global rows"). Safe to call on every page load / prep request — it's a
 * no-op once a household has at least one meal row.
 */
export async function ensureHouseholdMealsSeeded(
  // Typed loosely (any Supabase client — service-role or session) so both the
  // agent routes and the UI-facing routes can call it.
  supabase: SupabaseClient,
  householdId: string
): Promise<{ seeded: boolean; count: number }> {
  const { count, error: countError } = await supabase
    .from("meals")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId);

  if (countError) {
    throw new Error(`seed check failed: ${countError.message}`);
  }

  if ((count ?? 0) > 0) {
    return { seeded: false, count: count ?? 0 };
  }

  const rows = MEAL_SEED_PACK.map((m) => ({
    household_id: householdId,
    name: m.name,
    who_eats: m.who_eats,
    prep_lead_hours: m.prep_lead_hours,
    prep_note: m.prep_note,
    min_repeat_days: m.min_repeat_days,
    tags: m.tags,
    ingredients: m.ingredients,
    active: true,
  }));

  const { error: insertError } = await supabase.from("meals").insert(rows);
  if (insertError) {
    throw new Error(`seed insert failed: ${insertError.message}`);
  }

  return { seeded: true, count: rows.length };
}
