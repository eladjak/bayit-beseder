"use client";

import { useState, useCallback } from "react";
import {
  generateWeekPlan,
  moveTaskInPlan,
  removeTaskFromPlan,
  addTaskToPlan,
  reassignTaskInPlan,
  type WeekPlan,
  type PlannedTask,
} from "@/lib/weekly-generator";
import { createClient } from "@/lib/supabase";
import { CATEGORY_KEY_TO_NAME } from "@/lib/categories";
import type { TaskRow } from "@/lib/types/database";

type WizardState = "idle" | "preview" | "editing" | "applying" | "done";

interface ApplyResult {
  created: number;
  errors: string[];
}

interface UseWeeklyGeneratorReturn {
  state: WizardState;
  plan: WeekPlan | null;
  applyProgress: number; // 0-100
  generate: (existingTasks: TaskRow[], members: string[], weekStartDate: Date, zoneMode?: boolean, zoneMappings?: import("@/lib/zones").ZoneDayMapping[]) => void;
  moveTask: (fromDate: string, taskIndex: number, toDate: string) => void;
  removeTask: (date: string, taskIndex: number) => void;
  addTask: (date: string, task: PlannedTask) => void;
  reassignTask: (date: string, taskIndex: number, newUserId: string) => void;
  startEditing: () => void;
  applyPlan: () => Promise<ApplyResult>;
  reset: () => void;
}

/**
 * Fetches categories from Supabase and builds a map from category key (e.g. "kitchen")
 * to UUID. Falls back to null if the category is not found.
 */
async function buildCategoryMap(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.from("categories").select("id, name");

  const map: Record<string, string> = {};
  if (!data) return map;

  for (const cat of data) {
    // Map by Hebrew name → UUID
    map[cat.name] = cat.id;
  }
  return map;
}

export function useWeeklyGenerator(): UseWeeklyGeneratorReturn {
  const [state, setState] = useState<WizardState>("idle");
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [applyProgress, setApplyProgress] = useState(0);

  const generate = useCallback(
    (existingTasks: TaskRow[], members: string[], weekStartDate: Date, zoneMode?: boolean, zoneMappings?: import("@/lib/zones").ZoneDayMapping[]) => {
      const weekPlan = generateWeekPlan({ existingTasks, members, weekStartDate, zoneMode, zoneMappings });
      setPlan(weekPlan);
      setState("preview");
    },
    []
  );

  const moveTask = useCallback(
    (fromDate: string, taskIndex: number, toDate: string) => {
      setPlan((prev) => (prev ? moveTaskInPlan(prev, fromDate, taskIndex, toDate) : prev));
    },
    []
  );

  const removeTask = useCallback((date: string, taskIndex: number) => {
    setPlan((prev) => (prev ? removeTaskFromPlan(prev, date, taskIndex) : prev));
  }, []);

  const addTask = useCallback((date: string, task: PlannedTask) => {
    setPlan((prev) => (prev ? addTaskToPlan(prev, date, task) : prev));
  }, []);

  const reassignTask = useCallback(
    (date: string, taskIndex: number, newUserId: string) => {
      setPlan((prev) =>
        prev ? reassignTaskInPlan(prev, date, taskIndex, newUserId) : prev
      );
    },
    []
  );

  const startEditing = useCallback(() => {
    setState("editing");
  }, []);

  const applyPlan = useCallback(
    async (): Promise<ApplyResult> => {
      if (!plan) return { created: 0, errors: [] };

      setState("applying");
      setApplyProgress(0);

      const supabase = createClient();

      // Fetch category UUID map from Supabase
      const catMap = await buildCategoryMap();

      // Collect all new tasks to insert
      const newTasks: Array<{ task: PlannedTask; date: string }> = [];
      for (const day of plan) {
        for (const task of day.tasks) {
          if (!task.isExisting) {
            newTasks.push({ task, date: day.date });
          }
        }
      }

      if (newTasks.length === 0) {
        setState("done");
        return { created: 0, errors: [] };
      }

      let created = 0;
      const errors: string[] = [];

      for (let i = 0; i < newTasks.length; i++) {
        const { task, date } = newTasks[i];

        // Resolve category key ("kitchen") → Hebrew name ("מטבח") → UUID
        const hebrewName = CATEGORY_KEY_TO_NAME[task.category] ?? task.category;
        const categoryUuid = catMap[hebrewName] ?? null;

        // Direct Supabase insert — only columns that exist in production DB
        // Production schema (001_initial.sql): id, title, description, category_id,
        // assigned_to, status, due_date, points, recurring, created_at
        // NOTE: 'frequency' and 'google_event_id' do NOT exist in production
        const { error } = await supabase
          .from("tasks")
          .insert({
            title: task.title,
            category_id: categoryUuid,
            due_date: date,
            status: "pending",
            points: task.difficulty * 5,
            recurring: true,
            assigned_to: task.assignee,
          })
          .select()
          .single();

        if (error) {
          errors.push(`${task.title}: ${error.message}`);
        } else {
          created++;
        }

        setApplyProgress(Math.round(((i + 1) / newTasks.length) * 100));
      }

      setState("done");
      return { created, errors };
    },
    [plan]
  );

  const reset = useCallback(() => {
    setState("idle");
    setPlan(null);
    setApplyProgress(0);
  }, []);

  return {
    state,
    plan,
    applyProgress,
    generate,
    moveTask,
    removeTask,
    addTask,
    reassignTask,
    startEditing,
    applyPlan,
    reset,
  };
}
