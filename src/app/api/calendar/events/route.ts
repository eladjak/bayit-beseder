import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getValidAccessToken,
  getPrimaryCalendarId,
  listEvents,
  type GoogleTokens,
  type CalendarEvent,
} from "@/lib/google-calendar";
import type { Json } from "@/lib/types/database";
import type { ClientCalendarEvent } from "@/lib/types/calendar";

/**
 * Normalize a Google Calendar event into a flat client-friendly shape.
 */
function normalizeEvent(event: CalendarEvent & { id?: string }): ClientCalendarEvent | null {
  if (!event.id) return null;

  const start = event.start;
  const end = event.end;
  const isAllDay = "date" in start;

  let startTime: string;
  let endTime: string;
  let date: string;

  if (isAllDay) {
    // All-day events use { date: "YYYY-MM-DD" }
    startTime = (start as { date: string }).date;
    endTime = (end as { date: string }).date;
    date = startTime;
  } else {
    // Timed events use { dateTime: "ISO string", timeZone: "..." }
    startTime = (start as { dateTime: string }).dateTime;
    endTime = (end as { dateTime: string }).dateTime;
    // Extract YYYY-MM-DD from the ISO datetime, using Israel timezone
    const d = new Date(startTime);
    date = d.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" }); // en-CA gives YYYY-MM-DD
  }

  return {
    id: event.id,
    summary: event.summary ?? "(ללא כותרת)",
    description: event.description,
    startTime,
    endTime,
    isAllDay,
    date,
  };
}

/**
 * GET /api/calendar/events?timeMin=...&timeMax=...
 *
 * Fetches the user's Google Calendar events for the given date range.
 * Returns { connected: false, events: [] } if calendar is not connected.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query params
  const { searchParams } = request.nextUrl;
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");

  if (!timeMin || !timeMax) {
    return NextResponse.json(
      { error: "timeMin and timeMax query parameters are required" },
      { status: 400 }
    );
  }

  // Validate date format and range
  const minDate = new Date(timeMin);
  const maxDate = new Date(timeMax);
  if (isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format for timeMin or timeMax" },
      { status: 400 }
    );
  }
  if (minDate >= maxDate) {
    return NextResponse.json(
      { error: "timeMin must be before timeMax" },
      { status: 400 }
    );
  }

  // Load profile + tokens
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("google_calendar_tokens, google_calendar_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ connected: false, events: [] });
  }

  const rawTokens = profile.google_calendar_tokens;
  if (!rawTokens) {
    return NextResponse.json({ connected: false, events: [] });
  }

  const tokens = rawTokens as unknown as GoogleTokens;

  // Validate / refresh access token
  let accessToken: string;
  let updatedTokens: GoogleTokens;
  try {
    ({ accessToken, updatedTokens } = await getValidAccessToken(tokens));
  } catch (err) {
    console.error("[calendar/events] Token refresh failed:", err);

    // If refresh fails, the tokens are likely revoked — clear them so the UI
    // shows the "disconnected" state instead of a perpetual error.
    await supabase
      .from("profiles")
      .update({ google_calendar_tokens: null, google_calendar_id: null })
      .eq("id", user.id);

    return NextResponse.json(
      { connected: false, events: [], error: "הרשאות Google Calendar פגו. יש להתחבר מחדש." },
      { status: 200 } // Not 401 - graceful degradation
    );
  }

  // Persist refreshed tokens if changed
  if (updatedTokens.access_token !== tokens.access_token) {
    await supabase
      .from("profiles")
      .update({ google_calendar_tokens: updatedTokens as unknown as Json })
      .eq("id", user.id);
  }

  // Resolve calendar ID
  let calendarId = (profile.google_calendar_id as string | null) ?? null;
  if (!calendarId) {
    try {
      calendarId = await getPrimaryCalendarId(accessToken);
      await supabase
        .from("profiles")
        .update({ google_calendar_id: calendarId })
        .eq("id", user.id);
    } catch {
      return NextResponse.json(
        { connected: true, events: [], error: "Failed to access Google Calendar" },
        { status: 200 }
      );
    }
  }

  // Fetch events
  try {
    const rawEvents = await listEvents(accessToken, calendarId, timeMin, timeMax);
    const events = rawEvents
      .map(normalizeEvent)
      .filter((e): e is ClientCalendarEvent => e !== null);

    return NextResponse.json({ connected: true, events });
  } catch (err) {
    console.error("[calendar/events] Failed to fetch events:", err);
    return NextResponse.json(
      { connected: true, events: [], error: "Failed to fetch calendar events" },
      { status: 200 }
    );
  }
}
