import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { verifyAgentRequest } from "@/lib/agent/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { loadOrGenerateWeek } from "@/lib/meals/plan-service";
import { rowToMeal } from "@/lib/meals/db";
import { computeTonightPrep } from "@/lib/meals/defrost";
import { comingSunday } from "@/lib/meals/week";
import { maybeDeliverToOwner } from "@/lib/agent/deliver";

/**
 * GET /api/agent/prep?householdId=<uuid> — "מה להפשיר הערב?"
 *
 * Meal-prep planner (requirement 5, docs/AGENT-INTERFACE.md). Answers what to
 * defrost/prepare TONIGHT for the next 36h of planned meals (migration
 * 015_meals.sql), computed in Asia/Jerusalem, DST-correct.
 *
 * No intake was required — Elad said "תתחיל מברירת מחדל": households are
 * seeded with a default ~25-meal rotation on first use.
 *
 * Auth: Bearer BAYIT_AGENT_KEY. Rate-limited per IP.
 */

const limiter = rateLimit({ windowMs: 60_000, max: 20 });

const querySchema = z.object({
  householdId: z.string().uuid(),
  deliver: z.literal("whatsapp").optional(),
});

export async function GET(request: NextRequest) {
  const auth = verifyAgentRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rl = await limiter.check(getClientIp(request));
  if (!rl.success) {
    return NextResponse.json(
      { error: "יותר מדי בקשות. נסו שוב עוד דקה." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.reset / 1000)) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    householdId: searchParams.get("householdId") ?? undefined,
    deliver: searchParams.get("deliver") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "חסר או שגוי householdId. שימוש: /api/agent/prep?householdId=<uuid>" },
      { status: 400 }
    );
  }
  const { householdId, deliver } = parsed.data;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "השרת אינו מוגדר (חסר SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }
  const supabase = createClient<Database>(supabaseUrl, serviceKey);

  try {
    const now = new Date();
    const todayWeek = await loadOrGenerateWeek(supabase, householdId, comingSunday(now), false);

    // A meal near next week's Sunday could still fall in the next 36h
    // (e.g. calling on a Saturday evening) — make sure tomorrow's row exists
    // even if it belongs to the following generated week.
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = await loadOrGenerateWeek(
      supabase,
      householdId,
      comingSunday(tomorrow),
      false
    );

    const daysByDate = new Map<string, { plan_date: string; meal_id: string | null; status: string }>();
    for (const d of [...todayWeek.days, ...nextWeek.days]) {
      daysByDate.set(d.date, { plan_date: d.date, meal_id: d.mealId, status: d.status });
    }

    const { data: mealRows, error: mealsError } = await supabase
      .from("meals")
      .select("*")
      .eq("household_id", householdId);
    if (mealsError) {
      return NextResponse.json({ error: mealsError.message }, { status: 500 });
    }
    const meals = (mealRows ?? []).map(rowToMeal);

    const relevantDays = [...daysByDate.values()].map((d) => ({
      plan_date: d.plan_date,
      meal_id: d.meal_id,
      status: d.status as "planned" | "prepped" | "cooked" | "skipped" | "leftovers",
    }));

    const { items, whatsappText } = computeTonightPrep({ now, days: relevantDays, meals });

    const tomorrowMeal = daysByDate.get(
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(tomorrow)
    );
    const tomorrowMealName = tomorrowMeal?.meal_id
      ? (meals.find((m) => m.id === tomorrowMeal.meal_id)?.name ?? null)
      : null;

    const delivery = await maybeDeliverToOwner(deliver, whatsappText);

    return NextResponse.json(
      {
        tonightPrep: items,
        tomorrowMeal: tomorrowMealName,
        whatsappText,
        delivery,
        meta: { householdId, generatedAt: now.toISOString() },
      },
      { headers: { "Cache-Control": "no-store", "X-RateLimit-Remaining": String(rl.remaining) } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בחישוב תזכורת ההפשרה" },
      { status: 500 }
    );
  }
}
