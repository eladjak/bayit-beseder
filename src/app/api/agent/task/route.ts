import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { verifyAgentRequest } from "@/lib/agent/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/agent/task
 *
 * Agent-facing endpoint to READ, CREATE, or COMPLETE tasks.
 * Lets Kami / Box / any external agent say:
 *  "תוסיף משימה: להפשיר עוף לארבע" → creates a task in BayitBeSeder
 *  "סמן משימה X כהושלמה"           → marks a task completed
 *  "מה המשימות הפתוחות?"           → returns open tasks list
 *
 * Auth: Bearer <per-household token> (or the legacy BAYIT_AGENT_KEY during the
 * transition — see src/lib/agent/auth.ts). Rate-limited per IP (30/min).
 *
 * SAFETY LINES:
 * - The household acted on is ALWAYS the one the bearer token authorizes
 *   (`auth.householdId`) — never a `householdId` field from the request body.
 *   A body may still include one for backward compatibility with older
 *   callers, but it is parsed and discarded, not used for scoping.
 * - No RLS bypass without a verified householdId.
 * - task_completion user_id uses the household's first member (service-role
 *   writes on behalf of the household, not an unauthenticated caller).
 * - Status transitions are guarded: can only complete "pending"/"in_progress".
 */

const limiter = rateLimit({ windowMs: 60_000, max: 30 });

// ── Schema ────────────────────────────────────────────────────────────────────

const addSchema = z.object({
  action: z.literal("add"),
  /**
   * DEPRECATED / IGNORED. The household is resolved from the bearer token
   * (see src/lib/agent/auth.ts), never from the request body. This field is
   * still accepted (and validated as a UUID when present) only so older
   * callers that still send it do not fail schema validation; its value is
   * never read for authorization or scoping.
   */
  householdId: z.string().uuid().optional(),
  /** Task title (Hebrew OK). */
  title: z.string().min(1).max(200),
  /** Optional ISO date string YYYY-MM-DD. Defaults to today. */
  due: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "due חייב להיות בפורמט YYYY-MM-DD")
    .optional(),
  /**
   * Assignee display name (e.g. "אלעד"). Resolved to user_id via profiles.
   * If omitted, task is unassigned.
   */
  assignee: z.string().min(1).max(100).optional(),
  /** Category key (e.g. "kitchen", "bathroom"). */
  category: z.string().min(1).max(50).optional(),
  /** 1-3 difficulty. Defaults to 2. */
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

const completeSchema = z.object({
  action: z.literal("complete"),
  /** DEPRECATED / IGNORED — see addSchema.householdId above. */
  householdId: z.string().uuid().optional(),
  /** UUID of the task to complete. */
  taskId: z.string().uuid(),
  /** Optional note written on completion. */
  note: z.string().max(500).optional(),
});

const listSchema = z.object({
  action: z.literal("list"),
  /** DEPRECATED / IGNORED — the household is always the one the bearer token
   * authorizes. See addSchema.householdId above. */
  householdId: z.string().uuid().optional(),
  /** Filter by status. Defaults to pending+in_progress. */
  status: z
    .union([
      z.literal("pending"),
      z.literal("in_progress"),
      z.literal("completed"),
      z.literal("all"),
    ])
    .optional(),
  /** Limit results (max 50). Defaults to 20. */
  limit: z.number().int().min(1).max(50).optional(),
});

const bodySchema = z.discriminatedUnion("action", [
  addSchema,
  completeSchema,
  listSchema,
]);

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Auth — resolves WHICH household (if any) this bearer token authorizes.
  const auth = await verifyAgentRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!auth.householdId) {
    return NextResponse.json(
      { error: "הטוקן אינו מורשה לפעול על אף משק בית." },
      { status: 403 }
    );
  }
  const householdId = auth.householdId;

  // 2. Rate limit
  const rl = await limiter.check(getClientIp(request));
  if (!rl.success) {
    return NextResponse.json(
      { error: "יותר מדי בקשות. נסו שוב עוד דקה." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.reset / 1000)) },
      }
    );
  }

  // 3. Parse body
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "פרמטרים לא תקינים", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 4. Service-role Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "השרת אינו מוגדר (חסר SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }
  const supabase = createClient<Database>(supabaseUrl, serviceKey);

  // 5. Dispatch to handler
  const body = parsed.data;

  switch (body.action) {
    case "list":
      return handleList(supabase, householdId, body, rl.remaining);
    case "add":
      return handleAdd(supabase, householdId, body, rl.remaining);
    case "complete":
      return handleComplete(supabase, householdId, body, rl.remaining);
  }
}

