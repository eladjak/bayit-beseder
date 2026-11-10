import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { DeleteAccountError, deleteAccount } from "@/lib/privacy/delete-account";

// Deleting an account is rare. A tight limit also blunts guessing the confirmation.
const limiter = rateLimit({ windowMs: 60_000, max: 5 });

/**
 * POST /api/account/delete
 * Body: { confirmEmail: string }  (must match the signed-in user's email)
 *
 * Deletes the SIGNED-IN user's account. The user id comes only from the
 * verified session cookie; anything else in the body (e.g. a "userId") is
 * ignored, so user A can never delete user B.
 *
 * What is deleted, and when the sign-in is kept because the events app shares
 * it, is decided inside the database (migration 027); see lib/privacy/delete-account.ts.
 *
 * Deliberately NOT behind the consent guard: a person who has not accepted the
 * current policy must still be able to erase their data.
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

  let body: { confirmEmail?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const typed = typeof body.confirmEmail === "string" ? body.confirmEmail.trim().toLowerCase() : "";
  const actual = (user.email ?? "").trim().toLowerCase();
  if (!actual || typed !== actual) {
    return NextResponse.json({ error: "confirmation_mismatch" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  const service = createServiceClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Best effort: ask Google to invalidate the calendar token we hold.
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("google_calendar_tokens")
      .eq("id", user.id)
      .maybeSingle();
    const tokens = profile?.google_calendar_tokens as { access_token?: string; refresh_token?: string } | null;
    const toRevoke = tokens?.refresh_token ?? tokens?.access_token;
    if (toRevoke) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(toRevoke)}`, { method: "POST" });
    }
  } catch {
    // Non-fatal: the stored tokens are deleted below either way.
  }

  try {
    const result = await deleteAccount(service, user.id);
    // Drop the session cookies on this response as well.
    await supabase.auth.signOut().catch(() => undefined);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof DeleteAccountError && err.code === "active_subscription") {
      return NextResponse.json({ error: "active_subscription" }, { status: 409 });
    }
    if (err instanceof DeleteAccountError && err.code === "not_available") {
      // The database function is missing: nothing was deleted. Say so, do not pretend it failed halfway.
      console.error("[account/delete] database function missing (migration 027 not applied)");
      return NextResponse.json({ error: "delete_unavailable" }, { status: 503 });
    }
    console.error("[account/delete] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
