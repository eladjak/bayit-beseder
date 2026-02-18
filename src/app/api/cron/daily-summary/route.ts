import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import {
  buildEveningSummary,
  buildFridayCelebration,
  type DailySummaryData,
} from "@/lib/whatsapp-messages";

/**
 * GET /api/cron/daily-summary
 * Vercel Cron: Runs at 20:00 Israel time.
 * Sends evening summary via WhatsApp. On Fridays, also sends weekly celebration.
 */
export async function GET(request: NextRequest) {
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

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const today = new Date().toISOString().slice(0, 10);
  const isFriday = new Date().getDay() === 5;

  const phones = (process.env.WHATSAPP_PHONES ?? "").split(",").filter(Boolean);
  if (phones.length === 0) {
    return NextResponse.json({ error: "No WHATSAPP_PHONES configured" }, { status: 400 });
  }

  // Get today's tasks with completion status
  const { data: allTasks } = await supabase
    .from("tasks")
    .select("title, status, assigned_to")
    .eq("due_date", today);

  if (!allTasks || allTasks.length === 0) {
    return NextResponse.json({ message: "No tasks today, skipping" });
  }

  const completed = allTasks.filter((t) => t.status === "completed");
  const remaining = allTasks.filter((t) => t.status !== "completed");

  // Get streak
  const { data: streaks } = await supabase
    .from("streaks")
    .select("current_count")
    .eq("streak_type", "daily")
    .limit(1);

  const streak = streaks?.[0]?.current_count ?? 0;

  const summaryData: DailySummaryData = {
    names: ["אלעד", "ענבל"],
    completedCount: completed.length,
    totalCount: allTasks.length,
    completedTasks: completed.map((t) => t.title),
    remainingTasks: remaining.map((t) => t.title),
    streak,
    topPerformer: null, // "We" framing - no individual scores
  };

  const message = buildEveningSummary(summaryData);

  // Send daily summary
  const results = await Promise.all(
    phones.map((phone) => sendWhatsAppMessage(phone.trim(), message))
  );

  // On Fridays, also send weekly celebration
  if (isFriday) {
    // Get this week's tasks
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const { data: weekTasks } = await supabase
      .from("tasks")
      .select("status")
      .gte("due_date", weekStartStr)
      .lte("due_date", today);

    if (weekTasks && weekTasks.length > 0) {
      const weekCompleted = weekTasks.filter((t) => t.status === "completed").length;
      const fridayMsg = buildFridayCelebration(weekCompleted, weekTasks.length, streak);

      await Promise.all(
        phones.map((phone) => sendWhatsAppMessage(phone.trim(), fridayMsg))
      );
    }
  }

  const failed = results.filter((r) => !r.success);

  return NextResponse.json({
    success: failed.length === 0,
    sent: results.length,
    failed: failed.length,
    completedCount: completed.length,
    totalCount: allTasks.length,
    isFriday,
  });
}
