"use client";

// SQL Migration (run in Supabase SQL Editor):
// ---------------------------------------------------------
// CREATE TABLE shopping_items (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   household_id UUID REFERENCES households(id) NOT NULL,
//   title TEXT NOT NULL,
//   quantity SMALLINT DEFAULT 1,
//   unit TEXT,
//   category TEXT DEFAULT 'אחר',
//   checked BOOLEAN DEFAULT FALSE,
//   added_by UUID REFERENCES profiles(id),
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can manage shopping items in their household"
//   ON shopping_items FOR ALL
//   USING (household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid()));
// ---------------------------------------------------------

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

export type ShoppingCategory = "מזון" | "ניקיון" | "חיות" | "בית" | "אחר";

export interface ShoppingItem {
  id: string;
  title: string;
  quantity?: number;
  unit?: string;
  category: ShoppingCategory;
  checked: boolean;
  added_by: string;
  created_at: string;
}

export const CATEGORY_COLORS: Record<ShoppingCategory, string> = {
  "מזון": "#22C55E",
  "ניקיון": "#3B82F6",
  "חיות": "#F97316",
  "בית": "#8B5CF6",
  "אחר": "#6B7280",
};

const MOCK_ITEMS: ShoppingItem[] = [
  { id: "s1", title: "חלב", category: "מזון", checked: false, added_by: "elad", created_at: "2026-02-19T08:00:00Z" },
  { id: "s2", title: "לחם", category: "מזון", checked: false, added_by: "elad", created_at: "2026-02-19T08:01:00Z" },
  { id: "s3", title: "ביצים", quantity: 12, unit: "יח׳", category: "מזון", checked: false, added_by: "inbal", created_at: "2026-02-19T08:02:00Z" },
  { id: "s4", title: "גבינה צהובה", category: "מזון", checked: true, added_by: "inbal", created_at: "2026-02-19T07:00:00Z" },
  { id: "s5", title: "סבון כלים", category: "ניקיון", checked: false, added_by: "elad", created_at: "2026-02-19T09:00:00Z" },
  { id: "s6", title: "אקונומיקה", category: "ניקיון", checked: false, added_by: "inbal", created_at: "2026-02-19T09:01:00Z" },
  { id: "s7", title: "אוכל לחתולים", quantity: 2, unit: "ק״ג", category: "חיות", checked: false, added_by: "elad", created_at: "2026-02-19T10:00:00Z" },
  { id: "s8", title: "חול לארגז", category: "חיות", checked: false, added_by: "inbal", created_at: "2026-02-19T10:01:00Z" },
  { id: "s9", title: "נורות", quantity: 4, unit: "יח׳", category: "בית", checked: false, added_by: "elad", created_at: "2026-02-19T11:00:00Z" },
];

interface UseShoppingListReturn {
  items: ShoppingItem[];
  loading: boolean;
  addItem: (title: string, category: ShoppingCategory, quantity?: number, unit?: string) => void;
  toggleItem: (id: string) => void;
  removeItem: (id: string) => void;
  clearChecked: () => void;
}

/** Map a Supabase row to the ShoppingItem interface used by the UI */
function toShoppingItem(row: {
  id: string;
  title: string;
  quantity: number;
  unit: string | null;
  category: string;
  checked: boolean;
  added_by: string | null;
  created_at: string;
}): ShoppingItem {
  return {
    id: row.id,
    title: row.title,
    quantity: row.quantity === 1 ? undefined : row.quantity,
    unit: row.unit ?? undefined,
    category: row.category as ShoppingCategory,
    checked: row.checked,
    added_by: row.added_by ?? "unknown",
    created_at: row.created_at,
  };
}

