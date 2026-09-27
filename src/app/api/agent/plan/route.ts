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
 * Auth: Bearer <per-household token> (or the legacy BAYIT_AGENT_KEY during the
 * transition). Rate-limited per IP. The household used to enrich the plan
 * with existing tasks/members is always the one the bearer token authorizes
 * — a `householdId` body field is accepted for backward compatibility but
 * ignored for that purpose (see src/lib/agent/auth.ts). A token authorized
 * for NO household (e.g. an unpinned legacy key) gets 403 — generating and
 * possibly delivering a plan is a real action, not a household-optional read.
 */

const limiter = rateLimit({ windowMs: 60_000, max: 10 });

const bodySchema = z.object({
  /** DEPRECATED / IGNORED — see module docstring above. */
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
  // 1. Rate limit — BEFORE the token lookup (see task/route.ts for why: auth
  // below queries household_agent_tokens per distinct token presented).
  const rl = await limiter.check(getClientIp(request));
  if (!rl.success) {
    return NextResponse.json(
      { error: "יותר מדי בקשות. נסו שוב עוד דקה." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.reset / 1000)) } }
    );
  }

  // 2. Auth — resolves WHICH household (if any) this bearer token authorizes.
  const auth = await verifyAgentRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  // Unlike a truly household-optional read, generating (and possibly
  // delivering, via `deliver: "whatsapp"`) a plan is a real action taken on
  // someone's behalf — a legacy key with no household pinned must not be
  // able to trigger it. Every other agent route already fails closed here;
  // this route previously did not (it allowed a "no household context"
  // plan through), which was the one inconsistency an adversarial review
  // caught.
  if (!auth.householdId) {
    return NextResponse.json(
      { error: "הטוקן אינו מורשה לפעול על אף משק בית." },
      { status: 403 }
    );
  }
  const householdId = auth.householdId;

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
  const { weekStart, zoneMode, members, deliver } = parsed.data;

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
