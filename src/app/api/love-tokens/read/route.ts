/**
 * POST /api/love-tokens/read — mark love tokens as read.
 *
 * Body: { ids: string[] } — marks recipient_id===me, read_at IS NULL → now.
 * RLS enforces recipient ownership.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnyUpdate = {
  update: (vals: Record<string, unknown>) => AnyUpdate;
  in: (col: string, vals: readonly string[]) => AnyUpdate;
  eq: (col: string, val: string) => AnyUpdate;
  is: (col: string, val: null) => Promise<{ error: { message: string } | null; count: number | null }>;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { ids?: unknown };
  try {
    body = (await req.json()) as { ids?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > 100) {
    return NextResponse.json({ error: "ids must be a non-empty array up to 100 items" }, { status: 400 });
  }
  const ids = body.ids as string[];
  if (!ids.every((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id))) {
    return NextResponse.json({ error: "ids must all be UUIDs" }, { status: 400 });
  }

  const fromAny = (supabase.from as unknown as (t: string) => AnyUpdate)("love_tokens");
  const { error, count } = await fromAny
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .eq("recipient_id", userData.user.id)
    .is("read_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, marked: count ?? 0 });
}
