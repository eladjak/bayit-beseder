/**
 * In-app feedback — POST { rating: 1..5, message?: string, page?: string }.
 *
 * - Requires a logged-in user (cookie session) → 401 otherwise.
 * - Rate limited per user (5 / 10 min) and per IP (20 / hour) → 429.
 * - Inserts through the USER-scoped server client so RLS
 *   (bayit_feedback_insert_own: user_id = auth.uid()) applies. No service role.
 * - The message text is never logged.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const userLimiter = rateLimit({ windowMs: 10 * 60_000, max: 5 });
const ipLimiter = rateLimit({ windowMs: 60 * 60_000, max: 20 });

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  message: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : undefined)),
  page: z.string().max(200).optional(),
});

const TOO_MANY = "שלחתם הרבה משובים בזמן קצר. נסו שוב מאוחר יותר.";

function tooMany(reset: number) {
  return NextResponse.json(
    { error: TOO_MANY },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(reset / 1000))) } },
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const byUser = await userLimiter.check(`feedback:user:${user.id}`);
  if (!byUser.success) return tooMany(byUser.reset);
  const byIp = await ipLimiter.check(`feedback:ip:${getClientIp(req)}`);
  if (!byIp.success) return tooMany(byIp.reset);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "פרמטרים לא תקינים" }, { status: 400 });
  }

  // Cheap, best-effort household lookup; feedback is still stored without it.
  let householdId: string | null = null;
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membership?.household_id) householdId = membership.household_id as string;

  const { error } = await supabase.from("app_feedback").insert({
    user_id: user.id,
    household_id: householdId,
    rating: parsed.data.rating,
    message: parsed.data.message ?? null,
    page: parsed.data.page ?? null,
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
  });
  if (error) {
    console.error("[feedback] insert failed", error.code ?? "unknown");
    return NextResponse.json({ error: "שגיאה בשמירת המשוב." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
