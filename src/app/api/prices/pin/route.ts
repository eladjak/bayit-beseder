import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePriceSession, serviceErrorResponse, NO_STORE } from "@/lib/prices/session";
import { priceService } from "@/lib/prices/server";
import { getCanonicalItem } from "@/lib/prices/map-items";

export const dynamic = "force-dynamic";

const schema = z.object({
  canonicalId: z.string().min(1).max(80),
  // null = un-pin
  itemCode: z.string().regex(/^\d{1,20}$/).nullable(),
  chain: z.string().regex(/^[a-z]{2,20}$/).optional(),
  name: z.string().max(120).optional(),
});

/** POST /api/prices/pin — set or clear "המוצר שלי" for one item, for the caller's household only. */
export async function POST(request: NextRequest) {
  const s = await requirePriceSession();
  if (!s.ok) return s.response;
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400, headers: NO_STORE });
  }
  if (!getCanonicalItem(body.canonicalId)) {
    return NextResponse.json({ error: "unknown item" }, { status: 400, headers: NO_STORE });
  }
  try {
    await priceService("/v1/pin", {
      method: "POST",
      body: { householdId: s.householdId, ...body },
    });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    return serviceErrorResponse(e);
  }
}
