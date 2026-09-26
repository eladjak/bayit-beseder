import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { ensureHouseholdMealsSeeded } from "./seed";
import { rowToMeal } from "./db";
import { generateWeekMealPlan, type GeneratedMealDay } from "./generator";
import { weekDates, historyStartDate } from "./week";
import type { MealPlanStatus } from "./types";

/**
 * Load a household's week (meals + persisted plan), generating and
 * persisting any missing days. Shared by /api/meals/plan (session-scoped)
 * and /api/agent/prep (service-role) so both see identical behavior.
 *
 * `force`: when true, every day that isn't already `cooked` is regenerated
 * (used by "regenerate the week"); when false, only genuinely missing days
 * are filled in (the normal "load, fill gaps" path).
 */
export async function loadOrGenerateWeek(
  supabase: SupabaseClient<Database>,
  householdId: string,
  weekStartDate: Date,
  force: boolean
): Promise<{ days: GeneratedMealDay[]; weekStart: string }> {
  await ensureHouseholdMealsSeeded(supabase, householdId);

  const { data: mealRows, error: mealsError } = await supabase
    .from("meals")
    .select("*")
    .eq("household_id", householdId);
  if (mealsError) throw new Error(mealsError.message);
  const meals = (mealRows ?? []).map(rowToMeal);

  const dates = weekDates(weekStartDate);
  const weekStart = dates[0];
  const weekEnd = dates[6];

  const { data: existingRows, error: planError } = await supabase
    .from("meal_plan")
    .select("*")
    .eq("household_id", householdId)
    .gte("plan_date", weekStart)
    .lte("plan_date", weekEnd);
  if (planError) throw new Error(planError.message);

  const existingByDate: Record<string, { mealId: string | null; status: MealPlanStatus }> = {};
  for (const row of existingRows ?? []) {
    const keep = force ? row.status === "cooked" : true;
    if (keep) {
      existingByDate[row.plan_date] = { mealId: row.meal_id, status: row.status };
    }
  }

  const { data: historyRows, error: historyError } = await supabase
    .from("meal_plan")
    .select("meal_id, plan_date")
    .eq("household_id", householdId)
    .gte("plan_date", historyStartDate(weekStartDate))
    .lt("plan_date", weekStart)
    .not("meal_id", "is", null);
  if (historyError) throw new Error(historyError.message);
  const recentHistory = (historyRows ?? [])
    .filter((r) => r.meal_id)
    .map((r) => ({ meal_id: r.meal_id as string, plan_date: r.plan_date }));

  const days = generateWeekMealPlan({
    meals,
    weekStartDate,
    recentHistory,
    existingByDate,
  });

  const toUpsert = days
    .filter((d) => !existingByDate[d.date])
    .map((d) => ({
      household_id: householdId,
      meal_id: d.mealId,
      plan_date: d.date,
      status: d.status,
    }));

  if (toUpsert.length > 0) {
    const { error: upsertError } = await supabase
      .from("meal_plan")
      .upsert(toUpsert, { onConflict: "household_id,plan_date" });
    if (upsertError) throw new Error(upsertError.message);
  }

  return { days, weekStart };
}
