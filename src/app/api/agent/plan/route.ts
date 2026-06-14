import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { verifyAgentRequest } from "@/lib/agent/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { generateWeekPlan } from "@/lib/weekly-generator";
import type { TaskRow } from "@/lib/types/database";
import { buildPlanSummary, buildPlanWhatsAppText } from "@/lib/agent/plan-format";
import { maybeDeliverToOwner } from "@/lib/agent/deliver";

/**
 * POST /api/agent/plan
 *
 * Generate a balanced weekly household plan for an external agent.
 * Returns the plan as JSON plus a ready-to-send Hebrew WhatsApp text block.
 *
 * Target use-case (Elad): an agent says "תכין תוכנית לשבוע ושלח לי בוואטסאפ" —
 * it calls this endpoint, gets `whatsappText`, and forwards it to the user's
 * WhatsApp / push channel. (Actual WhatsApp send is a separate, approved step.)
 *
 * Auth: Bearer BAYIT_AGENT_KEY. Rate-limited per IP.
 */

const limiter = rateLimit({ windowMs: 60_000, max: 10 });

const bodySchema = z.object({
  householdId: z.string().uuid().optional(),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart חייב להיות בפורמט YYYY-MM-DD")
    .optional(),
  zoneMode: z.boolean().optional(),
  members: z.array(z.string().uuid()).max(10).optional(),
  /**
   * Optional delivery. When "whatsapp", the generated whatsappText is sent to
   * ELAD'S OWN number (from env BAYIT_AGENT_WHATSAPP_TO) — never a recipient
   * from this body. Omit to just receive the text and forward it yourself.
   */
  deliver: z.literal("whatsapp").optional(),
});

/** Compute the Sunday of the week containing `from` (Israeli week starts Sunday). */
function comingSunday(from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  // getDay(): 0=Sun. Snap back to this week's Sunday.
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export async function POST(request: NextRequest) {
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

  // 3. Parse + validate body
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = {};
  }
  const parsed = bodySchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "פרמטרים לא תקינים", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { householdId, weekStart, zoneMode, members, deliver } = parsed.data;

  // 4. Resolve week start
  const weekStartDate = weekStart
    ? comingSunday(new Date(`${weekStart}T00:00:00`))
    : comingSunday(new Date());

  // 5. Load household context (existing tasks + member names) when scoped.
  let existingTasks: TaskRow[] = [];
  let resolvedMembers: string[] = members ?? [];
  const nameMap: Record<string, string> = {};

  if (householdId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "השרת אינו מוגדר לשליפת נתוני משק בית (חסר SERVICE_ROLE_KEY)." },
        { status: 500 }
      );
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // Existing (non-completed) tasks for the household.
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("household_id", householdId)
      .neq("status", "completed");
    existingTasks = (tasks as TaskRow[] | null) ?? [];

    // Members + display names.
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("household_id", householdId);

    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        nameMap[p.id] = p.display_name;
      }
      if (resolvedMembers.length === 0) {
        resolvedMembers = profiles.map((p) => p.id);
      }
    }
  }

  // Fallback: a single anonymous member so the planner can still assign/balance.
  if (resolvedMembers.length === 0) {
    resolvedMembers = ["__member_1__"];
  }

  // 6. Generate the plan (pure function — no DB writes; additive & side-effect free).
  const plan = generateWeekPlan({
    existingTasks,
    members: resolvedMembers,
    weekStartDate,
    zoneMode: zoneMode ?? false,
  });

  // 7. Shape output.
  const summary = buildPlanSummary(plan, nameMap);
  const whatsappText = buildPlanWhatsAppText(summary);

  // 8. Optional delivery to Elad's own WhatsApp (recipient is env-only).
  const delivery = await maybeDeliverToOwner(deliver, whatsappText);

  return NextResponse.json(
    {
      plan: summary,
      whatsappText,
      delivery,
      meta: {
        householdScoped: Boolean(householdId),
        weekStart: summary.weekStart,
        generatedAt: new Date().toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": String(rl.remaining),
      },
    }
  );
}
