"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { SeasonalTemplate, SeasonalActivation } from "@/lib/seasonal/types";
import { SEASONAL_TEMPLATES, getActiveTemplate, getDaysUntilHoliday } from "@/lib/seasonal/registry";
import { schedulePesachTasks, buildTaskInserts } from "@/lib/seasonal/scheduler";
import { createClient } from "@/lib/supabase";

const STORAGE_KEY = "bayit-seasonal-activation";

function loadActivation(): SeasonalActivation | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as SeasonalActivation;
  } catch {
    return null;
  }
}

function saveActivation(activation: SeasonalActivation | null) {
  if (typeof window === "undefined") return;
  if (activation) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activation));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

async function buildCategoryMap(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.from("categories").select("id, name");
  const map: Record<string, string> = {};
  if (!data) return map;
  for (const cat of data) {
    map[cat.name] = cat.id;
  }
  return map;
}

export interface SeasonalModeReturn {
  /** The template that is currently in its availability window */
  activeTemplate: SeasonalTemplate | null;
  /** Current activation state (null if not activated) */
  activation: SeasonalActivation | null;
  /** All available templates */
  availableTemplates: SeasonalTemplate[];
  /** Days until the holiday */
  daysUntilHoliday: number;
  /** Loading state */
  loading: boolean;
  /** Progress of seasonal tasks (completed/total) */
  progress: { completed: number; total: number };
  /** Activate a seasonal template */
  activate: (startDate: Date) => void;
  /** Create tasks in Supabase from the template schedule */
  createTasks: (members: string[]) => Promise<{ created: number; errors: string[] }>;
  /** Add shopping items from the template */
  addShoppingItems: (householdId: string, userId: string) => Promise<{ added: number; errors: string[] }>;
  /** Deactivate seasonal mode */
  deactivate: () => Promise<void>;
}

export function useSeasonalMode(): SeasonalModeReturn {
  const [activation, setActivation] = useState<SeasonalActivation | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const activeTemplate = useMemo(() => getActiveTemplate(), []);
  const daysUntilHoliday = useMemo(
    () => (activeTemplate ? getDaysUntilHoliday(activeTemplate) : 0),
    [activeTemplate]
  );

  // Load activation from localStorage
  useEffect(() => {
    const stored = loadActivation();
    if (stored) {
      // Verify the template still exists
      const template = SEASONAL_TEMPLATES.find((t) => t.id === stored.templateId);
      if (template) {
        setActivation(stored);
      } else {
        saveActivation(null);
      }
    }
    setLoading(false);
  }, []);

  // Track progress of seasonal tasks
  useEffect(() => {
    if (!activation?.tasksCreated || activation.taskIds.length === 0) {
      setProgress({ completed: 0, total: 0 });
      return;
    }

    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("tasks")
      .select("id, status")
      .in("id", activation.taskIds)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[seasonal] Failed to fetch task progress:", error.message);
          return;
        }
        if (data) {
          const total = data.length;
          const completed = data.filter((t) => t.status === "completed").length;
          setProgress({ completed, total });
        }
      });

    return () => { cancelled = true; };
  }, [activation]);

  const activate = useCallback(
    (startDate: Date) => {
      if (!activeTemplate) return;
      const holidayDate = activeTemplate.getHolidayDate(new Date().getFullYear());
      const newActivation: SeasonalActivation = {
        templateId: activeTemplate.id,
        activatedAt: new Date().toISOString(),
        holidayDate: holidayDate.toISOString().slice(0, 10),
        startDate: startDate.toISOString().slice(0, 10),
        tasksCreated: false,
        shoppingAdded: false,
        taskIds: [],
        shoppingIds: [],
      };
      setActivation(newActivation);
      saveActivation(newActivation);
    },
    [activeTemplate]
  );

  const createTasks = useCallback(
    async (members: string[]): Promise<{ created: number; errors: string[] }> => {
      if (!activation || !activeTemplate) return { created: 0, errors: ["לא הופעל מצב עונתי"] };

      const supabase = createClient();
      const catMap = await buildCategoryMap();

      const startDate = new Date(activation.startDate);
      const holidayDate = new Date(activation.holidayDate);

      const scheduled = schedulePesachTasks(activeTemplate, startDate, holidayDate, members);
      const inserts = buildTaskInserts(scheduled, catMap, activeTemplate.id);

      let created = 0;
      const errors: string[] = [];
      const taskIds: string[] = [];

      // Insert in batches of 10
      for (let i = 0; i < inserts.length; i += 10) {
        const batch = inserts.slice(i, i + 10);
        const { data, error } = await supabase
          .from("tasks")
          .insert(batch)
          .select("id");

        if (error) {
          errors.push(error.message);
        } else if (data) {
          created += data.length;
          taskIds.push(...data.map((d) => d.id));
        }
      }

      const updated: SeasonalActivation = {
        ...activation,
        tasksCreated: true,
        taskIds,
      };
      setActivation(updated);
      saveActivation(updated);
      setProgress({ completed: 0, total: created });

      return { created, errors };
    },
    [activation, activeTemplate]
  );

  const addShoppingItems = useCallback(
    async (householdId: string, userId: string): Promise<{ added: number; errors: string[] }> => {
      if (!activation || !activeTemplate) return { added: 0, errors: ["לא הופעל מצב עונתי"] };

      const supabase = createClient();
      const items = activeTemplate.shopping.map((s) => ({
        household_id: householdId,
        title: s.title,
        quantity: s.quantity ?? 1,
        unit: s.unit ?? null,
        category: s.category,
        checked: false,
        added_by: userId,
      }));

      const { data, error } = await supabase
        .from("shopping_items")
        .insert(items)
        .select("id");

      if (error) {
        return { added: 0, errors: [error.message] };
      }

      const shoppingIds = data?.map((d) => d.id) ?? [];
      const updated: SeasonalActivation = {
        ...activation,
        shoppingAdded: true,
        shoppingIds,
      };
      setActivation(updated);
      saveActivation(updated);

      return { added: shoppingIds.length, errors: [] };
    },
    [activation, activeTemplate]
  );

  const deactivate = useCallback(async () => {
    if (!activation) return;

    // Mark all seasonal tasks as completed
    if (activation.taskIds.length > 0) {
      const supabase = createClient();
      await supabase
        .from("tasks")
        .update({ status: "completed" })
        .in("id", activation.taskIds);
    }

    setActivation(null);
    saveActivation(null);
    setProgress({ completed: 0, total: 0 });
  }, [activation]);

  return {
    activeTemplate,
    activation,
    availableTemplates: SEASONAL_TEMPLATES,
    daysUntilHoliday,
    loading,
    progress,
    activate,
    createTasks,
    addShoppingItems,
    deactivate,
  };
}
