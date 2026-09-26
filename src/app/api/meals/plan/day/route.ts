import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolveHousehold } from "@/lib/meals/session";
import { rowToMeal } from "@/lib/meals/db";
import { suggestSwapAlternatives } from "@/lib/meals/swap";
import { shiftPlanForLeftovers } from "@/lib/meals/leftover-shift";
import { comingSunday, weekDates, historyStartDate } from "@/lib/meals/week";
import type { MealPlanStatus } from "@/lib/meals/types";

export const dynamic = "force-dynamic";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך חייב להיות בפורמט YYYY-MM-DD");

/** GET /api/meals/plan/day?date=YYYY-MM-DD — suggest 3 swap alternatives for that day. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const session = await resolveHousehold(supabase);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const date = dateSchema.safeParse(new URL(request.url).searchParams.get("date"));
  if (!date.success) {
    return NextResponse.json({ error: "date לא תקין" }, { status: 400 });
  }

  const { data: mealRows, error: mealsError } = await supabase
    .from("meals")
    .select("*")
    .eq("household_id", session.householdId)
    .eq("active", true);
  if (mealsError) return NextResponse.json({ error: mealsError.message }, { status: 500 });

  const { data: currentRow } = await supabase
    .from("meal_plan")
    .select("meal_id")
    .eq("household_id", session.householdId)
    .eq("plan_date", date.data)
    .maybeSingle();

  const weekStart = comingSunday(new Date(`${date.data}T00:00:00`));
  const { data: historyRows, error: historyError } = await supabase
    .from("meal_plan")
    .select("meal_id, plan_date")
    .eq("household_id", session.householdId)
    .gte("plan_date", historyStartDate(weekStart))
    .lt("plan_date", date.data)
    .not("meal_id", "is", null);
  if (historyError) return NextResponse.json({ error: historyError.message }, { status: 500 });

  const meals = (mealRows ?? []).map(rowToMeal);
  const recentHistory = (historyRows ?? [])
    .filter((r) => r.meal_id)
    .map((r) => ({ meal_id: r.meal_id as string, plan_date: r.plan_date }));

  const alternatives = suggestSwapAlternatives({
    meals,
    date: date.data,
    currentMealId: currentRow?.meal_id ?? null,
    recentHistory,
    count: 3,
  });

  return NextResponse.json({ date: date.data, alternatives }, { headers: { "Cache-Control": "no-store" } });
}

const patchSchema = z.object({
  date: dateSchema,
  action: z.enum(["setMeal", "cooked", "skipped", "leftovers", "note"]),
  mealId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
});

/**
 * PATCH /api/meals/plan/day — fast actions:
 *  - setMeal: swap this day's meal (mealId required, or null to clear).
 *  - cooked / skipped: mark status.
 *  - leftovers: mark status AND shift the rest of the week forward a day.
 *  - note: set/clear the per-day note without touching status.
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const session = await resolveHousehold(supabase);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = {};
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "פרמטרים לא תקינים", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { date, action, mealId, note } = parsed.data;

  if (action === "note") {
    const { error } = await supabase
      .from("meal_plan")
      .update({ note: note ?? null })
      .eq("household_id", session.householdId)
      .eq("plan_date", date);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "setMeal") {
    const { error } = await supabase
      .from("meal_plan")
      .update({ meal_id: mealId ?? null, status: "planned" as MealPlanStatus })
      .eq("household_id", session.householdId)
      .eq("plan_date", date);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "cooked" || action === "skipped") {
    const { error } = await supabase
      .from("meal_plan")
      .update({ status: action })
      .eq("household_id", session.householdId)
      .eq("plan_date", date);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // action === "leftovers" — shift the rest of the week forward.
  const weekStart = comingSunday(new Date(`${date}T00:00:00`));
  const dates = weekDates(weekStart);
  const { data: weekRows, error: weekError } = await supabase
    .from("meal_plan")
    .select("plan_date, meal_id, status")
    .eq("household_id", session.householdId)
    .in("plan_date", dates);
  if (weekError) return NextResponse.json({ error: weekError.message }, { status: 500 });

  const byDate = new Map((weekRows ?? []).map((r) => [r.plan_date, r]));
  const ordered = dates.map(
    (d) => byDate.get(d) ?? { plan_date: d, meal_id: null, status: "planned" as MealPlanStatus }
  );
  const shifted = shiftPlanForLeftovers(
    ordered.map((r) => ({ date: r.plan_date, mealId: r.meal_id, status: r.status })),
    date
  );

  const upserts = shifted.map((d) => ({
    household_id: session.householdId,
    plan_date: d.date,
    meal_id: d.mealId,
    status: d.status,
  }));
  const { error: upsertError } = await supabase
    .from("meal_plan")
    .upsert(upserts, { onConflict: "household_id,plan_date" });
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({ ok: true, shifted });
}
