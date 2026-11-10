import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { hasCurrentConsent } from "@/lib/privacy/consent-server";
import { POLICY_VERSION, type ConsentSource } from "@/lib/privacy/policy";

const limiter = rateLimit({ windowMs: 60_000, max: 20 });
const SOURCES: ConsentSource[] = ["register", "gate", "invite"];

/** GET /api/privacy/consent  ->  { accepted: boolean, version } */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accepted = await hasCurrentConsent(supabase, user.id);
  return NextResponse.json({ accepted, version: POLICY_VERSION });
}

/**
 * POST /api/privacy/consent
 * Body: { ageConfirmed, privacyAccepted, termsAccepted: true, locale?, source? }
 * Records consent for the CURRENT policy version. All three must be true.
 */
export async function POST(request: NextRequest) {
  const limit = await limiter.check(getClientIp(request));
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.reset / 1000)) } },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    ageConfirmed?: unknown;
    privacyAccepted?: unknown;
    termsAccepted?: unknown;
    locale?: unknown;
    source?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const missing = {
    ageConfirmed: body.ageConfirmed !== true,
    privacyAccepted: body.privacyAccepted !== true,
    termsAccepted: body.termsAccepted !== true,
  };
  if (missing.ageConfirmed || missing.privacyAccepted || missing.termsAccepted) {
    return NextResponse.json({ error: "all_confirmations_required", missing }, { status: 400 });
  }

  const locale = body.locale === "en" ? "en" : "he";
  const source = SOURCES.includes(body.source as ConsentSource) ? (body.source as ConsentSource) : "gate";

  // User-scoped client: RLS only lets a user write a row for themselves, and only
  // with all three confirmations true. ignoreDuplicates keeps the first timestamp
  // when the same version is confirmed twice (double click, two tabs).
  const { error } = await supabase.from("privacy_consents" as never).upsert(
    {
      user_id: user.id,
      policy_version: POLICY_VERSION,
      age_confirmed: true,
      privacy_accepted: true,
      terms_accepted: true,
      locale,
      source,
    } as never,
    { onConflict: "user_id,policy_version", ignoreDuplicates: true },
  );
  if (error) {
    console.error("[privacy/consent] save failed:", error.message);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ accepted: true, version: POLICY_VERSION });
}
