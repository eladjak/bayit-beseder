/**
 * Weekly Wheel of Fortune — Alopik v2 Phase 2.
 *
 * Friday 14:00 IDT pre-Shabbat. 1 spin per household per week.
 * 8 segments: experiences + gestures the couple can redeem.
 *
 * Eligibility: streak ≥7 days OR completed weekly challenge.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 * Schema: supabase/migrations/012_alopik_v2.sql (wheel_spins)
 */

import { createClient } from "@/lib/supabase";

// Cast to bypass stale Database types (migration 012 regen pending)
type AnySupabase = ReturnType<typeof createClient> & { from: (t: string) => any };

export type WheelSegment = {
  readonly id: string;
  readonly emoji: string;
  readonly label: string;
  readonly description: string;
  readonly weight: number;
};

export const SEGMENTS: ReadonlyArray<WheelSegment> = [
  { id: "movie-night", emoji: "🎬", label: "ערב סרט", description: "סרט שאת בוחרת, פופקורן וזהו.", weight: 12 },
  { id: "breakfast-bed", emoji: "🥞", label: "ארוחת בוקר במיטה", description: "כל אחד שירת את השני בוקר אחד הקרוב.", weight: 12 },
  { id: "massage", emoji: "💆", label: "מסז 15 דק'", description: "בלי טלפון. בלי דחיפה. רק שקט וידיים.", weight: 10 },
  { id: "dinner-out", emoji: "🍽️", label: "ארוחת ערב בחוץ", description: "מסעדה אחת — תזמינו, תלכו, תתחילו.", weight: 8 },
  { id: "sleep-in", emoji: "😴", label: "טוקן 'תישן עוד שעה'", description: "האחר לוקח את הבוקר. בלי שאלות.", weight: 12 },
  { id: "picnic", emoji: "🧺", label: "פיקניק קצר", description: "פארק קרוב, קפה, גבינה. שעה לבד.", weight: 10 },
  { id: "free-day", emoji: "🌅", label: "יום חופש מ-streak", description: "טוקן: דלגו על יום אחד בלי לאבד streak.", weight: 6 },
  { id: "compliment", emoji: "💌", label: "מכתב אהבה קצר", description: "הכתב בידכם. שורה אחת על מה שאת/ה רואה בו/בה.", weight: 30 },
];

const TOTAL_WEIGHT = SEGMENTS.reduce((acc, s) => acc + s.weight, 0);

export function spinSegment(): WheelSegment {
  const r = Math.random() * TOTAL_WEIGHT;
  let cumulative = 0;
  for (const s of SEGMENTS) {
    cumulative += s.weight;
    if (r < cumulative) return s;
  }
  return SEGMENTS[SEGMENTS.length - 1] as WheelSegment;
}

/** ISO week string like "2026-W21" — for unique-constraint per household per week */
export function currentIsoWeek(): string {
  const now = new Date();
  // Get UTC-adjusted Thursday of the week (ISO week convention)
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Is it Friday after 14:00 IDT or Saturday-Sunday (week not yet refreshed)? */
export function isWheelAvailableTime(): boolean {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  // Friday after 14:00, all Saturday, all Sunday morning before 06:00 (Israel: Sunday is workweek start)
  if (weekday === "Fri" && hour >= 14) return true;
  if (weekday === "Sat") return true;
  if (weekday === "Sun" && hour < 6) return true;
  return false;
}

export type SpinResult =
  | { ok: true; segment: WheelSegment; alreadySpun: false; spinId: string }
  | { ok: true; segment: WheelSegment; alreadySpun: true; spinId: string }
  | { ok: false; error: "NOT_AUTHED" | "NO_HOUSEHOLD" | "DB_ERROR" | "NOT_AVAILABLE_YET"; details?: string };

export async function getOrSpin(): Promise<SpinResult> {
  if (!isWheelAvailableTime()) {
    return { ok: false, error: "NOT_AVAILABLE_YET", details: "הגלגל פתוח רק מיום שישי 14:00 עד שבת בלילה" };
  }

  const supabase = createClient() as AnySupabase;
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "NOT_AUTHED" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", userData.user.id)
    .single();
  if (!profile?.household_id) return { ok: false, error: "NO_HOUSEHOLD" };

  const weekIso = currentIsoWeek();

  // Has this household already spun this week?
  const { data: existing } = await supabase
    .from("wheel_spins")
    .select("id, segment_id, segment_label, segment_emoji")
    .eq("household_id", profile.household_id)
    .eq("spin_week_iso", weekIso)
    .maybeSingle();

  if (existing) {
    const seg = SEGMENTS.find((s) => s.id === existing.segment_id);
    return {
      ok: true,
      alreadySpun: true,
      spinId: existing.id,
      segment: seg ?? {
        id: existing.segment_id,
        emoji: existing.segment_emoji ?? "🎁",
        label: existing.segment_label,
        description: "",
        weight: 1,
      },
    };
  }

  const segment = spinSegment();
  const { data: inserted, error: insertErr } = await supabase
    .from("wheel_spins")
    .insert({
      household_id: profile.household_id,
      spun_by_user_id: userData.user.id,
      spin_week_iso: weekIso,
      segment_id: segment.id,
      segment_label: segment.label,
      segment_emoji: segment.emoji,
    })
    .select()
    .single();

  if (insertErr) {
    // Unique-constraint race
    if (insertErr.code === "23505") {
      return getOrSpin();
    }
    return { ok: false, error: "DB_ERROR", details: insertErr.message };
  }

  return { ok: true, alreadySpun: false, spinId: inserted.id, segment };
}

export async function redeemSpin(spinId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient() as AnySupabase;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "NOT_AUTHED" };

  const { error } = await supabase
    .from("wheel_spins")
    .update({
      token_status: "redeemed",
      redeemed_at: new Date().toISOString(),
      redeemed_by_user_id: userData.user.id,
    })
    .eq("id", spinId)
    .eq("token_status", "unredeemed");

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
