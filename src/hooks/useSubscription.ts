"use client";

// Sumit (sumit.co.il) integration — migrated from Stripe stub on 2026-05-14.
// The hook now fetches the real tier from `public.subscriptions` (migration 010+011).
// Sumit webhook at /api/sumit/webhook upserts subscription rows.
// Fallback to "free" when no row exists.

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

export type SubscriptionTier = "free" | "plus" | "family";

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
  | "export"           // CSV/PDF export
  | "family_members"   // More than 2 household members (family tier)
  | "child_profiles"   // Child profiles with pocket-money points (family tier)
  | "parent_approval"; // Parent task approval (family tier)

// Feature access matrix per tier
const FEATURE_MATRIX: Record<SubscriptionTier, Set<GatedFeature>> = {
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
  family: new Set([
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
    "family_members",
    "child_profiles",
    "parent_approval",
  ]),
};

export interface UseSubscriptionReturn {
  tier: SubscriptionTier;
  canUse: (feature: GatedFeature) => boolean;
  isPlus: boolean;
  isFamily: boolean;
  isFree: boolean;
  maxTasks: number;
  maxMembers: number;
}

export function useSubscription(householdId?: string | null): UseSubscriptionReturn {
  const [tier, setTier] = useState<SubscriptionTier>("free");

  useEffect(() => {
    if (!householdId || !isSupabaseConfigured()) return;
    const supabase = createClient();
    let cancelled = false;
    supabase
      .from("subscriptions")
      .select("tier,status")
      .eq("household_id", householdId)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }: { data: { tier: SubscriptionTier; status: string } | null }) => {
        if (cancelled) return;
        if (data?.tier && (data.tier === "plus" || data.tier === "family")) {
          setTier(data.tier);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  const canUse = (feature: GatedFeature): boolean => {
    return FEATURE_MATRIX[tier].has(feature);
  };

  return {
    tier,
    canUse,
    isPlus: tier === "plus" || tier === "family",
    isFamily: tier === "family",
    isFree: tier === "free",
    maxTasks: tier === "free" ? 25 : Infinity,
    maxMembers: tier === "family" ? 6 : 2,
  };
}
