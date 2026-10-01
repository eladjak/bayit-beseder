import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveHousehold } from "@/lib/meals/session";
import { isPriceCompareEnabled } from "@/lib/prices/flag";
import { NO_STORE } from "@/lib/prices/session";

export const dynamic = "force-dynamic";

/** GET /api/prices/status -> { enabled } for the signed-in user's household. */
export async function GET() {
  const supabase = await createClient();
  const session = await resolveHousehold(supabase);
  const enabled = session.ok && isPriceCompareEnabled(session.householdId);
  return NextResponse.json({ enabled }, { headers: NO_STORE });
}
