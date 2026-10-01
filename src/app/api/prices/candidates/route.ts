import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePriceSession, serviceErrorResponse, NO_STORE } from "@/lib/prices/session";
import { priceService } from "@/lib/prices/server";
import { getCanonicalItem } from "@/lib/prices/map-items";

export const dynamic = "force-dynamic";

/** GET /api/prices/candidates?canonicalId=… -> products a family can pin as "המוצר שלי". */
export async function GET(request: NextRequest) {
  const s = await requirePriceSession();
  if (!s.ok) return s.response;
  const id = new URL(request.url).searchParams.get("canonicalId") ?? "";
  if (!getCanonicalItem(id)) {
    return NextResponse.json({ error: "unknown item" }, { status: 400, headers: NO_STORE });
  }
  try {
    const data = await priceService<{ candidates: unknown[] }>(`/v1/candidates?canonicalId=${encodeURIComponent(id)}`);
    return NextResponse.json(data, { headers: NO_STORE });
  } catch (e) {
    return serviceErrorResponse(e);
  }
}
