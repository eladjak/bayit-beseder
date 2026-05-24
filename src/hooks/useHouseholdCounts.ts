"use client";

/**
 * useHouseholdCounts — counts of tasks + rewards for the household.
 *
 * Used by Smart Guards to detect missing pieces of the game loop.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export type HouseholdCounts = {
  readonly tasks: number;
  readonly rewards: number;
  readonly loading: boolean;
};

export function useHouseholdCounts(): HouseholdCounts {
  const [counts, setCounts] = useState<HouseholdCounts>({
    tasks: 0,
    rewards: 0,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (!cancelled) setCounts({ tasks: 0, rewards: 0, loading: false });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("household_id")
        .eq("id", userData.user.id)
        .single();

      if (!profile?.household_id) {
        if (!cancelled) setCounts({ tasks: 0, rewards: 0, loading: false });
        return;
      }

      const [taskRes, rewardRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("household_id", profile.household_id),
        supabase
          .from("achievements")
          .select("id", { count: "exact", head: true })
          .eq("household_id", profile.household_id),
      ]);

      if (cancelled) return;
      setCounts({
        tasks: taskRes.count ?? 0,
        rewards: rewardRes.count ?? 0,
        loading: false,
      });
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}
