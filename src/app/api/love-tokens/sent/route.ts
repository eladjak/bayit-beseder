/**
 * GET /api/love-tokens/sent — paginated history of love tokens RECEIVED.
 *
 * Auth required. Returns tokens where recipient_id = current user.
 * Query: ?limit=20&before=<iso-timestamp>
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 * Schema: supabase/migrations/012_alopik_v2.sql (love_tokens)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnyQuery = {
  select: (cols: string) => AnyQuery;
  eq: (col: string, val: string) => AnyQuery;
  lt: (col: string, val: string) => AnyQuery;
  order: (col: string, opts: { ascending: boolean }) => AnyQuery;
  limit: (n: number) => AnyQuery;
  then: (cb: (res: { data: unknown; error: { message: string } | null }) => void) => void;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1), 100);
  const before = searchParams.get("before");

  // Stale Database type doesn't include love_tokens yet — cast to bypass.
  const fromAny = (supabase.from as unknown as (t: string) => AnyQuery)("love_tokens");
  let q: AnyQuery = fromAny
    .select("id, sender_id, recipient_id, value, message, sent_at, read_at")
    .eq("recipient_id", userData.user.id)
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("sent_at", before);

  const { data, error } = (await q) as unknown as {
    data: ReadonlyArray<LoveTokenRow> | null;
    error: { message: string } | null;
  };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const tokens = data ?? [];
  const unreadCount = tokens.filter((t) => t.read_at === null).length;
  const nextCursor = tokens.length === limit ? tokens[tokens.length - 1]?.sent_at ?? null : null;

  return NextResponse.json({ tokens, unreadCount, nextCursor, limit });
}

type LoveTokenRow = {
  readonly id: string;
  readonly sender_id: string;
  readonly recipient_id: string;
  readonly value: number;
  readonly message: string | null;
  readonly sent_at: string;
  readonly read_at: string | null;
};
