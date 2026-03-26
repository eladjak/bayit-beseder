"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

export interface HouseholdMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: "owner" | "member";
  completedToday: number;
  totalToday: number;
}

/**
 * Hook to fetch all household members with their today's activity.
 * Works with the household_members table for N-member support.
 * Falls back to partner_id for backward compatibility.
 */
export function useHouseholdMembers(householdId: string | null | undefined, todayStr: string) {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!householdId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Get all household members
      const { data: memberRows } = await supabase
        .from("household_members")
        .select("user_id, role")
        .eq("household_id", householdId);

      if (!memberRows || memberRows.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const memberIds = memberRows.map((m) => m.user_id);
      const roleMap = new Map(memberRows.map((m) => [m.user_id, m.role as "owner" | "member"]));

      // Fetch profiles and today's tasks in parallel
      const [{ data: profiles }, { data: todayTasks }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", memberIds),
        supabase
          .from("tasks")
          .select("id, assigned_to, status")
          .in("assigned_to", memberIds)
          .eq("due_date", todayStr),
      ]);

      const tasks = todayTasks ?? [];

      const result: HouseholdMember[] = (profiles ?? []).map((p) => {
        const memberTasks = tasks.filter((t) => t.assigned_to === p.id);
        return {
          id: p.id,
          name: p.display_name ?? "חבר/ת בית",
          avatarUrl: p.avatar_url ?? null,
          role: roleMap.get(p.id) ?? "member",
          completedToday: memberTasks.filter((t) => t.status === "completed").length,
          totalToday: memberTasks.length,
        };
      });

      setMembers(result);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [householdId, todayStr]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, refetch: fetchMembers };
}
