"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface HouseholdData {
  name: string;
  inviteCode: string;
  goldenRuleTarget: number;
}

const MOCK_HOUSEHOLD: HouseholdData = {
  name: "הבית של אלעד ואינבל",
  inviteCode: "BAYIT-ABC123",
  goldenRuleTarget: 80,
};

/**
 * Hook to fetch household data from Supabase.
 * Falls back to mock data when Supabase is not available or no household is linked.
 */
export function useHousehold(householdId: string | null | undefined) {
  const [household, setHousehold] = useState<HouseholdData>(MOCK_HOUSEHOLD);
  const [loading, setLoading] = useState(true);

  const fetchHousehold = useCallback(async () => {
    if (!householdId) {
      setHousehold(MOCK_HOUSEHOLD);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const { data } = await supabase
        .from("households")
        .select("name, invite_code, golden_rule_target")
        .eq("id", householdId)
        .single();

      if (!data) {
        setHousehold(MOCK_HOUSEHOLD);
        setLoading(false);
        return;
      }

      setHousehold({
        name: data.name,
        inviteCode: data.invite_code,
        goldenRuleTarget: data.golden_rule_target ?? 80,
      });
    } catch {
      setHousehold(MOCK_HOUSEHOLD);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  const updateHousehold = useCallback(
    async (updates: Partial<Pick<HouseholdData, "name" | "goldenRuleTarget">>) => {
      if (!householdId) return false;
      try {
        const supabase = createClient();
        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.goldenRuleTarget !== undefined) dbUpdates.golden_rule_target = updates.goldenRuleTarget;

        const { error } = await supabase
          .from("households")
          .update(dbUpdates)
          .eq("id", householdId);

        if (error) return false;

        setHousehold((prev) => ({ ...prev, ...updates }));
        return true;
      } catch {
        return false;
      }
    },
    [householdId]
  );

  return { household, loading, updateHousehold };
}
