import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePriceSession, serviceErrorResponse, NO_STORE } from "@/lib/prices/session";
import { compareList, loadOpenList, resolveOrigin } from "@/lib/prices/compare";

export const dynamic = "force-dynamic";

/**
 * GET /api/prices/compare?city=… | ?lat=…&lon=… [&radius=20]
 * Compares the household's open shopping list across nearby stores.
 * The list is read with the user's own session (RLS); the household id comes
 * from their profile, never from the request.
 */
export async function GET(request: NextRequest) {
  const s = await requirePriceSession();
  if (!s.ok) return s.response;
  const sp = new URL(request.url).searchParams;
  const lat = sp.get("lat") !== null ? Number(sp.get("lat")) : undefined;
  const lon = sp.get("lon") !== null ? Number(sp.get("lon")) : undefined;
  const radius = Math.min(Math.max(Number(sp.get("radius")) || 20, 2), 60);
  try {
    const origin = await resolveOrigin(s.supabase, s.householdId, { lat, lon, city: sp.get("city") });
    if (!origin) {
      return NextResponse.json({ error: "need_location" }, { status: 400, headers: NO_STORE });
    }
    const rows = await loadOpenList(s.supabase, s.householdId);
    if (rows.length === 0) {
      return NextResponse.json({ error: "empty_list" }, { status: 400, headers: NO_STORE });
    }
    const result = await compareList(s.householdId, rows, origin, radius);
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (e) {
    return serviceErrorResponse(e);
  }
}
