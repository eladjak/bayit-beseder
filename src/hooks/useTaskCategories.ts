"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

export interface TaskCategoryRow {
  id: string;
  household_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
}

/** Default categories seeded from the hardcoded categories.ts definitions */
const DEFAULT_TASK_CATEGORIES: Omit<TaskCategoryRow, "id" | "household_id" | "created_at">[] = [
  { name: "מטבח", icon: "🍳", color: "#F59E0B", sort_order: 0 },
  { name: "אמבטיה", icon: "🚿", color: "#3B82F6", sort_order: 1 },
  { name: "סלון", icon: "🛋️", color: "#8B5CF6", sort_order: 2 },
  { name: "חדר שינה", icon: "🛏️", color: "#EC4899", sort_order: 3 },
  { name: "כביסה", icon: "👕", color: "#06B6D4", sort_order: 4 },
  { name: "חוץ", icon: "🌳", color: "#84CC16", sort_order: 5 },
  { name: "חיות מחמד", icon: "🐾", color: "#F97316", sort_order: 6 },
  { name: "כללי", icon: "✨", color: "#10B981", sort_order: 7 },
];

interface UseTaskCategoriesReturn {
  taskCategories: TaskCategoryRow[];
  loading: boolean;
  addTaskCategory: (name: string, icon: string, color: string) => Promise<void>;
  updateTaskCategory: (id: string, updates: { name?: string; icon?: string; color?: string }) => Promise<void>;
  deleteTaskCategory: (id: string) => Promise<void>;
  reorderTaskCategories: (orderedIds: string[]) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTaskCategories(): UseTaskCategoriesReturn {
  const [taskCategories, setTaskCategories] = useState<TaskCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const seedingRef = useRef(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const catTable = () => createClient().from("task_categories" as any);

  const getHouseholdId = useCallback(async (): Promise<string | null> => {
    if (!isSupabaseConfigured()) return null;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .single();
    return (profile?.household_id as string) ?? null;
  }, []);

  const fetchCategories = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setTaskCategories(
        DEFAULT_TASK_CATEGORIES.map((c, i) => ({
          ...c,
          id: `default-task-${i}`,
          household_id: "mock",
          created_at: new Date().toISOString(),
        }))
      );
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await catTable()
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        // Table may not exist yet — fall back to defaults
        setTaskCategories(
          DEFAULT_TASK_CATEGORIES.map((c, i) => ({
            ...c,
            id: `default-task-${i}`,
            household_id: "mock",
            created_at: new Date().toISOString(),
          }))
        );
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as TaskCategoryRow[];
      if (rows.length > 0) {
        setTaskCategories(rows);
      } else if (!seedingRef.current) {
        // Auto-seed the 8 default categories for this household
        seedingRef.current = true;
        const householdId = await getHouseholdId();
        if (householdId) {
          const seedRows = DEFAULT_TASK_CATEGORIES.map((c) => ({
            ...c,
            household_id: householdId,
          }));
          const { data: seeded } = await catTable().insert(seedRows).select();
          if (seeded) {
            setTaskCategories(seeded as unknown as TaskCategoryRow[]);
          }
        } else {
          // Not authenticated yet — show defaults
          setTaskCategories(
            DEFAULT_TASK_CATEGORIES.map((c, i) => ({
              ...c,
              id: `default-task-${i}`,
              household_id: "mock",
              created_at: new Date().toISOString(),
            }))
          );
        }
      }
    } catch {
      setTaskCategories(
        DEFAULT_TASK_CATEGORIES.map((c, i) => ({
          ...c,
          id: `default-task-${i}`,
          household_id: "mock",
          created_at: new Date().toISOString(),
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [getHouseholdId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Realtime subscription
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    try {
      const supabase = createClient();
      const channel = supabase
        .channel("task-categories-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "task_categories" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setTaskCategories((prev) =>
                [...prev, payload.new as TaskCategoryRow].sort(
                  (a, b) => a.sort_order - b.sort_order
                )
              );
            } else if (payload.eventType === "UPDATE") {
              const updated = payload.new as TaskCategoryRow;
              setTaskCategories((prev) =>
                prev
                  .map((c) => (c.id === updated.id ? updated : c))
                  .sort((a, b) => a.sort_order - b.sort_order)
              );
            } else if (payload.eventType === "DELETE") {
              const deleted = payload.old as { id: string };
              setTaskCategories((prev) => prev.filter((c) => c.id !== deleted.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Realtime not available
    }
  }, []);

  const addTaskCategory = useCallback(
    async (name: string, icon: string, color: string) => {
      const householdId = await getHouseholdId();
      if (!householdId) return;

      const maxOrder = taskCategories.reduce(
        (max, c) => Math.max(max, c.sort_order),
        -1
      );
      await catTable().insert({
        household_id: householdId,
        name,
        icon,
        color,
        sort_order: maxOrder + 1,
      });
      // Realtime will update state
    },
    [taskCategories, getHouseholdId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const updateTaskCategory = useCallback(
    async (id: string, updates: { name?: string; icon?: string; color?: string }) => {
      // Optimistic update
      setTaskCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
      const { error } = await catTable().update(updates).eq("id", id);
      if (error) {
        await fetchCategories();
      }
    },
    [fetchCategories] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const deleteTaskCategory = useCallback(
    async (id: string) => {
      // Optimistic
      setTaskCategories((prev) => prev.filter((c) => c.id !== id));
      const { error } = await catTable().delete().eq("id", id);
      if (error) {
        await fetchCategories();
      }
    },
    [fetchCategories] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const reorderTaskCategories = useCallback(async (orderedIds: string[]) => {
    // Optimistic
    setTaskCategories((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      return orderedIds
        .map((id, i) => {
          const cat = map.get(id);
          return cat ? { ...cat, sort_order: i } : null;
        })
        .filter((c): c is TaskCategoryRow => c !== null);
    });

    // Batch update
    const updates = orderedIds.map((id, i) =>
      catTable().update({ sort_order: i }).eq("id", id)
    );
    await Promise.all(updates);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    taskCategories,
    loading,
    addTaskCategory,
    updateTaskCategory,
    deleteTaskCategory,
    reorderTaskCategories,
    refetch: fetchCategories,
  };
}
