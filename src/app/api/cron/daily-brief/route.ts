import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { buildMorningBrief, type DailyBriefData } from "@/lib/whatsapp-messages";
import { sendPushToAll, type PushSubscriptionData } from "@/lib/push";

/**
 * GET /api/cron/daily-brief
 * Vercel Cron: Runs at 08:00 Israel time.
 * Sends morning task brief via WhatsApp to household members.
 */
export async function GET(request: NextRequest) {
  // Verify Vercel Cron authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role for server-side queries
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const today = new Date().toISOString().slice(0, 10);

  // Get WhatsApp phone numbers from env (comma-separated)
  const phones = (process.env.WHATSAPP_PHONES ?? "").split(",").filter(Boolean);
  if (phones.length === 0) {
    return NextResponse.json({ error: "No WHATSAPP_PHONES configured" }, { status: 400 });
  }

  // Get today's tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, assigned_to, status")
    .eq("due_date", today)
    .neq("status", "completed");

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ message: "No tasks today, skipping" });
  }

  // Get profiles for assigned_to names
  const assignedIds = [...new Set(tasks.map((t) => t.assigned_to).filter(Boolean))];
  const profileMap: Record<string, string> = {};

  if (assignedIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", assignedIds);

    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = p.display_name;
      }
    }
  }

  // Get streak
  const { data: streaks } = await supabase
    .from("streaks")
    .select("current_count")
    .eq("streak_type", "daily")
    .limit(1);

  const streak = streaks?.[0]?.current_count ?? 0;

  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const dayOfWeek = days[new Date().getDay()];

  const briefData: DailyBriefData = {
    names: ["אלעד", "ענבל"],
    todayTasks: tasks.map((t) => ({
      title: t.title,
      assignedTo: t.assigned_to ? (profileMap[t.assigned_to] ?? null) : null,
    })),
    streak,
    dayOfWeek,
  };

  const message = buildMorningBrief(briefData);

  // Send to all configured phones
  const results = await Promise.all(
    phones.map((phone) => sendWhatsAppMessage(phone.trim(), message))
  );

  const failed = results.filter((r) => !r.success);

  // Also send push notifications
  let pushResult = { sent: 0, failed: 0, expired: [] as string[] };
  const { data: pushProfiles } = await supabase
    .from("profiles")
    .select("id, push_subscription")
    .not("push_subscription", "is", null);

  if (pushProfiles && pushProfiles.length > 0) {
    const subs = pushProfiles
      .map((p) => p.push_subscription as PushSubscriptionData | null)
      .filter((s): s is PushSubscriptionData => s !== null && !!s.endpoint);

    pushResult = await sendPushToAll(subs, {
      title: "בוקר טוב! ☀️",
      body: `יש לכם ${tasks.length} משימות להיום`,
      tag: "morning-brief",
      url: "/dashboard",
    });

    // Clean up expired subscriptions
    if (pushResult.expired.length > 0) {
      for (const profile of pushProfiles) {
        const sub = profile.push_subscription as PushSubscriptionData | null;
        if (sub && pushResult.expired.includes(sub.endpoint)) {
          await supabase
            .from("profiles")
            .update({ push_subscription: null })
            .eq("id", profile.id);
        }
      }
    }
  }

  return NextResponse.json({
    success: failed.length === 0,
    sent: results.length,
    failed: failed.length,
    taskCount: tasks.length,
    push: { sent: pushResult.sent, failed: pushResult.failed },
  });
}
