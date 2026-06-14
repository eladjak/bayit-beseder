import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { verifyAgentRequest } from "@/lib/agent/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { buildMorningBrief, type DailyBriefData } from "@/lib/whatsapp-messages";

/**
 * GET /api/agent/brief?householdId=<uuid>
 *
 * Today's brief for an external agent: open tasks for today, who's assigned,
 * overdue count, and the daily streak — as JSON plus a ready-to-send Hebrew
 * WhatsApp text block. Lets an agent answer "מה יש לנו היום?".
 *
 * Auth: Bearer BAYIT_AGENT_KEY. Rate-limited per IP.
 */

const limiter = rateLimit({ windowMs: 60_000, max: 20 });

const querySchema = z.object({
  householdId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  // 1. Auth
  const auth = verifyAgentRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 2. Rate limit
  const rl = await limiter.check(getClientIp(request));
  if (!rl.success) {
    return NextResponse.json(
      { error: "יותר מדי בקשות. נסו שוב עוד דקה." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.reset / 1000)) } }
    );
  }

  // 3. Validate query
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    householdId: searchParams.get("householdId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "פרמטרים לא תקינים", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { householdId } = parsed.data;

  // 4. Service-role Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "השרת אינו מוגדר (חסר SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey);
  const today = new Date().toISOString().slice(0, 10);

  // 5. Today's open tasks
  let todayQuery = supabase
    .from("tasks")
    .select("title, assigned_to, status")
    .eq("due_date", today)
    .neq("status", "completed");
  if (householdId) todayQuery = todayQuery.eq("household_id", householdId);
  const { data: tasks } = await todayQuery;
  const todayTasks = tasks ?? [];

  // 6. Overdue count
  let overdueQuery = supabase
    .from("tasks")
    .select("id")
    .lt("due_date", today)
    .neq("status", "completed");
  if (householdId) overdueQuery = overdueQuery.eq("household_id", householdId);
  const { data: overdue } = await overdueQuery;
  const overdueCount = overdue?.length ?? 0;

  // 7. Resolve assignee names
  const assignedIds = [
    ...new Set(todayTasks.map((t) => t.assigned_to).filter(Boolean) as string[]),
  ];
  const nameMap: Record<string, string> = {};
  if (assignedIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", assignedIds);
    for (const p of profiles ?? []) nameMap[p.id] = p.display_name;
  }

  // 8. Streak
  let streakQuery = supabase
    .from("streaks")
    .select("current_count")
    .eq("streak_type", "daily");
  if (householdId) streakQuery = streakQuery.eq("household_id", householdId);
  const { data: streaks } = await streakQuery.limit(1);
  const streak = streaks?.[0]?.current_count ?? 0;

  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const dayOfWeek = days[new Date().getDay()];

  // 9. Shape JSON + WhatsApp text
  const shapedTasks = todayTasks.map((t) => ({
    title: t.title,
    assignedTo: t.assigned_to ? (nameMap[t.assigned_to] ?? null) : null,
    status: t.status,
  }));

  const briefData: DailyBriefData = {
    names: Object.values(nameMap),
    todayTasks: shapedTasks.map((t) => ({
      title: t.title,
      assignedTo: t.assignedTo,
    })),
    streak,
    dayOfWeek,
  };

  const whatsappText =
    shapedTasks.length > 0
      ? buildMorningBrief(briefData)
      : `בוקר טוב! ☀️ אין משימות פתוחות להיום (יום ${dayOfWeek}).${
          overdueCount > 0 ? `\n⚠️ ${overdueCount} משימות באיחור.` : ""
        }\n\n--- בית בסדר ---`;

  return NextResponse.json(
    {
      date: today,
      dayOfWeek,
      tasks: shapedTasks,
      taskCount: shapedTasks.length,
      overdueCount,
      streak,
      whatsappText,
      meta: { householdScoped: Boolean(householdId), generatedAt: new Date().toISOString() },
    },
    { headers: { "Cache-Control": "no-store", "X-RateLimit-Remaining": String(rl.remaining) } }
  );
}
