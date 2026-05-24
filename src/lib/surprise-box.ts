/**
 * Daily Surprise Box — Alopik v2 #2.
 *
 * First-task-of-day completion triggers a box. Random reward.
 * Time-aware messaging (morning/afternoon/evening).
 *
 * Distribution: 70% small / 25% medium / 5% large.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md (commit b0f7561)
 * Schema: supabase/migrations/012_alopik_v2.sql (surprise_box_opens)
 */

import { createClient } from "@/lib/supabase";

// NOTE: surprise_box_opens table added in migration 012 — Database type
// regen pending. Cast to bypass stale types until regen runs post-deploy.
type AnySupabase = ReturnType<typeof createClient> & { from: (t: string) => any; rpc: (n: string, a?: any) => any };

export type RewardTier = "small" | "medium" | "large";
export type RewardType =
  | "bonus_points"
  | "background_unlock"
  | "avatar_unlock"
  | "free_pass_token";

export type Reward = {
  readonly tier: RewardTier;
  readonly type: RewardType;
  readonly value: Record<string, unknown>;
  readonly displayLabel: string;
  readonly emoji: string;
};

const SMALL_REWARDS: ReadonlyArray<() => Reward> = [
  () => ({
    tier: "small",
    type: "bonus_points",
    value: { points: 10 },
    displayLabel: "10 נקודות בונוס",
    emoji: "⭐",
  }),
  () => ({
    tier: "small",
    type: "bonus_points",
    value: { points: 20 },
    displayLabel: "20 נקודות בונוס",
    emoji: "✨",
  }),
  () => ({
    tier: "small",
    type: "bonus_points",
    value: { points: 30 },
    displayLabel: "30 נקודות בונוס",
    emoji: "🌟",
  }),
];

const MEDIUM_REWARDS: ReadonlyArray<() => Reward> = [
  () => ({
    tier: "medium",
    type: "background_unlock",
    value: { background_id: "sunrise" },
    displayLabel: "רקע 'זריחה' נפתח",
    emoji: "🌅",
  }),
  () => ({
    tier: "medium",
    type: "background_unlock",
    value: { background_id: "ocean" },
    displayLabel: "רקע 'ים' נפתח",
    emoji: "🌊",
  }),
  () => ({
    tier: "medium",
    type: "avatar_unlock",
    value: { avatar_id: "fox" },
    displayLabel: "אווטר 'שועל' נפתח",
    emoji: "🦊",
  }),
];

const LARGE_REWARDS: ReadonlyArray<() => Reward> = [
  () => ({
    tier: "large",
    type: "free_pass_token",
    value: { token_count: 1 },
    displayLabel: "כרטיס פטור — דלג על משימה אחת בלי לאבד streak",
    emoji: "🎫",
  }),
];

const pick = <T>(arr: ReadonlyArray<T>): T => arr[Math.floor(Math.random() * arr.length)] as T;

export function rollReward(): Reward {
  const r = Math.random();
  if (r < 0.05) return pick(LARGE_REWARDS)();
  if (r < 0.30) return pick(MEDIUM_REWARDS)();
  return pick(SMALL_REWARDS)();
}

export function getTimeAwareGreeting(): { greeting: string; ctaPrefix: string } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(fmt.format(new Date()), 10);
  if (hour >= 5 && hour < 12) return { greeting: "בוקר טוב!", ctaPrefix: "פתחת את היום נכון" };
  if (hour >= 12 && hour < 17) return { greeting: "צהריים טובים!", ctaPrefix: "עוד צעד קדימה" };
  if (hour >= 17 && hour < 22) return { greeting: "ערב טוב!", ctaPrefix: "סיימת יום טוב" };
  return { greeting: "שלום!", ctaPrefix: "תודה שאתה כאן" };
}

function todayInIsrael(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? "1970";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export type OpenBoxResult =
  | { ok: true; reward: Reward; alreadyOpened: false }
  | { ok: true; reward: null; alreadyOpened: true }
  | { ok: false; error: "NOT_AUTHED" | "NO_HOUSEHOLD" | "DB_ERROR"; details?: string };

export async function openTodayBox(): Promise<OpenBoxResult> {
  const supabase = createClient() as AnySupabase;
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "NOT_AUTHED" };

  const today = todayInIsrael();

  // Check if already opened today
  const { data: existing } = await supabase
    .from("surprise_box_opens")
    .select("id")
    .eq("user_id", userData.user.id)
    .eq("opened_date", today)
    .maybeSingle();

  if (existing) return { ok: true, reward: null, alreadyOpened: true };

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", userData.user.id)
    .single();

  if (!profile?.household_id) return { ok: false, error: "NO_HOUSEHOLD" };

  const reward = rollReward();

  const { error: insertErr } = await supabase.from("surprise_box_opens").insert({
    household_id: profile.household_id,
    user_id: userData.user.id,
    opened_date: today,
    reward_tier: reward.tier,
    reward_type: reward.type,
    reward_value: reward.value,
  });

  if (insertErr) {
    // Unique-constraint violation = race condition, treat as already opened
    if (insertErr.code === "23505") return { ok: true, reward: null, alreadyOpened: true };
    return { ok: false, error: "DB_ERROR", details: insertErr.message };
  }

  // Actually GRANT the reward — bonus_points credit profiles.points (atomic RPC).
  // Medal trigger (migration 013) auto-fires on 50-point crossings.
  if (reward.type === "bonus_points") {
    const pts = (reward.value as { points?: number }).points;
    if (typeof pts === "number" && pts > 0) {
      await supabase.rpc("increment_user_points", { p_amount: pts });
    }
  }

  return { ok: true, reward, alreadyOpened: false };
}

export async function isBoxAvailableToday(): Promise<boolean> {
  const supabase = createClient() as AnySupabase;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const today = todayInIsrael();
  const { data } = await supabase
    .from("surprise_box_opens")
    .select("id")
    .eq("user_id", userData.user.id)
    .eq("opened_date", today)
    .maybeSingle();
  return !data;
}
