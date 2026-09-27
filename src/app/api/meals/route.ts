import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolveHousehold } from "@/lib/meals/session";
import { ensureHouseholdMealsSeeded } from "@/lib/meals/seed";
import { rowToMeal } from "@/lib/meals/db";
import { hasConflictingKashrutTags } from "@/lib/meals/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/meals — list this household's meal rotation (seeding the default
 * ~25-meal pack on first call — requirement 2).
 */
export async function GET() {
  const supabase = await createClient();
  const session = await resolveHousehold(supabase);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  await ensureHouseholdMealsSeeded(supabase, session.householdId);

  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("household_id", session.householdId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ meals: data.map(rowToMeal) });
}

const addMealSchema = z.object({
  name: z.string().trim().min(1).max(120),
  whoEats: z.array(z.string().trim().min(1)).max(10).default([]),
  prepLeadHours: z.number().int().min(0).max(72).default(0),
  prepNote: z.string().trim().max(200).nullable().optional(),
  minRepeatDays: z.number().int().min(0).max(30).default(3),
  tags: z.array(z.string().trim().min(1)).max(10).default([]),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        quantity: z.number().positive().optional(),
        unit: z.string().trim().max(20).optional(),
      })
    )
    .max(40)
    .default([]),
});

/** POST /api/meals — add a household's own meal to the rotation. */
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
  const parsed = addMealSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "פרמטרים לא תקינים", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const body = parsed.data;

  if (hasConflictingKashrutTags(body.tags)) {
    return NextResponse.json(
      { error: "ארוחה לא יכולה להיות מתויגת גם בשרי וגם חלבי." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("meals")
    .insert({
      household_id: session.householdId,
      name: body.name,
      who_eats: body.whoEats,
      prep_lead_hours: body.prepLeadHours,
      prep_note: body.prepNote ?? null,
      min_repeat_days: body.minRepeatDays,
      tags: body.tags,
      ingredients: body.ingredients,
      active: true,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ meal: rowToMeal(data) }, { status: 201 });
}
