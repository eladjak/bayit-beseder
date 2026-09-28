"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface HouseholdData {
  name: string;
  inviteCode: string;
  goldenRuleTarget: number;
  city: string | null;
}

/** Max length for the household city field. Kept in sync with the server-side
 * check in the household update path (no dedicated API route exists yet —
 * writes go directly to Supabase, guarded by RLS — so this constant is the
 * single client-side source of truth used by both the hook and the UI). */
export const HOUSEHOLD_CITY_MAX_LENGTH = 100;

/** Validate + normalize a household city value before it is saved.
 * Returns `null` for an empty/whitespace-only value (the field is optional),
 * or a trimmed string, or `undefined` if the value is invalid (too long). */
export function normalizeHouseholdCity(value: string): string | null | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > HOUSEHOLD_CITY_MAX_LENGTH) return undefined;
  return trimmed;
}

const MOCK_HOUSEHOLD: HouseholdData = {
  name: "הבית שלנו",
  inviteCode: "BAYIT-ABC123",
  goldenRuleTarget: 80,
  city: null,
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
        .select("name, invite_code, golden_rule_target, city")
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
        city: data.city ?? null,
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
    async (updates: Partial<Pick<HouseholdData, "name" | "goldenRuleTarget" | "city">>) => {
      if (!householdId) return false;
      try {
        const supabase = createClient();
        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.goldenRuleTarget !== undefined) dbUpdates.golden_rule_target = updates.goldenRuleTarget;
        if (updates.city !== undefined) dbUpdates.city = updates.city;

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
