"use client";

// SQL Migration (run in Supabase SQL Editor when ready):
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
// ---------------------------------------------------------

import { useState, useCallback } from "react";

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

export function useShoppingList(): UseShoppingListReturn {
  const [items, setItems] = useState<ShoppingItem[]>(MOCK_ITEMS);
  const [loading] = useState(false);

  const addItem = useCallback(
    (title: string, category: ShoppingCategory, quantity?: number, unit?: string) => {
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
    },
    []
  );

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearChecked = useCallback(() => {
    setItems((prev) => prev.filter((item) => !item.checked));
  }, []);

  // Future Supabase implementation:
  // const supabase = createClient();
  // const fetchItems = async () => {
  //   const { data } = await supabase.from("shopping_items").select("*").order("created_at", { ascending: false });
  //   if (data) setItems(data);
  // };
  // const addItem = async (title, category, quantity, unit) => {
  //   await supabase.from("shopping_items").insert({ title, category, quantity, unit, household_id: "..." });
  //   fetchItems();
  // };

  return { items, loading, addItem, toggleItem, removeItem, clearChecked };
}
