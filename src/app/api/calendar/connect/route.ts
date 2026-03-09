import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildOAuthUrl } from "@/lib/google-calendar";

/**
 * GET /api/calendar/connect
 *
 * Generates the Google OAuth2 URL and redirects the user to Google's
 * consent screen so they can grant calendar access.
 *
 * A4: Generates a random CSRF state token, stores it in a short-lived
 * httpOnly cookie, and includes it as the OAuth `state` parameter so
 * the callback can verify the round-trip.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // A4: Generate a cryptographically-secure state token for CSRF protection
    const stateToken = crypto.randomUUID();

    const url = buildOAuthUrl(stateToken);

    const response = NextResponse.redirect(url);

    // A4: Store state in a short-lived, httpOnly cookie so the callback can verify it
    response.cookies.set("google_oauth_state", stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[calendar/connect] Failed to build OAuth URL:", err);
    return NextResponse.json(
      { error: "Google Calendar is not configured on this server." },
      { status: 500 }
    );
  }
}
