import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveHousehold } from "@/lib/meals/session";
import { isPriceCompareEnabled } from "./flag";
import { PriceServiceError } from "./server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type PriceSession =
  | { ok: true; supabase: Supabase; householdId: string; userId: string }
  | { ok: false; response: NextResponse };

export const NO_STORE = { "Cache-Control": "private, no-store" } as const;

/**
 * Logged-in user -> household (from their own profile, RLS) -> flag.
 * The household id is never taken from the request. When the flag is off the
 * feature does not exist for that household: 404, not 403.
 */
export async function requirePriceSession(): Promise<PriceSession> {
  const supabase = await createClient();
  const session = await resolveHousehold(supabase);
  if (!session.ok) {
    return { ok: false, response: NextResponse.json({ error: session.error }, { status: session.status, headers: NO_STORE }) };
  }
  if (!isPriceCompareEnabled(session.householdId)) {
    return { ok: false, response: NextResponse.json({ error: "not found" }, { status: 404, headers: NO_STORE }) };
  }
  return { ok: true, supabase, householdId: session.householdId, userId: session.userId };
}

export function serviceErrorResponse(e: unknown): NextResponse {
  const status = e instanceof PriceServiceError ? e.status : 500;
  return NextResponse.json(
    { error: "שירות המחירים לא זמין כרגע. נסו שוב מאוחר יותר." },
    { status, headers: NO_STORE }
  );
}
