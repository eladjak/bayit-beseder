import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateTaskInstances, formatDate } from "@/lib/auto-scheduler";
import type { Database } from "@/lib/types/database";

/**
 * GET /api/cron/auto-schedule
 * Vercel Cron: Runs at 01:00 Israel time (22:00 UTC).
 * For each household, generates task instances for the next 7 days (rolling week).
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

  // Fetch all households (including golden_rule_target for weighted rotation)
  const { data: households, error: householdsError } = await supabase
    .from("households")
    .select("id, name, golden_rule_target");

  if (householdsError) {
    return NextResponse.json(
      { error: `Failed to fetch households: ${householdsError.message}` },
      { status: 500 }
    );
  }

  if (!households || households.length === 0) {
    return NextResponse.json({ message: "No households found" });
  }

  // Date range: today + next 6 days = rolling 7-day window
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 6);

  const results: {
    household: string;
    created: number;
    skipped: number;
    errors: string[];
  }[] = [];

  for (const household of households) {
    const scheduleResult = await generateTaskInstances(
      supabase,
      household.id,
      today,
      endDate,
      household.golden_rule_target ?? undefined
    );

    results.push({
      household: household.name,
      created: scheduleResult.created,
      skipped: scheduleResult.skipped,
      errors: scheduleResult.errors,
    });
  }

  const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  return NextResponse.json({
    success: totalErrors === 0,
    dateRange: {
      start: formatDate(today),
      end: formatDate(endDate),
    },
    totalCreated,
    totalSkipped,
    totalErrors,
    households: results,
  });
}
