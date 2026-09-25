import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolveHousehold } from "@/lib/meals/session";
import { loadOrGenerateWeek } from "@/lib/meals/plan-service";
import { comingSunday } from "@/lib/meals/week";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const session = await resolveHousehold(supabase);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ weekStart: searchParams.get("weekStart") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: "weekStart לא תקין" }, { status: 400 });
  }

  const weekStartDate = parsed.data.weekStart
    ? comingSunday(new Date(`${parsed.data.weekStart}T00:00:00`))
    : comingSunday(new Date());

  try {
    const { days, weekStart } = await loadOrGenerateWeek(
      supabase,
      session.householdId,
      weekStartDate,
      false
    );
    return NextResponse.json({ weekStart, days }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה ביצירת תוכנית הארוחות" },
      { status: 500 }
    );
  }
}

const postSchema = z.object({
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  force: z.boolean().default(false),
});

/** POST /api/meals/plan — (re)generate the week. force=true regenerates every non-cooked day. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const session = await resolveHousehold(supabase);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = {};
  }
  const parsed = postSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "פרמטרים לא תקינים" }, { status: 400 });
  }

  const weekStartDate = parsed.data.weekStart
    ? comingSunday(new Date(`${parsed.data.weekStart}T00:00:00`))
    : comingSunday(new Date());

  try {
    const { days, weekStart } = await loadOrGenerateWeek(
      supabase,
      session.householdId,
      weekStartDate,
      parsed.data.force
    );
    return NextResponse.json({ weekStart, days }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה ביצירת תוכנית הארוחות" },
      { status: 500 }
    );
  }
}
