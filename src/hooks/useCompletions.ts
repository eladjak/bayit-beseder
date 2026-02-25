"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import type {
  TaskCompletionRow,
  TaskCompletionInsert,
} from "@/lib/types/database";

interface UseCompletionsOptions {
  /** Filter by task id */
  taskId?: string;
  /** Filter by user id (completed_by or legacy user_id) */
  userId?: string;
  /** Maximum number of completions to fetch */
  limit?: number;
}

interface LeaderboardEntry {
  userId: string;
  completionCount: number;
}

interface UseCompletionsReturn {
  completions: TaskCompletionRow[];
  loading: boolean;
  error: string | null;
  markComplete: (params: {
    taskId: string;
    userId: string;
    householdId?: string;
    photoUrl?: string;
    notes?: string;
  }) => Promise<TaskCompletionRow | null>;
  getHistory: (taskId: string) => Promise<TaskCompletionRow[]>;
  /** Leaderboard data: completion count per user, sorted descending */
  leaderboard: LeaderboardEntry[];
  refetch: () => Promise<void>;
}

/**
 * Hook for task completion operations with leaderboard data.
 * Returns empty array (no error) when Supabase is not connected or table doesn't exist.
 * Falls back gracefully - both completed_by (new) and user_id (legacy) columns are supported.
 */
export function useCompletions(
  options: UseCompletionsOptions = {}
): UseCompletionsReturn {
  const [completions, setCompletions] = useState<TaskCompletionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompletions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from("task_completions")
        .select("*")
        .order("completed_at", { ascending: false });

      if (options.taskId) {
        query = query.eq("task_id", options.taskId);
      }
      if (options.userId) {
        query = query.eq("user_id", options.userId);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        setCompletions([]);
      } else {
        setCompletions(data ?? []);
      }
    } catch {
      setCompletions([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [options.taskId, options.userId, options.limit]);

  useEffect(() => {
    fetchCompletions();
  }, [fetchCompletions]);

  // Compute leaderboard from completions
  const leaderboard = useMemo((): LeaderboardEntry[] => {
    const counts: Record<string, number> = {};
    for (const c of completions) {
      const uid = c.completed_by ?? c.user_id;
      counts[uid] = (counts[uid] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([userId, completionCount]) => ({ userId, completionCount }))
      .sort((a, b) => b.completionCount - a.completionCount);
  }, [completions]);

  const markComplete = useCallback(
    async (params: {
      taskId: string;
      userId: string;
      householdId?: string;
      photoUrl?: string;
      notes?: string;
    }): Promise<TaskCompletionRow | null> => {
      try {
        const supabase = createClient();

        const insertion: TaskCompletionInsert = {
          task_id: params.taskId,
          user_id: params.userId,
          completed_by: params.userId,
          household_id: params.householdId ?? null,
          photo_url: params.photoUrl ?? null,
          notes: params.notes ?? null,
        };

        const { data, error: insertError } = await supabase
          .from("task_completions")
          .insert(insertion)
          .select()
          .single();

        if (insertError) {
          console.error("Failed to insert task completion:", insertError);
          setError(insertError.message);
          return null;
        }

        // Also update the task status to completed
        const { error: updateError } = await supabase
          .from("tasks")
          .update({ status: "completed" as const })
          .eq("id", params.taskId);

        if (updateError) {
          console.error("Failed to update task status:", updateError);
          setError(updateError.message);
          return null;
        }

        setCompletions((prev) => [data, ...prev]);
        return data;
      } catch (err) {
        console.error("Unexpected error in markComplete:", err);
        setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
        return null;
      }
    },
    []
  );

  const getHistory = useCallback(
    async (taskId: string): Promise<TaskCompletionRow[]> => {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("task_completions")
          .select("*")
          .eq("task_id", taskId)
          .order("completed_at", { ascending: false });

        if (fetchError) {
          setError(fetchError.message);
          return [];
        }

        return data ?? [];
      } catch {
        return [];
      }
    },
    []
  );

  return {
    completions,
    loading,
    error,
    markComplete,
    getHistory,
    leaderboard,
    refetch: fetchCompletions,
  };
}
