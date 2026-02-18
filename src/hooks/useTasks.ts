"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
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
  createTask: (task: TaskInsert) => Promise<TaskRow | null>;
  updateTask: (id: string, updates: TaskUpdate) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Hook for CRUD operations on the tasks table with optional Realtime subscription.
 * Returns empty array (no error) when Supabase is not connected or table doesn't exist.
 */
export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      let query = supabase.from("tasks").select("*");

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
    }
  }, [options.assignedTo, options.status, options.dueDate, options.categoryId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription for live task updates
  useEffect(() => {
    if (!options.realtime) return;

    try {
      const supabase = createClient();
      const channel = supabase
        .channel("tasks-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks" },
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
  }, [options.realtime]);

  const createTask = useCallback(
    async (task: TaskInsert): Promise<TaskRow | null> => {
      try {
        const supabase = createClient();
        const { data, error: insertError } = await supabase
          .from("tasks")
          .insert(task)
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          return null;
        }

        // If not using realtime, update local state
        if (!options.realtime) {
          setTasks((prev) => [data, ...prev]);
        }
        return data;
      } catch {
        return null;
      }
    },
    [options.realtime]
  );

  const updateTask = useCallback(
    async (id: string, updates: TaskUpdate): Promise<boolean> => {
      try {
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", id);

        if (updateError) {
          setError(updateError.message);
          return false;
        }

        // If not using realtime, update local state immutably
        if (!options.realtime) {
          setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
          );
        }

        return true;
      } catch {
        return false;
      }
    },
    [options.realtime]
  );

  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const supabase = createClient();
        const { error: deleteError } = await supabase
          .from("tasks")
          .delete()
          .eq("id", id);

        if (deleteError) {
          setError(deleteError.message);
          return false;
        }

        // If not using realtime, update local state
        if (!options.realtime) {
          setTasks((prev) => prev.filter((t) => t.id !== id));
        }
        return true;
      } catch {
        return false;
      }
    },
    [options.realtime]
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
