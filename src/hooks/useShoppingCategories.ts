"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

export interface ShoppingCategoryRow {
  id: string;
  household_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
}

/** Default categories seeded when a household has none */
const DEFAULT_CATEGORIES: Omit<ShoppingCategoryRow, "id" | "household_id" | "created_at">[] = [
  { name: "ירקות", icon: "🥬", color: "#22C55E", sort_order: 0 },
  { name: "פירות", icon: "🍎", color: "#F97316", sort_order: 1 },
  { name: "עשבי תיבול", icon: "🌿", color: "#84CC16", sort_order: 2 },
  { name: "מוצרי בסיס", icon: "🧂", color: "#F59E0B", sort_order: 3 },
  { name: "מוצרי חלב", icon: "🧈", color: "#FCD34D", sort_order: 4 },
  { name: "חלב", icon: "🥛", color: "#BFDBFE", sort_order: 5 },
  { name: "בשר, ביצים ודגים", icon: "🥩", color: "#EF4444", sort_order: 6 },
  { name: "קטניות ותוספות", icon: "🫘", color: "#A78BFA", sort_order: 7 },
  { name: "מאפים ודגנים", icon: "🍞", color: "#D97706", sort_order: 8 },
  { name: "אגוזים", icon: "🥜", color: "#92400E", sort_order: 9 },
  { name: "קפואים", icon: "🧊", color: "#06B6D4", sort_order: 10 },
  { name: "שימורים", icon: "🥫", color: "#DC2626", sort_order: 11 },
  { name: "תבלינים", icon: "🌶️", color: "#B45309", sort_order: 12 },
  { name: "ממרחים", icon: "🫙", color: "#78716C", sort_order: 13 },
  { name: "מטבלים ורטבים", icon: "🫕", color: "#16A34A", sort_order: 14 },
  { name: "משקאות", icon: "🥤", color: "#3B82F6", sort_order: 15 },
  { name: "חטיפים ומתוקים", icon: "🍬", color: "#EC4899", sort_order: 16 },
  { name: "מצרכים לאפייה", icon: "🎂", color: "#F472B6", sort_order: 17 },
  { name: "ניקיון וכביסה", icon: "🧹", color: "#60A5FA", sort_order: 18 },
  { name: "תרופות", icon: "💊", color: "#F87171", sort_order: 19 },
  { name: "ג'ינו ורוג'ר 🐱", icon: "🐱", color: "#FB923C", sort_order: 20 },
  { name: "שונות", icon: "📦", color: "#6B7280", sort_order: 21 },
];

interface UseShoppingCategoriesReturn {
  categories: ShoppingCategoryRow[];
  loading: boolean;
  addCategory: (name: string, icon: string, color: string) => Promise<void>;
  updateCategory: (id: string, updates: { name?: string; icon?: string; color?: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (orderedIds: string[]) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useShoppingCategories(): UseShoppingCategoriesReturn {
  const [categories, setCategories] = useState<ShoppingCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const seedingRef = useRef(false);

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
      // Provide default categories for non-Supabase mode
      setCategories(DEFAULT_CATEGORIES.map((c, i) => ({
        ...c,
        id: `default-${i}`,
        household_id: "mock",
        created_at: new Date().toISOString(),
      })));
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await catTable()
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        // Table may not exist yet — use defaults
        setCategories(DEFAULT_CATEGORIES.map((c, i) => ({
          ...c,
          id: `default-${i}`,
          household_id: "mock",
          created_at: new Date().toISOString(),
        })));
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as ShoppingCategoryRow[];
      if (rows.length > 0) {
        setCategories(rows);
      } else if (!seedingRef.current) {
        // Auto-seed default categories for the household
        seedingRef.current = true;
        const householdId = await getHouseholdId();
        if (householdId) {
          const seedRows = DEFAULT_CATEGORIES.map((c) => ({
            ...c,
            household_id: householdId,
          }));
          const { data: seeded } = await catTable()
            .insert(seedRows)
            .select();
          if (seeded) {
            setCategories(seeded as unknown as ShoppingCategoryRow[]);
          }
        }
      }
    } catch {
      // Fallback
      setCategories(DEFAULT_CATEGORIES.map((c, i) => ({
        ...c,
        id: `default-${i}`,
        household_id: "mock",
        created_at: new Date().toISOString(),
      })));
    } finally {
      setLoading(false);
    }
  }, [getHouseholdId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Helper to get a typed reference to the shopping_categories table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const catTable = () => createClient().from("shopping_categories" as any);

  // Realtime subscription
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    try {
      const supabase = createClient();
      const channel = supabase
        .channel("shopping-categories-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "shopping_categories" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setCategories((prev) => [...prev, payload.new as ShoppingCategoryRow].sort((a, b) => a.sort_order - b.sort_order));
            } else if (payload.eventType === "UPDATE") {
              const updated = payload.new as ShoppingCategoryRow;
              setCategories((prev) =>
                prev.map((c) => (c.id === updated.id ? updated : c)).sort((a, b) => a.sort_order - b.sort_order)
              );
            } else if (payload.eventType === "DELETE") {
              const deleted = payload.old as { id: string };
              setCategories((prev) => prev.filter((c) => c.id !== deleted.id));
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

  const addCategory = useCallback(async (name: string, icon: string, color: string) => {
    const householdId = await getHouseholdId();
    if (!householdId) return;

    const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), -1);
    await catTable().insert({
      household_id: householdId,
      name,
      icon,
      color,
      sort_order: maxOrder + 1,
    });
    // Realtime will update state
  }, [categories, getHouseholdId]);

  const updateCategory = useCallback(async (id: string, updates: { name?: string; icon?: string; color?: string }) => {
    // Optimistic update
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    const { error } = await catTable().update(updates).eq("id", id);
    if (error) {
      await fetchCategories();
    }
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    // Optimistic
    setCategories((prev) => prev.filter((c) => c.id !== id));
    const { error } = await catTable().delete().eq("id", id);
    if (error) {
      await fetchCategories();
    }
  }, [fetchCategories]);

  const reorderCategories = useCallback(async (orderedIds: string[]) => {
    // Optimistic
    setCategories((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      return orderedIds
        .map((id, i) => {
          const cat = map.get(id);
          return cat ? { ...cat, sort_order: i } : null;
        })
        .filter((c): c is ShoppingCategoryRow => c !== null);
    });

    // Batch update
    const updates = orderedIds.map((id, i) =>
      catTable().update({ sort_order: i }).eq("id", id)
    );
    await Promise.all(updates);
  }, []);

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    refetch: fetchCategories,
  };
}