// ── list ──────────────────────────────────────────────────────────────────────

async function handleList(
  supabase: ReturnType<typeof createClient<Database>>,
  householdId: string,
  body: z.infer<typeof listSchema>,
  rlRemaining: number
) {
  const limit = body.limit ?? 20;
  const statusFilter = body.status ?? "open"; // "open" = pending+in_progress

  let q = supabase
    .from("tasks")
    .select("id, title, status, due_date, assigned_to, points, category_id")
    .eq("household_id", householdId)
    .order("due_date", { ascending: true })
    .limit(limit);

  if (statusFilter === "open") {
    q = q.in("status", ["pending", "in_progress"]);
  } else if (statusFilter !== "all") {
    q = q.eq("status", statusFilter);
  }

  const { data: tasks, error } = await q;
  if (error) {
    return NextResponse.json(
      { error: "שגיאה בשאילתת משימות", details: error.message },
      { status: 500 }
    );
  }

  // Resolve assignee names
  const assignedIds = [
    ...new Set((tasks ?? []).map((t) => t.assigned_to).filter(Boolean) as string[]),
  ];
  const nameMap: Record<string, string> = {};
  if (assignedIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", assignedIds);
    for (const p of profiles ?? []) nameMap[p.id] = p.display_name;
  }

  const shaped = (tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.due_date,
    assignedTo: t.assigned_to ? (nameMap[t.assigned_to] ?? null) : null,
    points: t.points,
  }));

  return NextResponse.json(
    {
      action: "list",
      tasks: shaped,
      count: shaped.length,
      // householdScoped is always true now — the household comes from the
      // bearer token, never from the request. Kept in the response shape for
      // backward compatibility with existing callers that read this field.
      meta: { householdScoped: true, generatedAt: new Date().toISOString() },
    },
    { headers: { "Cache-Control": "no-store", "X-RateLimit-Remaining": String(rlRemaining) } }
  );
}

// ── add ───────────────────────────────────────────────────────────────────────

async function handleAdd(
  supabase: ReturnType<typeof createClient<Database>>,
  householdId: string,
  body: z.infer<typeof addSchema>,
  rlRemaining: number
) {
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = body.due ?? today;

  // Resolve assignee display name → user_id (best-effort; unassigned if not found)
  let assignedTo: string | null = null;
  if (body.assignee) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("household_id", householdId);

    // Case-insensitive partial match on display_name
    const match = (profiles ?? []).find((p) =>
      p.display_name.toLowerCase().includes(body.assignee!.toLowerCase())
    );
    assignedTo = match?.id ?? null;
  }

  // Resolve category key → category_id (best-effort; null if not found)
  let categoryId: string | null = null;
  if (body.category) {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name")
      .limit(50);
    const catMatch = (cats ?? []).find(
      (c) =>
        c.name.toLowerCase().includes(body.category!.toLowerCase()) ||
        c.name === body.category
    );
    categoryId = catMatch?.id ?? null;
  }

  // Difficulty → points mapping (1→5, 2→10, 3→20)
  const pointsMap: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
  const difficulty = body.difficulty ?? 2;
  const points = pointsMap[difficulty];

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      household_id: householdId,
      title: body.title,
      status: "pending" as const,
      due_date: dueDate,
      assigned_to: assignedTo,
      category_id: categoryId,
      points,
      recurring: false,
    })
    .select("id, title, status, due_date, assigned_to, points")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "שגיאה בהוספת משימה", details: error.message },
      { status: 500 }
    );
  }

  // Resolve display name for the response
  let assigneeName: string | null = null;
  if (assignedTo) {
    const { data: p } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", assignedTo)
      .single();
    assigneeName = p?.display_name ?? null;
  }

  return NextResponse.json(
    {
      action: "add",
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: task.due_date,
        assignedTo: assigneeName,
        points: task.points,
      },
      message: `✅ משימה נוספה: "${task.title}"${assigneeName ? ` — שויכה ל-${assigneeName}` : ""}`,
    },
    {
      status: 201,
      headers: { "Cache-Control": "no-store", "X-RateLimit-Remaining": String(rlRemaining) },
    }
  );
}

