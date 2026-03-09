import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/google-calendar";
import type { Json } from "@/lib/types/database";

/**
 * GET /api/auth/callback/google-calendar
 *
 * Google redirects here after the user grants calendar access.
 * We exchange the ?code= for tokens and store them in the profile.
 *
 * A4: Validates the `state` query parameter against the `google_oauth_state`
 *     cookie to prevent CSRF attacks.
 * A7: Sanitises the OAuth `error` parameter before including it in a redirect
 *     URL to prevent open-redirect / reflected-XSS attacks.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateParam = searchParams.get("state");

  // Build the base URL for redirect
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  if (error || !code) {
    console.error("[google-calendar callback] OAuth error:", error);
    // A7: Encode the error value before embedding it in a redirect URL
    const safeReason = encodeURIComponent(error ?? "no_code");
    return NextResponse.redirect(
      `${appUrl}/settings?calendar=error&reason=${safeReason}`
    );
  }

  // A4: Validate CSRF state token
  const stateCookie = request.cookies.get("google_oauth_state")?.value;
  if (!stateCookie || stateCookie !== stateParam) {
    console.error(
      "[google-calendar callback] State mismatch — possible CSRF attack"
    );
    return NextResponse.redirect(
      `${appUrl}/settings?calendar=error&reason=state_mismatch`
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${appUrl}/login?error=not_authenticated`);
    }

    // Persist tokens in the profiles table (cast via Json which is the DB column type)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ google_calendar_tokens: tokens as unknown as Json })
      .eq("id", user.id);

    if (updateError) {
      console.error(
        "[google-calendar callback] Failed to save tokens:",
        updateError
      );
      return NextResponse.redirect(
        `${appUrl}/settings?calendar=error&reason=save_failed`
      );
    }

    // Clear the CSRF state cookie now that it has been consumed
    const successResponse = NextResponse.redirect(
      `${appUrl}/settings?calendar=connected`
    );
    successResponse.cookies.set("google_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return successResponse;
  } catch (err) {
    console.error("[google-calendar callback] Unexpected error:", err);
    return NextResponse.redirect(
      `${appUrl}/settings?calendar=error&reason=unexpected`
    );
  }
}
