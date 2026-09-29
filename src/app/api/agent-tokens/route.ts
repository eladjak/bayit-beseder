import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  issueHouseholdToken,
  listActiveHouseholdTokens,
  MAX_ACTIVE_TOKENS_PER_HOUSEHOLD,
  MAX_TOKEN_LABEL_LENGTH,
  ScopesUnavailableError,
} from "@/lib/agent/tokens";
import { listRecentAudit } from "@/lib/agent/audit";
import { parseRequestedSensitiveScopes, SENSITIVE_SCOPES } from "@/lib/agent/scopes";
import { requireHouseholdMember } from "@/lib/agent/token-access";

/**
 * Self-serve agent-token management for the logged-in household member
 * (settings → "חיבור לסוכנים").
 *
 *  GET  /api/agent-tokens?householdId=<uuid>     → list ACTIVE tokens (masked, with
 *                                                  scopes) + recent sensitive actions
 *  POST /api/agent-tokens { householdId, label, scopes? }
 *                                                → create; raw token returned ONCE.
 *       `scopes` are the OPT-IN extras (deliver_to_me, delete_tasks); the default
 *       read + add/complete scopes are always included. Scopes are fixed at
 *       creation: there is no way to widen a token later, create a new one.
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
  /** Opt-in extras only. Anything else is rejected, not ignored. */
  scopes: z.array(z.enum(SENSITIVE_SCOPES)).max(SENSITIVE_SCOPES.length).optional(),
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
    const audit = await listRecentAudit(gate.service, gate.householdId);
    return NextResponse.json(
      { tokens, audit, max: MAX_ACTIVE_TOKENS_PER_HOUSEHOLD },
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
  const scopes = parseRequestedSensitiveScopes(parsed.data.scopes);

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

    // "Send to me" needs a phone to send to: the creator's own WhatsApp number.
    if (scopes.includes("deliver_to_me")) {
      const { data: me } = await gate.service
        .from("profiles")
        .select("whatsapp_phone, household_id")
        .eq("id", gate.userId)
        .maybeSingle();
      if (!me?.whatsapp_phone || me.household_id !== gate.householdId) {
        return NextResponse.json(
          {
            error:
              "כדי לאפשר שליחה אליי צריך קודם להגדיר מספר וואטסאפ בפרופיל שלך (בהגדרות).",
          },
          { status: 400, headers: noStore }
        );
      }
    }

    const issued = await issueHouseholdToken(gate.service, gate.householdId, label, {
      scopes,
      createdBy: gate.userId,
    });
    return NextResponse.json(
      {
        token: {
          id: issued.id,
          label,
          scopes: issued.scopes,
          createdAt: issued.createdAt,
          // Shown exactly once. Not retrievable afterwards.
          rawToken: issued.rawToken,
        },
      },
      { status: 201, headers: noStore }
    );
  } catch (e) {
    if (e instanceof ScopesUnavailableError) {
      return NextResponse.json(
        { error: "ההרשאות המתקדמות עדיין לא הופעלו במערכת. נסו שוב מאוחר יותר." },
        { status: 503, headers: noStore }
      );
    }
    return NextResponse.json({ error: "שגיאה ביצירת החיבור." }, { status: 500, headers: noStore });
  }
}