// ── complete ──────────────────────────────────────────────────────────────────

async function handleComplete(
  supabase: ReturnType<typeof createClient<Database>>,
  householdId: string,
  body: z.infer<typeof completeSchema>,
  rlRemaining: number
) {
  // 1. Fetch the task (scoped to the token's household — safety check)
  const { data: task, error: fetchErr } = await supabase
    .from("tasks")
    .select("id, title, status, household_id, assigned_to, points")
    .eq("id", body.taskId)
    .eq("household_id", householdId)
    .single();

  if (fetchErr || !task) {
    return NextResponse.json(
      { error: "המשימה לא נמצאה בתוך משק הבית המבוקש." },
      { status: 404 }
    );
  }

  // 2. Guard: only complete pending/in_progress tasks
  if (task.status === "completed") {
    return NextResponse.json(
      { error: "המשימה כבר הושלמה.", taskId: task.id, title: task.title },
      { status: 409 }
    );
  }
  if (task.status === "skipped") {
    return NextResponse.json(
      { error: "המשימה דולגה ולא ניתן להשלימה. נסו ליצור משימה חדשה.", taskId: task.id },
      { status: 409 }
    );
  }

  // 3. Mark the task completed
  const { error: updateErr } = await supabase
    .from("tasks")
    .update({ status: "completed" as const })
    .eq("id", task.id);

  if (updateErr) {
    return NextResponse.json(
      { error: "שגיאה בעדכון המשימה", details: updateErr.message },
      { status: 500 }
    );
  }

  // 4. Resolve completor: use assigned_to or first household member (agent acts on behalf)
  let completorId = task.assigned_to;
  if (!completorId) {
    const { data: member } = await supabase
      .from("household_members")
      .select("user_id")
      .eq("household_id", householdId)
      .limit(1)
      .single();
    completorId = member?.user_id ?? null;
  }

  // 5. Insert task_completion record (best-effort; don't fail the whole request if it errors)
  if (completorId) {
    const completionInsert: {
      task_id: string;
      user_id: string;
      notes?: string | null;
    } = {
      task_id: task.id,
      user_id: completorId,
    };
    if (body.note) completionInsert.notes = body.note;

    await supabase.from("task_completions").insert(completionInsert);
  }

  // 6. Update profile points (best-effort — direct increment, no RPC needed)
  if (completorId && task.points > 0) {
    // Fetch current points then update (service-role, bypasses RLS)
    const { data: prof } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", completorId)
      .single();
    if (prof) {
      await supabase
        .from("profiles")
        .update({ points: (prof.points ?? 0) + task.points })
        .eq("id", completorId);
    }
  }

  return NextResponse.json(
    {
      action: "complete",
      taskId: task.id,
      title: task.title,
      pointsAwarded: task.points,
      message: `✅ משימה הושלמה: "${task.title}" (+${task.points} נקודות)`,
    },
    { headers: { "Cache-Control": "no-store", "X-RateLimit-Remaining": String(rlRemaining) } }
  );
}
