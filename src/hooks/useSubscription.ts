"use client";

// Real Sumit-backed subscription lookup (2026-09-28). Previously hardcoded to
// "free" because migrations 010/011 referenced a schema that didn't exist in
// this database — that gap is closed by supabase/migrations/022_billing.sql.
//
// ONE paid tier: Plus, 19₪/month per household (Elad, 28.9.2026). The
// `family` tier and its 3 family-only gated features were removed entirely —
// they were never a real, purchasable thing.

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

export type SubscriptionTier = "free" | "plus";

// Feature keys that can be gated
export type GatedFeature =
  | "wizard"           // AI weekly planning wizard
  | "stats_full"       // Full statistics page
  | "coaching"         // AI coaching tips
  | "seasonal"         // Seasonal modes (Pesach, etc.)
  | "zone_scheduling"  // Zone-based scheduling
  | "custom_categories"// Custom task/shopping categories
  | "whatsapp"         // WhatsApp reminders
  | "unlimited_tasks"  // Tasks above the 25-task free limit
  | "achievements_full"// All 24 achievements (free gets 5)
  | "weekly_challenges"// Weekly challenge quests
  | "leaderboard"      // Household leaderboard
  | "export";          // CSV/PDF export

// Feature access matrix per tier — exported so /upgrade can render the real
// gated-feature list instead of a hand-maintained duplicate that can drift.
export const FEATURE_MATRIX: Record<SubscriptionTier, Set<GatedFeature>> = {
  free: new Set([
    // Free tier gets nothing from the gated list — base features are ungated
  ]),
  plus: new Set([
    "wizard",
    "stats_full",
    "coaching",
    "seasonal",
    "zone_scheduling",
    "custom_categories",
    "whatsapp",
    "unlimited_tasks",
    "achievements_full",
    "weekly_challenges",
    "leaderboard",
    "export",
  ]),
};

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: "active" | "past_due" | "canceled" | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
}

export interface UseSubscriptionReturn {
  tier: SubscriptionTier;
  status: SubscriptionInfo["status"];
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  /** True until the real subscription has resolved from Supabase — never
   * grant Plus access based on a guess, so callers should treat this the
   * same as `isFree` while it's true. */
  loading: boolean;
  canUse: (feature: GatedFeature) => boolean;
  isPlus: boolean;
  isFree: boolean;
  maxTasks: number;
  maxMembers: number;
  refresh: () => void;
}

export function useSubscription(householdId?: string | null): UseSubscriptionReturn {
  // Default to "free" and never flash Plus access before the real row is
  // confirmed — the loading state stays "free" the whole time it's loading.
  // Kept as ONE state object (instead of 4 separate useState calls) so every
  // branch below only ever needs a single setState call — calling setState
  // synchronously and repeatedly within an effect body triggers cascading
  // renders (react-hooks/set-state-in-effect).
  const FREE_INFO: SubscriptionInfo = { tier: "free", status: null, currentPeriodEnd: null, canceledAt: null };
  const [info, setInfo] = useState<SubscriptionInfo>(FREE_INFO);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!householdId) {
      setInfo(FREE_INFO);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    supabase
      .from("subscriptions")
      .select("tier, status, current_period_end, canceled_at")
      .eq("household_id", householdId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          // No active row (or a lookup failure) — free tier, never guess Plus.
          setInfo(FREE_INFO);
        } else {
          setInfo({
            tier: data.tier === "plus" ? "plus" : "free",
            status: data.status as SubscriptionInfo["status"],
            currentPeriodEnd: data.current_period_end ?? null,
            canceledAt: data.canceled_at ?? null,
          });
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- FREE_INFO is a fresh object literal every render on purpose (it's a constant value, not state)
  }, [householdId, refreshTick]);

  const { tier, status, currentPeriodEnd, canceledAt } = info;

  const canUse = (feature: GatedFeature): boolean => {
    return FEATURE_MATRIX[tier].has(feature);
  };

  return {
    tier,
    status,
    currentPeriodEnd,
    canceledAt,
    loading,
    canUse,
    isPlus: tier === "plus",
    isFree: tier === "free",
    maxTasks: tier === "free" ? 25 : Infinity,
    maxMembers: 2,
    refresh: () => setRefreshTick((t) => t + 1),
  };
}
