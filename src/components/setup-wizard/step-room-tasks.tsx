"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { getDifficultyColor, getDifficultyLabel, getDifficultyPoints } from "@/lib/room-task-templates";
import type { RoomDefinition, RoomTaskTemplate } from "@/lib/room-task-templates";

type TaskWithState = RoomTaskTemplate & { enabled: boolean; custom?: boolean };

const CUSTOM_TEMPLATES_STORAGE_KEY = "bayit-custom-templates";

interface CustomTaskTemplate {
  title: string;
  category: string;
  addedAt: string;
}

function getTemplateKey(title: string, category: string): string {
  return `${category}:${title.trim().toLowerCase()}`;
}

function readCustomTemplates(): CustomTaskTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CustomTaskTemplate =>
        typeof item?.title === "string" &&
        typeof item?.category === "string" &&
        typeof item?.addedAt === "string"
    );
  } catch {
    return [];
  }
}

function writeCustomTemplates(templates: CustomTaskTemplate[]) {
  localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

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
  const [savedTemplateKeys, setSavedTemplateKeys] = useState<Set<string>>(new Set());
  const hydratedRoomsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const storedTemplates = readCustomTemplates();
    setSavedTemplateKeys(
      new Set(storedTemplates.map((template) => getTemplateKey(template.title, template.category)))
    );

    if (hydratedRoomsRef.current.has(room.id)) return;
    hydratedRoomsRef.current.add(room.id);

    const existingKeys = new Set(tasks.map((task) => getTemplateKey(task.title, room.id)));
    const templatesForRoom = storedTemplates.filter(
      (template) =>
        template.category === room.id &&
        !existingKeys.has(getTemplateKey(template.title, template.category))
    );

    if (templatesForRoom.length === 0) return;

    onUpdate([
      ...tasks,
      ...templatesForRoom.map((template) => ({
        title: template.title,
        titleEn: template.title,
        difficulty: 1 as const,
        level: "basic" as const,
        estimatedMinutes: 10,
        enabled: true,
        custom: true,
      })),
    ]);
  }, [room.id, tasks, onUpdate]);

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

  const saveCustomTaskAsTemplate = useCallback((task: TaskWithState) => {
    const title = (isRtl ? task.title : task.titleEn).trim();
    if (!title) return;

    const key = getTemplateKey(title, room.id);
    try {
      const storedTemplates = readCustomTemplates();
      if (storedTemplates.some((template) => getTemplateKey(template.title, template.category) === key)) {
        setSavedTemplateKeys((prev) => new Set(prev).add(key));
        toast.info(t("setupWizard.templateAlreadySaved"));
        return;
      }

      writeCustomTemplates([
        ...storedTemplates,
        {
          title,
          category: room.id,
          addedAt: new Date().toISOString(),
        },
      ]);
      setSavedTemplateKeys((prev) => new Set(prev).add(key));
      toast.success(t("setupWizard.templateSaved"));
    } catch {
      toast.error(t("setupWizard.templateSaveFailed"));
    }
  }, [isRtl, room.id, t]);

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
                  aria-label={
                    task.enabled
                      ? `${t("setupWizard.taskOn")}: ${isRtl ? task.title : task.titleEn}`
                      : `${t("setupWizard.taskOff")}: ${isRtl ? task.title : task.titleEn}`
                  }
                  aria-pressed={task.enabled}
                  className={[
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    task.enabled
                      ? "bg-primary border-primary"
                      : "border-border hover:border-primary/50",
                  ].join(" ")}
                >
                  {task.enabled && (
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
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

                {/* Save/remove custom task */}
                {task.custom && (
                  <>
                    <button
                      onClick={() => saveCustomTaskAsTemplate(task)}
                      disabled={savedTemplateKeys.has(getTemplateKey(isRtl ? task.title : task.titleEn, room.id))}
                      className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-primary/25 px-2 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/5 disabled:border-border disabled:text-muted"
                      aria-label={`${t("setupWizard.saveAsTemplate")}: ${isRtl ? task.title : task.titleEn}`}
                    >
                      <Save className="h-3 w-3" />
                      <span>
                        {savedTemplateKeys.has(getTemplateKey(isRtl ? task.title : task.titleEn, room.id))
                          ? t("setupWizard.savedAsTemplate")
                          : t("setupWizard.saveAsTemplate")}
                      </span>
                    </button>
                    <button
                      onClick={() => removeTask(index)}
                      className="text-red-400 hover:text-red-600 flex-shrink-0 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      aria-label={`${t("setupWizard.removeCustomTask")}: ${isRtl ? task.title : task.titleEn}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
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
