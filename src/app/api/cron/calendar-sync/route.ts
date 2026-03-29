import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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
 * GET /api/cron/calendar-sync
 *
 * Vercel Cron: Runs every Sunday at 06:00 UTC.
 * For every user with an active Google Calendar connection:
 *  - Refreshes the access token if expired
 *  - Syncs tasks due in the next 7 days to their Google Calendar
 *  - Cleans up invalid tokens so the UI reflects disconnected state
 *
 * Authorization: CRON_SECRET header (same pattern as other crons).
 */
export async function GET(request: NextRequest) {
  // Verify Vercel Cron authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch all profiles with Google Calendar tokens
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, google_calendar_tokens, google_calendar_id")
    .not("google_calendar_tokens", "is", null);

  if (profilesError) {
    console.error("[cron/calendar-sync] Failed to fetch profiles:", profilesError);
    return NextResponse.json(
      { error: "Failed to fetch profiles" },
      { status: 500 }
    );
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ message: "No users with Google Calendar connected", synced: 0 });
  }

  // Date range for this sync: today → 7 days
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const timeMin = now.toISOString();
  const timeMax = weekFromNow.toISOString();
  const todayStr = now.toISOString().split("T")[0];
  const weekStr = weekFromNow.toISOString().split("T")[0];

  const results: Array<{
    userId: string;
    status: "success" | "skipped" | "error";
    created?: number;
    skipped?: number;
    reason?: string;
  }> = [];

  for (const profile of profiles) {
    const rawTokens = profile.google_calendar_tokens;
    if (!rawTokens) {
      results.push({ userId: profile.id, status: "skipped", reason: "no tokens" });
      continue;
    }

    let tokens = rawTokens as unknown as GoogleTokens;

    // Validate / refresh access token
    let accessToken: string;
    let updatedTokens: GoogleTokens;
    try {
      ({ accessToken, updatedTokens } = await getValidAccessToken(tokens));
    } catch (err) {
      console.error(`[cron/calendar-sync] Token refresh failed for ${profile.id}:`, err);

      // Clear invalid tokens so the UI shows disconnected
      await supabase
        .from("profiles")
        .update({ google_calendar_tokens: null, google_calendar_id: null })
        .eq("id", profile.id);

      results.push({ userId: profile.id, status: "error", reason: "token refresh failed" });
      continue;
    }

    tokens = updatedTokens;

    // Persist refreshed token if it changed
    if (updatedTokens.access_token !== (rawTokens as unknown as GoogleTokens).access_token) {
      await supabase
        .from("profiles")
        .update({ google_calendar_tokens: tokens as unknown as Json })
        .eq("id", profile.id);
    }

    // Resolve calendar id
    let calendarId = (profile.google_calendar_id as string | null) ?? null;
    if (!calendarId) {
      try {
        calendarId = await getPrimaryCalendarId(accessToken);
        await supabase
          .from("profiles")
          .update({ google_calendar_id: calendarId })
          .eq("id", profile.id);
      } catch (err) {
        console.error(`[cron/calendar-sync] Failed to get calendar id for ${profile.id}:`, err);
        results.push({ userId: profile.id, status: "error", reason: "calendar id resolution failed" });
        continue;
      }
    }

    // Fetch existing events to avoid duplicates
    let existingEvents: Array<{ id?: string; summary?: string; description?: string }> = [];
    try {
      existingEvents = await listEvents(accessToken, calendarId, timeMin, timeMax);
    } catch {
      // Non-fatal — we'll just risk a duplicate if listing fails
    }

    const syncedTaskIds = new Set<string>();
    for (const ev of existingEvents) {
      const match = ev.description?.match(/\[bayit:([^\]]+)\]/);
      if (match) syncedTaskIds.add(match[1]);
    }
    const existingTitles = new Set(existingEvents.map((e) => e.summary ?? ""));

    // Fetch tasks assigned to this user due within the next 7 days
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, title, description, due_date, status")
      .eq("assigned_to", profile.id)
      .in("status", ["pending", "in_progress"])
      .gte("due_date", todayStr)
      .lte("due_date", weekStr);

    if (tasksError) {
      console.error(`[cron/calendar-sync] Failed to fetch tasks for ${profile.id}:`, tasksError);
      results.push({ userId: profile.id, status: "error", reason: "task fetch failed" });
      continue;
    }

    const taskList = tasks ?? [];
    let created = 0;
    let skipped = 0;

    for (const task of taskList) {
      if (syncedTaskIds.has(task.id) || existingTitles.has(task.title)) {
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

        // Embed task ID for reliable dedup on future syncs
        const descParts = [eventBody.description, `[bayit:${task.id}]`].filter(Boolean);
        eventBody.description = descParts.join("\n");

        await createEvent(accessToken, calendarId, eventBody);
        syncedTaskIds.add(task.id);
        existingTitles.add(task.title);
        created++;
      } catch (err) {
        console.warn(`[cron/calendar-sync] Could not create event for task "${task.title}":`, err);
      }
    }

    results.push({ userId: profile.id, status: "success", created, skipped });
  }

  const successful = results.filter((r) => r.status === "success").length;
  const totalCreated = results
    .filter((r) => r.status === "success")
    .reduce((sum, r) => sum + (r.created ?? 0), 0);

  console.log(`[cron/calendar-sync] Done: ${successful}/${profiles.length} users synced, ${totalCreated} events created`);

  return NextResponse.json({
    success: true,
    usersProcessed: profiles.length,
    usersSucceeded: successful,
    totalEventsCreated: totalCreated,
    results,
  });
}
