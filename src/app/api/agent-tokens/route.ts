import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  issueHouseholdToken,
  listActiveHouseholdTokens,
  MAX_ACTIVE_TOKENS_PER_HOUSEHOLD,
  MAX_TOKEN_LABEL_LENGTH,
} from "@/lib/agent/tokens";
import { requireHouseholdMember } from "@/lib/agent/token-access";

/**
 * Self-serve agent-token management for the logged-in household member
 * (settings → "חיבור לסוכנים").
 *
 *  GET  /api/agent-tokens?householdId=<uuid>     → list ACTIVE tokens (masked)
 *  POST /api/agent-tokens { householdId, label } → create; raw token returned ONCE
 *
 * Auth: the cookie session plus a server-side `is_household_member` check.
 * The raw token appears ONLY in the POST response body. It is never stored
 * (only its SHA-256 hash) and no route can return it again.
 */

// Creation is rare; keep it tight per IP.
const createLimiter = rateLimit({ windowMs: 60_000, max: 5 });
const listLimiter = rateLimit({ windowMs: 60_000, max: 60 });

const createSchema = z.object({
  householdId: z.string().uuid(),
  label: z
    .string()
    .trim()
    .min(1, "יש לתת שם לחיבור")
    .max(MAX_TOKEN_LABEL_LENGTH, `השם ארוך מדי (עד ${MAX_TOKEN_LABEL_LENGTH} תווים)`),
});

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const rl = await listLimiter.check(getClientIp(request));
  if (!rl.success) {
    return NextResponse.json({ error: "יותר מדי בקשות. נסו שוב עוד דקה." }, { status: 429 });
  }

  const gate = await requireHouseholdMember(request.nextUrl.searchParams.get("householdId"));
  if (!gate.ok) return gate.response;

  try {
    const tokens = await listActiveHouseholdTokens(gate.service, gate.householdId);
    return NextResponse.json(
      { tokens, max: MAX_ACTIVE_TOKENS_PER_HOUSEHOLD },
      { headers: noStore }
    );
  } catch {
    return NextResponse.json({ error: "שגיאה בטעינת החיבורים." }, { status: 500, headers: noStore });
  }
}

export async function POST(request: NextRequest) {
  const rl = await createLimiter.check(getClientIp(request));
  if (!rl.success) {
    return NextResponse.json(
      { error: "יותר מדי ניסיונות ליצור חיבור. נסו שוב עוד דקה." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.reset / 1000)) } }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "פרמטרים לא תקינים", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { householdId, label } = parsed.data;

  const gate = await requireHouseholdMember(householdId);
  if (!gate.ok) return gate.response;

  try {
    const active = await listActiveHouseholdTokens(gate.service, gate.householdId);
    if (active.length >= MAX_ACTIVE_TOKENS_PER_HOUSEHOLD) {
      return NextResponse.json(
        {
          error: `אפשר להחזיק עד ${MAX_ACTIVE_TOKENS_PER_HOUSEHOLD} חיבורים פעילים. בטלו חיבור ישן ונסו שוב.`,
        },
        { status: 409, headers: noStore }
      );
    }

    const issued = await issueHouseholdToken(gate.service, gate.householdId, label);
    return NextResponse.json(
      {
        token: {
          id: issued.id,
          label,
          createdAt: issued.createdAt,
          // Shown exactly once. Not retrievable afterwards.
          rawToken: issued.rawToken,
        },
      },
      { status: 201, headers: noStore }
    );
  } catch {
    return NextResponse.json({ error: "שגיאה ביצירת החיבור." }, { status: 500, headers: noStore });
  }
}
