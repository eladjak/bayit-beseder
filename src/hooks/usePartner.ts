"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface PartnerData {
  name: string;
  avatarUrl: string | null;
  completedCount: number;
  totalCount: number;
  recentTasks: string[];
}

const MOCK_PARTNER: PartnerData = {
  name: "השותף/ה",
  avatarUrl: null,
  completedCount: 3,
  totalCount: 8,
  recentTasks: ["החלפת מצעים", "כביסה", "ניקוי כיור אמבטיה"],
};

/**
 * Hook to fetch partner profile and today's task activity.
 * Falls back to mock data when Supabase is not available or no partner is linked.
 */
export function usePartner(partnerId: string | null | undefined, todayStr: string) {
  const [partner, setPartner] = useState<PartnerData>(MOCK_PARTNER);
  const [loading, setLoading] = useState(true);

  const fetchPartner = useCallback(async () => {
    if (!partnerId) {
      setPartner(MOCK_PARTNER);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Fetch partner profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", partnerId)
        .single();

      if (!profileData) {
        setPartner(MOCK_PARTNER);
        setLoading(false);
        return;
      }

      // Fetch partner's tasks for today
      const { data: partnerTasks } = await supabase
        .from("tasks")
        .select("id, title, status")
        .eq("assigned_to", partnerId)
        .eq("due_date", todayStr);

      const tasks = partnerTasks ?? [];
      const completedTasks = tasks.filter((t) => t.status === "completed");

      setPartner({
        name: profileData.display_name ?? "השותף/ה",
        avatarUrl: profileData.avatar_url ?? null,
        completedCount: completedTasks.length,
        totalCount: tasks.length,
        recentTasks: completedTasks.slice(0, 3).map((t) => t.title),
      });
    } catch {
      setPartner(MOCK_PARTNER);
    } finally {
      setLoading(false);
    }
  }, [partnerId, todayStr]);

  useEffect(() => {
    fetchPartner();
  }, [fetchPartner]);

  return { partner, loading };
}
