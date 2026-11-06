"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import { trackEvent } from "@/lib/analytics";
import type {
  TaskCompletionRow,
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
    recurring?: boolean;
  }) => Promise<TaskCompletionRow | null>;
  undoComplete: (taskId: string) => Promise<boolean>;
  getHistory: (taskId: string) => Promise<TaskCompletionRow[]>;
  /** Leaderboard data: completion count per user, sorted descending */
  leaderboard: LeaderboardEntry[];
  /** Set of task IDs that were completed today */
  todayCompletionIds: Set<string>;
  /** Check if a specific task was completed today */
  isCompletedToday: (taskId: string) => boolean;
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
  const supabase = useSupabase();
  const [completions, setCompletions] = useState<TaskCompletionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompletions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
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
  }, [supabase, options.taskId, options.userId, options.limit]);

  useEffect(() => {
    fetchCompletions();
  }, [fetchCompletions]);

  // Compute today's completion IDs (task IDs completed today)
  const todayCompletionIds = useMemo((): Set<string> => {
    const day = (value: Date) => new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(value);
    const today = day(new Date());
    const ids = new Set<string>();
    for (const c of completions) {
      if (day(new Date(c.completed_at)) === today) ids.add(c.task_id);
    }
    return ids;
  }, [completions]);

  const isCompletedToday = useCallback(
    (taskId: string): boolean => todayCompletionIds.has(taskId),
    [todayCompletionIds]
  );

  // Compute leaderboard from completions
  const leaderboard = useMemo((): LeaderboardEntry[] => {
    const counts: Record<string, number> = {};
    for (const c of completions) {
      const uid = c.user_id;
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
      /** If true, don't permanently change the task status (for recurring tasks) */
      recurring?: boolean;
    }): Promise<TaskCompletionRow | null> => {
      try {
        const { data, error: rpcError } = await supabase.rpc("transition_task_completion", {
          p_task_id: params.taskId,
          p_action: "complete",
          p_completion_id: crypto.randomUUID(),
          p_photo_url: params.photoUrl ?? null,
          p_notes: params.notes ?? null,
        }).single();
        if (rpcError || !data) {
          setError("לא ניתן להשלים את המשימה");
          return null;
        }
        setError(null);
        setCompletions((prev) => [data, ...prev.filter((row) => row.id !== data.id)]);
        trackEvent("task_complete");
        return data;
      } catch {
        setError("לא ניתן להשלים את המשימה. יש לנסות שוב כשהחיבור יחזור.");
        return null;
      }
    },
    [supabase]
  );

  const undoComplete = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase.rpc("transition_task_completion", {
        p_task_id: taskId,
        p_action: "undo",
      }).single();
      if (rpcError || !data) {
        setError("לא ניתן לבטל את השלמת המשימה");
        return false;
      }
      setError(null);
      setCompletions((prev) => prev.filter((row) => row.id !== data.id));
      return true;
    } catch {
      setError("לא ניתן לבטל את השלמת המשימה. יש לנסות שוב כשהחיבור יחזור.");
      return false;
    }
  }, [supabase]);

  const getHistory = useCallback(
    async (taskId: string): Promise<TaskCompletionRow[]> => {
      try {
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
    [supabase]
  );

  return {
    completions,
    loading,
    error,
    markComplete,
    undoComplete,
    getHistory,
    leaderboard,
    todayCompletionIds,
    isCompletedToday,
    refetch: fetchCompletions,
  };
}
