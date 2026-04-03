"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { getDifficultyColor, getDifficultyLabel, getDifficultyPoints } from "@/lib/room-task-templates";
import type { RoomDefinition, RoomTaskTemplate } from "@/lib/room-task-templates";

type TaskWithState = RoomTaskTemplate & { enabled: boolean; custom?: boolean };

interface StepRoomTasksProps {
  room: RoomDefinition;
  tasks: TaskWithState[];
  onUpdate: (tasks: TaskWithState[]) => void;
  roomIndex: number;
  totalRooms: number;
  onNext: () => void;
  onBack: () => void;
}

export function StepRoomTasks({
  room,
  tasks,
  onUpdate,
  roomIndex,
  totalRooms,
  onNext,
  onBack,
}: StepRoomTasksProps) {
  const { t, locale } = useTranslation();
  const isRtl = locale === "he";
  const [newTaskName, setNewTaskName] = useState("");

  const toggleTask = useCallback((index: number) => {
    onUpdate(
      tasks.map((task, i) =>
        i === index ? { ...task, enabled: !task.enabled } : task
      )
    );
  }, [tasks, onUpdate]);

  const addCustomTask = useCallback(() => {
    if (!newTaskName.trim()) return;
    onUpdate([
      ...tasks,
      {
        title: newTaskName.trim(),
        titleEn: newTaskName.trim(),
        difficulty: 1 as const,
        level: "basic" as const,
        estimatedMinutes: 10,
        enabled: true,
        custom: true,
      },
    ]);
    setNewTaskName("");
  }, [newTaskName, tasks, onUpdate]);

  const removeTask = useCallback((index: number) => {
    onUpdate(tasks.filter((_, i) => i !== index));
  }, [tasks, onUpdate]);

  const enabledCount = tasks.filter((t) => t.enabled).length;

  return (
    <div className="space-y-4">
      {/* Room header */}
      <div className="text-center mb-4">
        <span className="text-4xl block mb-1">{room.icon}</span>
        <h2 className="text-lg font-bold text-foreground">
          {isRtl ? room.nameHe : room.nameEn}
        </h2>
        <p className="text-xs text-muted">
          {isRtl
            ? `חדר ${roomIndex + 1} מתוך ${totalRooms} · ${enabledCount} משימות פעילות`
            : `Room ${roomIndex + 1} of ${totalRooms} · ${enabledCount} active tasks`}
        </p>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        <AnimatePresence>
          {tasks.map((task, index) => {
            const diffColor = getDifficultyColor(task.difficulty);
            const diffLabel = getDifficultyLabel(task.difficulty);
            const points = getDifficultyPoints(task.difficulty);

            return (
              <motion.div
                key={`${task.title}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: index * 0.03 }}
                className={[
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  task.enabled
                    ? "bg-surface border-border"
                    : "bg-muted/30 border-border/50 opacity-60",
                ].join(" ")}
              >
                {/* Toggle */}
                <button
                  onClick={() => toggleTask(index)}
                  className={[
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    task.enabled
                      ? "bg-primary border-primary"
                      : "border-border hover:border-primary/50",
                  ].join(" ")}
                >
                  {task.enabled && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${task.enabled ? "text-foreground" : "text-muted line-through"}`}>
                    {isRtl ? task.title : task.titleEn}
                  </span>
                </div>

                {/* Difficulty badge */}
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${diffColor} 20%, var(--color-surface, #fff))`,
                    color: `color-mix(in srgb, ${diffColor} 70%, var(--color-foreground, #1a1a1a))`,
                  }}
                >
                  {isRtl ? diffLabel.he : diffLabel.en}
                </span>

                {/* Points */}
                <span className="text-[10px] text-muted flex-shrink-0">
                  {points}
                </span>

                {/* Remove custom task */}
                {task.custom && (
                  <button
                    onClick={() => removeTask(index)}
                    className="text-red-400 hover:text-red-600 flex-shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Add custom task */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustomTask()}
          placeholder={t("setupWizard.customTaskPlaceholder") || ""}
          className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={addCustomTask}
          disabled={!newTaskName.trim()}
          className="px-4 py-2.5 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-40"
        >
          {t("setupWizard.addCustomTask")}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          {t("setupWizard.back")}
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
        >
          {roomIndex < totalRooms - 1
            ? `${t("setupWizard.next")} →`
            : t("setupWizard.review")}
        </button>
      </div>
    </div>
  );
}
