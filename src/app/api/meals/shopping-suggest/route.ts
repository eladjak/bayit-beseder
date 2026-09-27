import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolveHousehold } from "@/lib/meals/session";
import { rowToMeal } from "@/lib/meals/db";
import { buildWeekIngredientList, suggestShoppingItems } from "@/lib/meals/shopping";
import { comingSunday, weekDates } from "@/lib/meals/week";

export const dynamic = "force-dynamic";

/**
 * GET /api/meals/shopping-suggest?weekStart=YYYY-MM-DD
 *
 * "הוסף מצרכים לרשימה" step 1: compute SUGGESTED items for the week,
 * de-duplicated against the household's currently open (unchecked) shopping
 * list. Nothing is written here — the user confirms via POST.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const session = await resolveHousehold(supabase);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { searchParams } = new URL(request.url);
  const weekStartParam = searchParams.get("weekStart");
  const weekStartDate = weekStartParam
    ? comingSunday(new Date(`${weekStartParam}T00:00:00`))
    : comingSunday(new Date());
  const dates = weekDates(weekStartDate);

  const [{ data: planRows, error: planError }, { data: mealRows, error: mealsError }, { data: shoppingRows, error: shoppingError }] =
    await Promise.all([
      supabase
        .from("meal_plan")
        .select("meal_id, status")
        .eq("household_id", session.householdId)
        .in("plan_date", dates),
      supabase.from("meals").select("*").eq("household_id", session.householdId),
      supabase
        .from("shopping_items")
        .select("title")
        .eq("household_id", session.householdId)
        .eq("checked", false),
    ]);

  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 });
  if (mealsError) return NextResponse.json({ error: mealsError.message }, { status: 500 });
  if (shoppingError) return NextResponse.json({ error: shoppingError.message }, { status: 500 });

  const meals = (mealRows ?? []).map(rowToMeal);
  const weekIngredients = buildWeekIngredientList(planRows ?? [], meals);
  const existingTitles = (shoppingRows ?? []).map((r) => r.title);
  const suggestions = suggestShoppingItems(weekIngredients, existingTitles);

  return NextResponse.json(
    { weekStart: dates[0], suggestions },
    { headers: { "Cache-Control": "no-store" } }
  );
}

const confirmSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        quantity: z.number().positive().optional(),
        unit: z.string().trim().max(20).optional(),
      })
    )
    .min(1)
    .max(50),
});

/** POST /api/meals/shopping-suggest — confirm a subset of suggestions onto the real shopping list. */
export async function POST(request: NextRequest) {
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
  const parsed = confirmSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "פרמטרים לא תקינים" }, { status: 400 });
  }

  // Re-check dedupe right before inserting (avoids a race with a concurrent add).
  const { data: shoppingRows, error: shoppingError } = await supabase
    .from("shopping_items")
    .select("title")
    .eq("household_id", session.householdId)
    .eq("checked", false);
  if (shoppingError) return NextResponse.json({ error: shoppingError.message }, { status: 500 });

  const existing = new Set(
    (shoppingRows ?? []).map((r) => r.title.trim().replace(/\s+/g, " ").toLowerCase())
  );

  const toInsert = parsed.data.items
    .filter((item) => !existing.has(item.title.trim().replace(/\s+/g, " ").toLowerCase()))
    .map((item) => ({
      household_id: session.householdId,
      title: item.title,
      quantity: item.quantity ? Math.round(item.quantity) : 1,
      unit: item.unit ?? null,
      category: "מזון",
      checked: false,
      added_by: session.userId,
    }));

  if (toInsert.length === 0) {
    return NextResponse.json({ ok: true, added: 0 });
  }

  const { error: insertError } = await supabase.from("shopping_items").insert(toInsert);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ ok: true, added: toInsert.length });
}
