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
 * Hook for CRUD operations on the tasks table.
 * Returns empty array (no error) when Supabase is not connected or table doesn't exist.
 *
 * Note: The "tasks" table is from Phase 3 migration (001_initial.sql).
 * If the table hasn't been created yet, queries will fail gracefully and
 * the dashboard falls back to mock data.
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

      // Use rpc-style raw query since "tasks" is not in the generated Database type yet.
      // The from() call will still work at runtime even if not in the TS type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any).from("tasks").select("*");

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
        setTasks((data as TaskRow[]) ?? []);
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

  const createTask = useCallback(
    async (task: TaskInsert): Promise<TaskRow | null> => {
      try {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: insertError } = await (supabase as any)
          .from("tasks")
          .insert(task)
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          return null;
        }

        const newTask = data as TaskRow;
        setTasks((prev) => [newTask, ...prev]);
        return newTask;
      } catch {
        return null;
      }
    },
    []
  );

  const updateTask = useCallback(
    async (id: string, updates: TaskUpdate): Promise<boolean> => {
      try {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from("tasks")
          .update(updates)
          .eq("id", id);

        if (updateError) {
          setError(updateError.message);
          return false;
        }

        // Update local state immutably
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );

        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (supabase as any)
        .from("tasks")
        .delete()
        .eq("id", id);

      if (deleteError) {
        setError(deleteError.message);
        return false;
      }

      setTasks((prev) => prev.filter((t) => t.id !== id));
      return true;
    } catch {
      return false;
    }
  }, []);

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
