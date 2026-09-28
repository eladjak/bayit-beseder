import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runNightlyPlannerForHouseholds, formatDate, getTodayInIsrael } from "@/lib/auto-scheduler";
import type { Database } from "@/lib/types/database";

/**
 * GET /api/cron/auto-schedule
 * Vercel Cron: Runs at 01:00 Israel time (22:00 UTC).
 *
 * For each household, rolls overdue undone tasks (status "pending" or
 * "in_progress", due_date before today) forward to today's Israel date.
 * See src/lib/auto-scheduler.ts for why this replaced the old
 * template->instance generator and why this is the behavior the production
 * data actually supports.
 */
export async function GET(request: NextRequest) {
  // Verify Vercel Cron authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

  // Fetch all households
  const { data: households, error: householdsError } = await supabase
    .from("households")
    .select("id");

  if (householdsError) {
    return NextResponse.json(
      { error: `Failed to fetch households: ${householdsError.message}` },
      { status: 500 }
    );
  }

  if (!households || households.length === 0) {
    console.log("[auto-schedule] households=0 tasksRolledOver=0 errors=0");
    return NextResponse.json({ message: "No households found" });
  }

  // Israel's calendar day, not the server's UTC day -- see
  // getTodayInIsrael()'s doc comment for the bug this avoids (the cron
  // fires at 22:00 UTC, already past midnight in Israel).
  const today = getTodayInIsrael();

  const { results, summary } = await runNightlyPlannerForHouseholds(
    supabase,
    households.map((h) => h.id),
    today
  );

  // One-line summary: counts only, never household names, task titles, or
  // user ids -- see rules/how-elad-gets-told + the agent brief for this
  // task ("log a one-line summary ... without personal data").
  console.log(
    `[auto-schedule] households=${summary.householdsProcessed} tasksRolledOver=${summary.tasksRolledOver} errors=${summary.errors.length}`
  );

  return NextResponse.json({
    success: summary.errors.length === 0,
    date: formatDate(today),
    householdsProcessed: summary.householdsProcessed,
    tasksRolledOver: summary.tasksRolledOver,
    errors: summary.errors,
    results,
  });
}
