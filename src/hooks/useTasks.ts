"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import { useProfile } from "@/hooks/useProfile";
import type { TaskRow, TaskInsert, TaskUpdate } from "@/lib/types/database";

interface UseTasksOptions {
  /** Filter by assigned user id */
  assignedTo?: string;
  /** Filter by status */
  status?: TaskRow["status"];
  /** Filter by due date (ISO date string, e.g. "2026-02-17") */
  dueDate?: string;
  /** Filter by category_id */
  categoryId?: string;
  /** Enable Supabase Realtime subscription for live updates */
  realtime?: boolean;
}

interface UseTasksReturn {
  tasks: TaskRow[];
  loading: boolean;
  error: string | null;
  createTask: (task: Omit<TaskInsert, "household_id"> & { household_id?: string }) => Promise<TaskRow | null>;
  updateTask: (id: string, updates: TaskUpdate) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Hook for CRUD operations on the tasks table with optional Realtime subscription.
 * Returns empty array (no error) when Supabase is not connected or table doesn't exist.
 */
export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const supabase = useSupabase();
  const { profile } = useProfile();
  const householdId = profile?.household_id ?? null;
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const fetchTasks = useCallback(async () => {
    // Only show loading spinner on initial fetch — refetches keep current data visible
    if (!initialLoadDone.current) {
      setLoading(true);
    }
    setError(null);

    // Tasks are household-scoped (migration 014). Without a household there is
    // nothing to show, and RLS would reject the query anyway.
    if (!householdId) {
      setTasks([]);
      setLoading(false);
      initialLoadDone.current = true;
      return;
    }

    try {
      let query = supabase.from("tasks").select("*").eq("household_id", householdId);

      if (options.assignedTo) {
        query = query.eq("assigned_to", options.assignedTo);
      }
      if (options.status) {
        query = query.eq("status", options.status);
      }
      if (options.dueDate) {
        query = query.eq("due_date", options.dueDate);
      }
      if (options.categoryId) {
        query = query.eq("category_id", options.categoryId);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        // Table might not exist yet - graceful fallback
        setError(fetchError.message);
        setTasks([]);
      } else {
        setTasks(data ?? []);
      }
    } catch {
      // Supabase not available
      setTasks([]);
      setError(null);
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, [supabase, householdId, options.assignedTo, options.status, options.dueDate, options.categoryId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription for live task updates
  useEffect(() => {
    if (!options.realtime || !householdId) return;

    try {
      const channel = supabase
        .channel(`tasks-realtime-${householdId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `household_id=eq.${householdId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newTask = payload.new as TaskRow;
              setTasks((prev) => [newTask, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              const updated = payload.new as TaskRow;
              setTasks((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t))
              );
            } else if (payload.eventType === "DELETE") {
              const deleted = payload.old as { id: string };
              setTasks((prev) => prev.filter((t) => t.id !== deleted.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Realtime not available - silently ignore
    }
  }, [supabase, options.realtime, householdId]);

  const createTask = useCallback(
    async (task: Omit<TaskInsert, "household_id"> & { household_id?: string }): Promise<TaskRow | null> => {
      // household_id is NOT NULL (migration 014) — inject the caller's household.
      const resolvedHouseholdId = task.household_id ?? householdId;
      if (!resolvedHouseholdId) {
        setError("No household — cannot create task");
        return null;
      }
      try {
        const { data, error: insertError } = await supabase
          .from("tasks")
          .insert({ ...task, household_id: resolvedHouseholdId })
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          return null;
        }

        // Always update local state immediately (optimistic).
        // Realtime will deduplicate via the UPDATE handler.
        setTasks((prev) => [data, ...prev]);
        return data;
      } catch {
        return null;
      }
    },
    [supabase, householdId]
  );

  const updateTask = useCallback(
    async (id: string, updates: TaskUpdate): Promise<boolean> => {
      try {
        const { error: updateError } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", id);

        if (updateError) {
          setError(updateError.message);
          return false;
        }

        // Always update local state immediately (optimistic).
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );

        return true;
      } catch {
        return false;
      }
    },
    [supabase]
  );

  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from("tasks")
          .delete()
          .eq("id", id);

        if (deleteError) {
          setError(deleteError.message);
          return false;
        }

        // Always update local state immediately (optimistic).
        setTasks((prev) => prev.filter((t) => t.id !== id));
        return true;
      } catch {
        return false;
      }
    },
    [supabase]
  );

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks,
  };
}
