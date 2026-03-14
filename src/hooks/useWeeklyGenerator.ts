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
import type { TaskRow, TaskInsert } from "@/lib/types/database";

type WizardState = "idle" | "preview" | "editing" | "applying" | "done";

interface UseWeeklyGeneratorReturn {
  state: WizardState;
  plan: WeekPlan | null;
  applyProgress: number; // 0-100
  generate: (existingTasks: TaskRow[], members: string[], weekStartDate: Date) => void;
  moveTask: (fromDate: string, taskIndex: number, toDate: string) => void;
  removeTask: (date: string, taskIndex: number) => void;
  addTask: (date: string, task: PlannedTask) => void;
  reassignTask: (date: string, taskIndex: number, newUserId: string) => void;
  startEditing: () => void;
  applyPlan: (
    createTask: (task: TaskInsert) => Promise<TaskRow | null>
  ) => Promise<number>;
  reset: () => void;
}

export function useWeeklyGenerator(): UseWeeklyGeneratorReturn {
  const [state, setState] = useState<WizardState>("idle");
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [applyProgress, setApplyProgress] = useState(0);

  const generate = useCallback(
    (existingTasks: TaskRow[], members: string[], weekStartDate: Date) => {
      const weekPlan = generateWeekPlan({ existingTasks, members, weekStartDate });
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
    async (
      createTask: (task: TaskInsert) => Promise<TaskRow | null>
    ): Promise<number> => {
      if (!plan) return 0;

      setState("applying");
      setApplyProgress(0);

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
        return 0;
      }

      let created = 0;
      for (let i = 0; i < newTasks.length; i++) {
        const { task, date } = newTasks[i];
        const taskData: TaskInsert = {
          title: task.title,
          category_id: task.category,
          due_date: date,
          status: "pending",
          frequency: "weekly",
          points: task.difficulty * 5,
          recurring: true,
          assigned_to: task.assignee,
        };

        const result = await createTask(taskData);
        if (result) created++;

        setApplyProgress(Math.round(((i + 1) / newTasks.length) * 100));
      }

      setState("done");
      return created;
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