export function useShoppingList(): UseShoppingListReturn {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const usingMockRef = useRef(false);

  // ---- Fetch items from Supabase (or fall back to mock) ----
  const fetchItems = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      usingMockRef.current = true;
      setItems(MOCK_ITEMS);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("shopping_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Table may not exist yet -- fall back to mock
        usingMockRef.current = true;
        setItems(MOCK_ITEMS);
      } else {
        usingMockRef.current = false;
        setItems((data ?? []).map(toShoppingItem));
      }
    } catch {
      // Supabase not reachable
      usingMockRef.current = true;
      setItems(MOCK_ITEMS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ---- Realtime subscription ----
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    try {
      const supabase = createClient();
      const channel = supabase
        .channel("shopping-items-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "shopping_items" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newItem = toShoppingItem(payload.new as {
                id: string;
                title: string;
                quantity: number;
                unit: string | null;
                category: string;
                checked: boolean;
                added_by: string | null;
                created_at: string;
              });
              setItems((prev) => [newItem, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              const updated = toShoppingItem(payload.new as {
                id: string;
                title: string;
                quantity: number;
                unit: string | null;
                category: string;
                checked: boolean;
                added_by: string | null;
                created_at: string;
              });
              setItems((prev) =>
                prev.map((item) => (item.id === updated.id ? updated : item))
              );
            } else if (payload.eventType === "DELETE") {
              const deleted = payload.old as { id: string };
              setItems((prev) => prev.filter((item) => item.id !== deleted.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Realtime not available -- silently ignore
    }
  }, []);

  // ---- CRUD operations ----

  const addItem = useCallback(
    async (title: string, category: ShoppingCategory, quantity?: number, unit?: string) => {
      if (usingMockRef.current) {
        const newItem: ShoppingItem = {
          id: `s${Date.now()}`,
          title,
          quantity,
          unit,
          category,
          checked: false,
          added_by: "elad",
          created_at: new Date().toISOString(),
        };
        setItems((prev) => [newItem, ...prev]);
        return;
      }

      try {
        const supabase = createClient();

        // Get current user's household_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("household_id")
          .eq("id", user.id)
          .single();

        if (!profile?.household_id) return;

        await supabase.from("shopping_items").insert({
          household_id: profile.household_id,
          title,
          category,
          quantity: quantity ?? 1,
          unit: unit ?? null,
          added_by: user.id,
        });
        // Realtime subscription will handle the state update
      } catch {
        // If Supabase insert fails, add locally as fallback
        const newItem: ShoppingItem = {
          id: `s${Date.now()}`,
          title,
          quantity,
          unit,
          category,
          checked: false,
          added_by: "elad",
          created_at: new Date().toISOString(),
        };
        setItems((prev) => [newItem, ...prev]);
      }
    },
    []
  );

  const toggleItem = useCallback(async (id: string) => {
    if (usingMockRef.current) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      );
      return;
    }

    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );

    try {
      const supabase = createClient();
      const current = items.find((item) => item.id === id);
      if (!current) return;

      const { error } = await supabase
        .from("shopping_items")
        .update({ checked: !current.checked })
        .eq("id", id);

      if (error) {
        // Revert optimistic update
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, checked: !item.checked } : item
          )
        );
      }
    } catch {
      // Revert optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      );
    }
  }, [items]);

  const removeItem = useCallback(async (id: string) => {
    if (usingMockRef.current) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      return;
    }

    // Optimistic update
    const previousItems = items;
    setItems((prev) => prev.filter((item) => item.id !== id));

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("shopping_items")
        .delete()
        .eq("id", id);

      if (error) {
        setItems(previousItems);
      }
    } catch {
      setItems(previousItems);
    }
  }, [items]);

  const clearChecked = useCallback(async () => {
    if (usingMockRef.current) {
      setItems((prev) => prev.filter((item) => !item.checked));
      return;
    }

    // Optimistic update
    const previousItems = items;
    setItems((prev) => prev.filter((item) => !item.checked));

    try {
      const supabase = createClient();

      // Get current user's household_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setItems(previousItems);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("household_id")
        .eq("id", user.id)
        .single();

      if (!profile?.household_id) {
        setItems(previousItems);
        return;
      }

      const { error } = await supabase
        .from("shopping_items")
        .delete()
        .eq("household_id", profile.household_id)
        .eq("checked", true);

      if (error) {
        setItems(previousItems);
      }
    } catch {
      setItems(previousItems);
    }
  }, [items]);

  return { items, loading, addItem, toggleItem, removeItem, clearChecked };
}
