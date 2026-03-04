import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/calendar/disconnect
 *
 * Removes stored Google Calendar tokens from the user's profile.
 * Also attempts to revoke the token with Google so it's no longer valid.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch current tokens to revoke them with Google
  const { data: profile } = await supabase
    .from("profiles")
    .select("google_calendar_tokens")
    .eq("id", user.id)
    .single();

  // Attempt to revoke the access token so it becomes invalid on Google's side
  if (profile?.google_calendar_tokens) {
    const tokens = profile.google_calendar_tokens as {
      access_token?: string;
      refresh_token?: string;
    };
    const tokenToRevoke = tokens.access_token ?? tokens.refresh_token;
    if (tokenToRevoke) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`,
          { method: "POST" }
        );
      } catch (revokeErr) {
        // Non-fatal — even if revocation fails we clear our stored tokens
        console.warn("[calendar/disconnect] Token revocation failed:", revokeErr);
      }
    }
  }

  // Clear tokens from Supabase profile
  const { error } = await supabase
    .from("profiles")
    .update({ google_calendar_tokens: null })
    .eq("id", user.id);

  if (error) {
    console.error("[calendar/disconnect] Failed to clear tokens:", error);
    return NextResponse.json(
      { error: "Failed to disconnect calendar" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
