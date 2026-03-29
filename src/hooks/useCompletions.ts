"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import { trackEvent } from "@/lib/analytics";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
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
    recurring?: boolean;
  }) => Promise<TaskCompletionRow | null>;
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
  const { queueAction, isOnline } = useOfflineQueue();

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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const ids = new Set<string>();
    for (const c of completions) {
      if (new Date(c.completed_at).getTime() >= startOfDay.getTime()) {
        ids.add(c.task_id);
      }
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
      // When offline, queue the action and return an optimistic result
      if (!isOnline) {
        queueAction("complete_task", {
          taskId: params.taskId,
          userId: params.userId,
          householdId: params.householdId ?? null,
          photoUrl: params.photoUrl ?? null,
          notes: params.notes ?? null,
          recurring: params.recurring ?? false,
          timestamp: new Date().toISOString(),
        });

        // Optimistic completion row (will be replaced when queue processes)
        const optimisticRow: TaskCompletionRow = {
          id: `offline-${Date.now()}`,
          task_id: params.taskId,
          user_id: params.userId,
          completed_at: new Date().toISOString(),
          photo_url: params.photoUrl ?? null,
          notes: params.notes ?? null,
        };
        setCompletions((prev) => [optimisticRow, ...prev]);
        trackEvent("task_complete");
        return optimisticRow;
      }

      try {
        const insertion: TaskCompletionInsert = {
          task_id: params.taskId,
          user_id: params.userId,
          photo_url: params.photoUrl ?? null,
          notes: params.notes ?? null,
        };

        const { data, error: insertError } = await supabase
          .from("task_completions")
          .insert(insertion)
          .select()
          .single();

        if (insertError) {
          // Network error — queue for later
          if (!navigator.onLine) {
            queueAction("complete_task", {
              taskId: params.taskId,
              userId: params.userId,
              recurring: params.recurring ?? false,
              timestamp: new Date().toISOString(),
            });
            const optimisticRow: TaskCompletionRow = {
              id: `offline-${Date.now()}`,
              task_id: params.taskId,
              user_id: params.userId,
              completed_at: new Date().toISOString(),
              photo_url: null,
              notes: null,
            };
            setCompletions((prev) => [optimisticRow, ...prev]);
            return optimisticRow;
          }
          console.error("Failed to insert task completion:", insertError);
          setError(insertError.message);
          return null;
        }

        // Only update the permanent task status for non-recurring tasks.
        // Recurring tasks reset daily — their "completed" state is derived
        // from today's task_completions entries.
        if (!params.recurring) {
          const { error: updateError } = await supabase
            .from("tasks")
            .update({ status: "completed" as const })
            .eq("id", params.taskId);

          if (updateError) {
            console.error("Failed to update task status:", updateError);
            setError(updateError.message);
            return null;
          }
        }

        setCompletions((prev) => [data, ...prev]);
        trackEvent("task_complete");
        return data;
      } catch (err) {
        // Network failure — queue the action
        queueAction("complete_task", {
          taskId: params.taskId,
          userId: params.userId,
          recurring: params.recurring ?? false,
          timestamp: new Date().toISOString(),
        });
        const optimisticRow: TaskCompletionRow = {
          id: `offline-${Date.now()}`,
          task_id: params.taskId,
          user_id: params.userId,
          completed_at: new Date().toISOString(),
          photo_url: null,
          notes: null,
        };
        setCompletions((prev) => [optimisticRow, ...prev]);
        return optimisticRow;
      }
    },
    [supabase, isOnline, queueAction]
  );

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
    getHistory,
    leaderboard,
    todayCompletionIds,
    isCompletedToday,
    refetch: fetchCompletions,
  };
}
