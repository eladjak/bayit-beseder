/**
 * Coaching Effectiveness Tracker
 *
 * Records which coaching styles lead to task completions within 2 hours
 * of a WhatsApp message being sent.  This allows the daily-brief and
 * daily-summary cron jobs to pick the historically most-effective style
 * for each household automatically.
 */

import { createClient as createServerClient } from "@supabase/supabase-js";

// ============================================================
// Types
// ============================================================

export type CoachingMessageType =
  | "morning_brief"
  | "evening_summary"
  | "nudge"
  | "celebration";

export type CoachingStyle =
  | "encouraging"
  | "factual"
  | "playful"
  | "urgent";

export interface CoachingEvent {
  /** One of the whatsapp message types */
  message_type: CoachingMessageType;
  /** ISO timestamp of when the message was sent */
  sent_at: string;
  /** UUID of the household that received the message */
  household_id: string;
  /** The coaching style used */
  coaching_style: CoachingStyle;
  /** The full message text that was sent */
  message_text: string;
}

export interface CoachingEffectiveness {
  message_type: CoachingMessageType;
  coaching_style: CoachingStyle;
  /** How many task completions occurred within 2 h of messages with this style */
  completions_within_2h: number;
  /** Total messages of this type+style that were sent */
  total_sent: number;
  /** completions_within_2h / total_sent (0-1) */
  effectiveness_rate: number;
}

// ============================================================
// Internal helper – create a service-role Supabase client.
// Only works in a server/edge context where env vars are set.
// ============================================================

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createServerClient(url, key);
}

// ============================================================
// Public API
// ============================================================

/**
 * Persist a coaching send event.
 * Call this immediately after a WhatsApp message is sent so we have a
 * timestamp to correlate against subsequent task completions.
 */
export async function recordCoachingSent(event: CoachingEvent): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("coaching_events").insert({
      household_id: event.household_id,
      message_type: event.message_type,
      coaching_style: event.coaching_style,
      message_text: event.message_text,
      sent_at: event.sent_at,
    });
    if (error) {
      console.error("[coaching-tracker] Failed to record coaching event:", error.message);
    }
  } catch (err) {
    // Non-fatal: we never want tracking to break the main send flow
    console.error("[coaching-tracker] recordCoachingSent error:", err);
  }
}

/**
 * Measure effectiveness for each (message_type, coaching_style) combination
 * over the last `days` days for a given household.
 *
 * "Effective" means: a task_completions row exists with completed_at within
 * 2 hours after the coaching event's sent_at.
 *
 * Returns an array of CoachingEffectiveness objects, one per
 * (message_type, coaching_style) pair that has at least one send recorded.
 */
export async function measureEffectiveness(
  householdId: string,
  days = 30
): Promise<CoachingEffectiveness[]> {
  try {
    const supabase = getSupabase();

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch coaching events for this household in the window
    const { data: events, error: eventsError } = await supabase
      .from("coaching_events")
      .select("id, message_type, coaching_style, sent_at")
      .eq("household_id", householdId)
      .gte("sent_at", since);

    if (eventsError || !events || events.length === 0) {
      return [];
    }

    // Fetch task completions in the same window (include 2 h buffer)
    const { data: completions, error: completionsError } = await supabase
      .from("task_completions")
      .select("completed_at")
      .eq("household_id", householdId)
      .gte("completed_at", since);

    if (completionsError) {
      console.error("[coaching-tracker] measureEffectiveness completions error:", completionsError.message);
      return [];
    }

    const completionTimes = (completions ?? []).map((c) =>
      new Date(c.completed_at).getTime()
    );

    // Aggregate by (message_type, coaching_style)
    const map = new Map<
      string,
      { message_type: CoachingMessageType; coaching_style: CoachingStyle; completions: number; total: number }
    >();

    for (const ev of events) {
      const key = `${ev.message_type}::${ev.coaching_style}`;
      const sentMs = new Date(ev.sent_at).getTime();
      const twoHoursMs = 2 * 60 * 60 * 1000;

      // Count completions within 2 h after this message
      const count = completionTimes.filter(
        (t) => t >= sentMs && t <= sentMs + twoHoursMs
      ).length;

      if (!map.has(key)) {
        map.set(key, {
          message_type: ev.message_type as CoachingMessageType,
          coaching_style: ev.coaching_style as CoachingStyle,
          completions: 0,
          total: 0,
        });
      }
      const entry = map.get(key)!;
      entry.total += 1;
      entry.completions += count;
    }

    return Array.from(map.values()).map((entry) => ({
      message_type: entry.message_type,
      coaching_style: entry.coaching_style,
      completions_within_2h: entry.completions,
      total_sent: entry.total,
      effectiveness_rate:
        entry.total > 0 ? entry.completions / entry.total : 0,
    }));
  } catch (err) {
    console.error("[coaching-tracker] measureEffectiveness error:", err);
    return [];
  }
}

/**
 * Returns the coaching style with the highest effectiveness_rate for a
 * given household over the last 30 days.
 *
 * Falls back to 'encouraging' when there isn't enough data (< 5 total sends).
 */
export async function getBestCoachingStyle(
  householdId: string
): Promise<CoachingStyle> {
  const effectiveness = await measureEffectiveness(householdId, 30);

  const sufficient = effectiveness.filter((e) => e.total_sent >= 5);
  if (sufficient.length === 0) {
    return "encouraging"; // default / cold start
  }

  // Sort by effectiveness_rate descending; break ties by total_sent
  sufficient.sort((a, b) => {
    if (b.effectiveness_rate !== a.effectiveness_rate) {
      return b.effectiveness_rate - a.effectiveness_rate;
    }
    return b.total_sent - a.total_sent;
  });

  return sufficient[0].coaching_style;
}

/**
 * Convenience: returns all effectiveness rows for the dashboard widget.
 * Aggregates across all message_types so you get a single rate per style.
 */
export async function getStyleSummary(
  householdId: string,
  days = 30
): Promise<
  {
    coaching_style: CoachingStyle;
    total_sent: number;
    completions_within_2h: number;
    effectiveness_rate: number;
  }[]
> {
  const effectiveness = await measureEffectiveness(householdId, days);

  const byStyle = new Map<
    CoachingStyle,
    { total_sent: number; completions_within_2h: number }
  >();

  for (const row of effectiveness) {
    const existing = byStyle.get(row.coaching_style) ?? {
      total_sent: 0,
      completions_within_2h: 0,
    };
    byStyle.set(row.coaching_style, {
      total_sent: existing.total_sent + row.total_sent,
      completions_within_2h:
        existing.completions_within_2h + row.completions_within_2h,
    });
  }

  return Array.from(byStyle.entries()).map(([style, data]) => ({
    coaching_style: style,
    total_sent: data.total_sent,
    completions_within_2h: data.completions_within_2h,
    effectiveness_rate:
      data.total_sent > 0
        ? data.completions_within_2h / data.total_sent
        : 0,
  }));
}
