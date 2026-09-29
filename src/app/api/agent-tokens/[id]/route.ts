import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { revokeTokenInHousehold } from "@/lib/agent/tokens";
import { requireHouseholdMember } from "@/lib/agent/token-access";

/**
 * DELETE /api/agent-tokens/<tokenId>?householdId=<uuid>
 *
 * Revokes one token. The caller must be a member of `householdId`, and the
 * token must belong to that household (otherwise 404: a token id from another
 * household is indistinguishable from a nonexistent one).
 */
const limiter = rateLimit({ windowMs: 60_000, max: 20 });

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const rl = await limiter.check(getClientIp(request));
  if (!rl.success) {
    return NextResponse.json({ error: "יותר מדי בקשות. נסו שוב עוד דקה." }, { status: 429 });
  }

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "מזהה חיבור לא תקין." }, { status: 400 });
  }

  const gate = await requireHouseholdMember(request.nextUrl.searchParams.get("householdId"));
  if (!gate.ok) return gate.response;

  try {
    const revoked = await revokeTokenInHousehold(gate.service, gate.householdId, id);
    if (!revoked) {
      return NextResponse.json({ error: "החיבור לא נמצא." }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "שגיאה בביטול החיבור." }, { status: 500 });
  }
}
