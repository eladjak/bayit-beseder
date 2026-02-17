"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type {
  TaskCompletionRow,
  TaskCompletionInsert,
} from "@/lib/types/database";

interface UseCompletionsOptions {
  /** Filter by task id */
  taskId?: string;
  /** Filter by user id */
  userId?: string;
  /** Maximum number of completions to fetch */
  limit?: number;
}

interface UseCompletionsReturn {
  completions: TaskCompletionRow[];
  loading: boolean;
  error: string | null;
  markComplete: (params: {
    taskId: string;
    userId: string;
    photoUrl?: string;
    notes?: string;
  }) => Promise<TaskCompletionRow | null>;
  getHistory: (taskId: string) => Promise<TaskCompletionRow[]>;
  refetch: () => Promise<void>;
}

/**
 * Hook for task completion operations.
 * Returns empty array (no error) when Supabase is not connected or table doesn't exist.
 *
 * Note: The "task_completions" table is from Phase 3 migration (001_initial.sql).
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
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
        setCompletions((data as TaskCompletionRow[]) ?? []);
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

  const markComplete = useCallback(
    async (params: {
      taskId: string;
      userId: string;
      photoUrl?: string;
      notes?: string;
    }): Promise<TaskCompletionRow | null> => {
      try {
        const supabase = createClient();

        const insertion: TaskCompletionInsert = {
          task_id: params.taskId,
          user_id: params.userId,
          photo_url: params.photoUrl ?? null,
          notes: params.notes ?? null,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: insertError } = await (supabase as any)
          .from("task_completions")
          .insert(insertion)
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          return null;
        }

        const completion = data as TaskCompletionRow;

        // Also update the task status to completed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("tasks")
          .update({ status: "completed" })
          .eq("id", params.taskId);

        setCompletions((prev) => [completion, ...prev]);
        return completion;
      } catch {
        return null;
      }
    },
    []
  );

  const getHistory = useCallback(
    async (taskId: string): Promise<TaskCompletionRow[]> => {
      try {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: fetchError } = await (supabase as any)
          .from("task_completions")
          .select("*")
          .eq("task_id", taskId)
          .order("completed_at", { ascending: false });

        if (fetchError) {
          setError(fetchError.message);
          return [];
        }

        return (data as TaskCompletionRow[]) ?? [];
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
    refetch: fetchCompletions,
  };
}
