import { NextRequest, NextResponse } from "next/server";
import { verifyAgentRequest } from "@/lib/agent/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/agent/prep — "מה להפשיר הערב?"
 *
 * Phase-2 meal-prep planner (the ORIGINAL pain-killer, docs/AGENT-INTERFACE.md).
 * Will answer: what to defrost/prepare TONIGHT for tomorrow's planned meal,
 * based on the `meals` rotation + `meal_plan` week (migration 015_meals.sql).
 *
 * STATUS: 501 stub (2026-07-05). Activates only after:
 *   1. Elad answers the 5-question intake → docs/MEAL-PLANNER-INTAKE.md
 *   2. Migration 015 runs (branch first, then prod)
 *   3. The rotation is seeded from his real answers
 *
 * The stub still authenticates + rate-limits so agents integrate against the
 * final contract today and simply start getting 200s when Phase 2 lands.
 */

const limiter = rateLimit({ windowMs: 60_000, max: 20 });

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

  return NextResponse.json(
    {
      status: "not_implemented",
      message:
        "מתכנן הארוחות עוד לא הופעל. חסרות 5 תשובות קצרות מאלעד (docs/MEAL-PLANNER-INTAKE.md) " +
        "כדי לזרוע את סבב הארוחות — ואז השאלה \"מה להפשיר הערב?\" תקבל תשובה אמיתית.",
      whatsappText:
        "מתכנן הארוחות כמעט מוכן! חסרות לי 5 תשובות קצרות ממך כדי להתחיל. רוצה לענות עכשיו? (2 דקות)",
      intakeDoc: "docs/MEAL-PLANNER-INTAKE.md",
      plannedContract: {
        method: "GET",
        path: "/api/agent/prep?householdId=<uuid>",
        response: {
          tonightPrep: "מה להוציא מהמקפיא/להכין הערב",
          tomorrowMeal: "הארוחה המתוכננת למחר",
          shoppingGaps: "מצרכים חסרים מול shopping_items",
          whatsappText: "טקסט מוכן לשליחה",
        },
      },
    },
    { status: 501, headers: { "Cache-Control": "no-store" } }
  );
}
