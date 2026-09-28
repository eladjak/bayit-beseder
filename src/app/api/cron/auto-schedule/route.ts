import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runNightlyPlannerForHouseholds, formatDate, getTodayInIsrael } from "@/lib/auto-scheduler";
import type { Database } from "@/lib/types/database";

/**
 * GET /api/cron/auto-schedule
 * Vercel Cron: Runs at 01:00 Israel time (22:00 UTC).
 *
 * "Gentle rollover" (Elad's decision, Sept 2026): for each household,
 * undone tasks (status "pending"/"in_progress") overdue 1-14 days are
 * rolled forward, capped at 5 new due-dates per day per assignee
 * (unassigned tasks share one household-wide cap of 5/day) -- the rest
 * spread over the following days, oldest due_date first. Tasks overdue
 * MORE than 14 days are never moved; they're flagged for review instead
 * (flagged_for_review_at) so a person decides what to do with them.
 *
 * NOTE: the review-flag path needs migration 023
 * (supabase/migrations/023_task_review_flag.sql), which is NOT applied to
 * production yet -- see that file. Until it is, this route's flagging step
 * will fail for any household that actually has a >14-day-overdue task
 * (the rollover step for 1-14-day tasks is unaffected, since it never
 * touches that column).
 *
 * See src/lib/auto-scheduler.ts for the full history and reasoning.
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
    console.log(
      "[auto-schedule] households=0 movedToday=0 movedLater=0 flaggedForReview=0 errors=0"
    );
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
    `[auto-schedule] households=${summary.householdsProcessed} movedToday=${summary.tasksMovedToday} movedLater=${summary.tasksMovedLater} flaggedForReview=${summary.tasksFlaggedForReview} errors=${summary.errors.length}`
  );

  return NextResponse.json({
    success: summary.errors.length === 0,
    date: formatDate(today),
    householdsProcessed: summary.householdsProcessed,
    tasksMovedToday: summary.tasksMovedToday,
    tasksMovedLater: summary.tasksMovedLater,
    tasksFlaggedForReview: summary.tasksFlaggedForReview,
    errors: summary.errors,
    results,
  });
}
