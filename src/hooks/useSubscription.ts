"use client";

// Sumit integration deferred (2026-05-17).
// Migrations 010+011 reference `public.households` / `public.household_members` tables
// that do not exist in this database. Hardcoded "free" tier for every user until a
// proper subscription schema is decided.
//
// If/when subscription DB is ready: re-enable the supabase lookup below by uncommenting
// the useEffect block. Hook signature stays the same — call sites unchanged.

import { useState } from "react";

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

export function useSubscription(_householdId?: string | null): UseSubscriptionReturn {
  // Hardcoded "free" until subscription schema is decided. See banner comment above.
  const [tier] = useState<SubscriptionTier>("free");

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
