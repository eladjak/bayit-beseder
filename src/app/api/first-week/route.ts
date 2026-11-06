import { recipeId } from "@/lib/first-week/recipe-id";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveHousehold } from "@/lib/meals/session";
import { RECIPES } from "@/lib/first-week/plan";
import { weekDates } from "@/lib/meals/week";

export async function POST(request: Request) {
  const supabase = await createClient();
  const session = await resolveHousehold(supabase);
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: session.status });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "הטיוטה אינה תקינה" }, { status: 400 });
  const { week, servings, weekStart } = body as { week: unknown; servings: unknown; weekStart: unknown };
  if (!Array.isArray(week) || week.length !== 7 || !week.every(i => Number.isInteger(i) && i >= 0 && i < RECIPES.length) || typeof servings !== "number" || !Number.isInteger(servings) || servings < 1 || servings > 4 || typeof weekStart !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return NextResponse.json({ error: "הטיוטה אינה תקינה" }, { status: 400 });
  const date = new Date(`${weekStart}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== weekStart || date.getUTCDay() !== 0) return NextResponse.json({ error: "תאריך השבוע אינו תקין" }, { status: 400 });
  const unique = [...new Set(week)];
  const meals = unique.map(index => ({ id: recipeId(session.householdId, index, servings), household_id: session.householdId, name: RECIPES[index].name, who_eats: [], prep_lead_hours: 0, min_repeat_days: 3, tags: ["parve"], ingredients: RECIPES[index].ingredients.map(i => ({ name: i.name, quantity: i.quantity * servings, unit: i.unit })), active: true }));
  const { error: mealError } = await supabase.from("meals").upsert(meals, { onConflict: "id", ignoreDuplicates: true });
  if (mealError) return NextResponse.json({ error: "לא הצלחנו לשמור את הארוחות. אפשר לנסות שוב." }, { status: 500 });
  const dates = weekDates(new Date(`${weekStart}T12:00:00`));
  const rows = dates.map((plan_date, i) => ({ household_id: session.householdId, plan_date, meal_id: recipeId(session.householdId, week[i], servings), status: "planned" as const }));
  const { error: planError } = await supabase.from("meal_plan").upsert(rows, { onConflict: "household_id,plan_date", ignoreDuplicates: true });
  if (planError) return NextResponse.json({ error: "השבוע לא נשמר במלואו. אפשר לנסות שוב בבטחה." }, { status: 500 });
  const { data, error } = await supabase.from("meal_plan").select("plan_date, meal_id").eq("household_id", session.householdId).in("plan_date", dates);
  if (error) return NextResponse.json({ error: "לא הצלחנו לאמת את השמירה. אפשר לנסות שוב בבטחה." }, { status: 500 });
  if (!data || data.length !== 7) return NextResponse.json({ error: "לא הצלחנו לאמת את כל ימי השבוע. אפשר לנסות שוב בבטחה." }, { status: 500 });
  const match = rows.filter(row => data?.some(saved => saved.plan_date === row.plan_date && saved.meal_id === row.meal_id)).length;
  return NextResponse.json({ matched: match, preserved: 7 - match });
}
