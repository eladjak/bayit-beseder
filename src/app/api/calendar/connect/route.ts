import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildOAuthUrl } from "@/lib/google-calendar";

/**
 * GET /api/calendar/connect
 *
 * Generates the Google OAuth2 URL and redirects the user to Google's
 * consent screen so they can grant calendar access.
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
    const url = buildOAuthUrl(user.id);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[calendar/connect] Failed to build OAuth URL:", err);
    return NextResponse.json(
      { error: "Google Calendar is not configured on this server." },
      { status: 500 }
    );
  }
}
