"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import type { CategoryRow } from "@/lib/types/database";

interface UseCategoriesReturn {
  categories: CategoryRow[];
  loading: boolean;
  error: string | null;
  /** Look up category by id - returns the category row or undefined */
  getCategoryById: (id: string) => CategoryRow | undefined;
  /** Get a map of category_id -> category name */
  categoryMap: Record<string, string>;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch categories from Supabase.
 * Returns empty array when Supabase is not connected or table doesn't exist.
 */
export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (fetchError) {
        setError(fetchError.message);
        setCategories([]);
      } else {
        setCategories(data ?? []);
      }
    } catch {
      setCategories([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const getCategoryById = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories]
  );

  const categoryMap = useMemo(
    () =>
      categories.reduce<Record<string, string>>((acc, c) => {
        acc[c.id] = c.name;
        return acc;
      }, {}),
    [categories]
  );

  return {
    categories,
    loading,
    error,
    getCategoryById,
    categoryMap,
    refetch: fetchCategories,
  };
}
