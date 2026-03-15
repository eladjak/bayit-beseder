import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getValidAccessToken,
  getPrimaryCalendarId,
  listEvents,
  createEvent,
  taskToCalendarEvent,
  type GoogleTokens,
} from "@/lib/google-calendar";
import type { Json } from "@/lib/types/database";

/**
 * POST /api/calendar/sync
 *
 * Syncs the authenticated user's tasks to Google Calendar.
 * - Fetches tasks that are due this week and not yet linked to a calendar event
 * - Creates calendar events for each unlinked task
 * - Stores the resulting Google event ID back in the task row
 *
 * Only tasks from the `tasks` table with a pending/in_progress status are synced.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load profile + tokens
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("google_calendar_tokens, google_calendar_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const rawTokens = profile.google_calendar_tokens;
  if (!rawTokens) {
    return NextResponse.json(
      { error: "Google Calendar not connected" },
      { status: 400 }
    );
  }

  let tokens = rawTokens as unknown as GoogleTokens;

  // Validate / refresh access token
  let accessToken: string;
  let updatedTokens: GoogleTokens;
  try {
    ({ accessToken, updatedTokens } = await getValidAccessToken(tokens));
  } catch (err) {
    console.error("[calendar/sync] Token refresh failed:", err);
    return NextResponse.json(
      { error: "Failed to refresh Google access token. Please reconnect." },
      { status: 401 }
    );
  }

  tokens = updatedTokens;

  // If token was refreshed, persist updated tokens
  if (updatedTokens.access_token !== (rawTokens as unknown as GoogleTokens).access_token) {
    await supabase
      .from("profiles")
      .update({ google_calendar_tokens: tokens as unknown as Json })
      .eq("id", user.id);
  }

  // Resolve primary calendar id (cache in profile if missing)
  let calendarId = (profile.google_calendar_id as string | null) ?? null;
  if (!calendarId) {
    try {
      calendarId = await getPrimaryCalendarId(accessToken);
      // Cache it
      await supabase
        .from("profiles")
        .update({ google_calendar_id: calendarId })
        .eq("id", user.id);
    } catch (err) {
      console.error("[calendar/sync] Failed to get calendar id:", err);
      return NextResponse.json(
        { error: "Failed to access Google Calendar" },
        { status: 502 }
      );
    }
  }

  // Date range: today → 7 days from now (in ISO format, Israel timezone)
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const timeMin = now.toISOString();
  const timeMax = weekFromNow.toISOString();
  const todayStr = now.toISOString().split("T")[0];
  const weekStr = weekFromNow.toISOString().split("T")[0];

  // Fetch existing calendar events so we can avoid duplicates
  let existingEvents: Array<{ id?: string; summary?: string }> = [];
  try {
    existingEvents = await listEvents(accessToken, calendarId, timeMin, timeMax);
  } catch (err) {
    console.warn("[calendar/sync] Could not list existing events:", err);
  }

  const existingTitles = new Set(existingEvents.map((e) => e.summary ?? ""));

  // Fetch tasks that are pending/in_progress with a due_date in the next 7 days
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, status")
    .eq("assigned_to", user.id)
    .in("status", ["pending", "in_progress"])
    .gte("due_date", todayStr)
    .lte("due_date", weekStr);

  if (tasksError) {
    console.error("[calendar/sync] Failed to fetch tasks:", tasksError);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }

  const taskList = tasks ?? [];
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const task of taskList) {
    // Skip if a calendar event with the same title already exists in this window
    if (existingTitles.has(task.title)) {
      skipped++;
      continue;
    }

    try {
      const eventBody = taskToCalendarEvent({
        id: task.id,
        title: task.title,
        description: task.description ?? undefined,
        due_date: task.due_date ?? undefined,
      });

      const createdEvent = await createEvent(accessToken, calendarId, eventBody);

      existingTitles.add(task.title);
      created++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Task "${task.title}": ${message}`);
    }
  }

  const lastSync = new Date().toISOString();

  return NextResponse.json({
    success: true,
    created,
    skipped,
    errors,
    lastSync,
    totalTasks: taskList.length,
  });
}

/**
 * GET /api/calendar/sync
 *
 * Returns the current connection status and last sync metadata.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_calendar_tokens, google_calendar_id")
    .eq("id", user.id)
    .single();

  const connected = !!profile?.google_calendar_tokens;
  const calendarId = (profile?.google_calendar_id as string | null) ?? null;

  return NextResponse.json({ connected, calendarId });
}
