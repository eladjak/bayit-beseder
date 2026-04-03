"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Clock,
  Plus,
  Check,
  X,
  Calendar,
  GripVertical,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CalendarEventItem } from "@/components/weekly/calendar-event-item";
import { ZoneGroupCard } from "@/components/weekly/zone-group";
import { getZoneInfo, type ZoneGroup } from "@/lib/zones";
import {
  CATEGORY_BG_CLASSES,
  CATEGORY_LABELS,
  CATEGORY_KEYS,
  CATEGORY_ICONS,
} from "@/lib/categories";
import type { CategoryKey } from "@/lib/categories";
import { haptic } from "@/lib/haptics";
import type { DayLoad, DayLoadWithCalendar } from "@/lib/smart-scheduler";
import type { ClientCalendarEvent } from "@/lib/types/calendar";
import type { TaskRow } from "@/lib/types/database";
import { getCategoryFromId } from "@/lib/weekly-mock-data";

const VoiceInputButton = dynamic(
  () =>
    import("@/components/voice-input-button").then((m) => ({
      default: m.VoiceInputButton,
    })),
  { ssr: false }
);

// ============================================
// Draggable Task Item
// ============================================

interface DraggableWeekTaskProps {
  task: TaskRow;
  date: string;
  memberNames: Record<string, string>;
  memberIds: string[];
  onToggleComplete: (task: TaskRow) => Promise<void>;
  onReassignTask: (taskId: string, newUserId: string) => Promise<void>;
}

function DraggableWeekTask({
  task,
  date,
  memberNames,
  memberIds,
  onToggleComplete,
  onReassignTask,
}: DraggableWeekTaskProps) {
  const { t } = useTranslation();
  const category = getCategoryFromId(task.category_id);
  const isMock = task.id.startsWith("mock-");
  const isCompleted = task.status === "completed";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { task, fromDate: date, taskId: task.id },
    disabled: isMock,
  });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  const assigneeName = task.assigned_to ? memberNames[task.assigned_to] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg bg-background/50 dark:bg-background/30 transition-opacity ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {/* D&D handle */}
      {!isMock && (
        <button
          {...attributes}
          {...listeners}
          className="p-0.5 rounded touch-none cursor-grab active:cursor-grabbing text-muted/40 hover:text-muted flex-shrink-0"
          aria-label={t("weekly.dragToAnotherDay")}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Completion checkbox */}
      <button
        onClick={() => onToggleComplete(task)}
        disabled={isMock}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          isCompleted
            ? "bg-green-500 border-green-500 text-white"
            : isMock
              ? "border-border/30 opacity-40 cursor-not-allowed"
              : "border-border/50 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
        }`}
        title={isCompleted ? t("weekly.markIncomplete") : t("weekly.markCompleted")}
      >
        {isCompleted && <Check className="w-3 h-3" />}
      </button>

      <span className="text-sm flex-shrink-0">{CATEGORY_ICONS[category] ?? "🏠"}</span>
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm transition-all ${
            isCompleted ? "line-through text-muted" : "text-foreground"
          }`}
        >
          {task.title}
          {task.description?.startsWith("[pesach-") && (
            <span className="inline-flex items-center gap-0.5 me-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              {t("weekly.pesachBadgeLabel")}
            </span>
          )}
        </div>
        <div className="text-xs text-muted">{CATEGORY_LABELS[category]}</div>
      </div>

      {/* Assignee badge — click to toggle between members */}
      {assigneeName && memberIds.length === 2 && !isMock && (
        <button
          onClick={() => {
            const otherId = memberIds.find((id) => id !== task.assigned_to);
            if (otherId) onReassignTask(task.id, otherId);
          }}
          className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors whitespace-nowrap flex-shrink-0"
          title={t("weekly.switchAssignee")}
        >
          {assigneeName}
        </button>
      )}
      {assigneeName && memberIds.length < 2 && (
        <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary/70 font-medium whitespace-nowrap flex-shrink-0">
          {assigneeName}
        </span>
      )}
    </div>
  );
}

// ============================================
// Day Card
// ============================================

export interface WeeklyDayCardProps {
  dayLoad: DayLoad | DayLoadWithCalendar;
  index: number;
  isRealData: boolean;
  calendarEvents: ClientCalendarEvent[];
  memberNames: Record<string, string>;
  memberIds: string[];
  isDragTarget: boolean;
  onAddTask: (
    dueDate: string,
    title: string,
    categoryId: string
  ) => Promise<boolean>;
  onToggleComplete: (task: TaskRow) => Promise<void>;
  onReassignTask: (taskId: string, newUserId: string) => Promise<void>;
  zoneMode?: boolean;
}

export function WeeklyDayCard({
  dayLoad,
  index,
  isRealData,
  calendarEvents,
  memberNames,
  memberIds,
  isDragTarget,
  onAddTask,
  onToggleComplete,
  onReassignTask,
  zoneMode,
}: WeeklyDayCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  const difficultyColors = {
    light: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400",
    moderate:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400",
    heavy: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400",
  };

  const difficultyLabels = {
    light: t("weekly.difficultyLight"),
    moderate: t("weekly.difficultyModerate"),
    heavy: t("weekly.difficultyHeavy"),
  };

  const handleSaveTask = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const ok = await onAddTask(dayLoad.date, newTitle, newCategory);
    setSaving(false);
    if (ok) {
      setNewTitle("");
      setNewCategory("general");
      setShowAddForm(false);
      setExpanded(true);
    }
  };

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: dayLoad.date,
  });

  const handleAddButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic("tap");
    setShowAddForm((prev) => !prev);
    setExpanded(true);
  };

  const handleCancelAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAddForm(false);
    setNewTitle("");
    setNewCategory("general");
  };

  return (
    <motion.div
      ref={setDropRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`card-elevated overflow-hidden transition-all ${
        isOver
          ? "ring-2 ring-primary bg-primary/5"
          : isDragTarget
            ? "ring-1 ring-primary/30"
            : ""
      } ${
        dayLoad.isHeavy && !isOver
          ? "ring-2 ring-red-200 dark:ring-red-800/50 shadow-lg shadow-red-500/10"
          : !isOver
            ? "shadow-lg shadow-purple-500/10 border border-purple-100/50 dark:border-purple-800/30"
            : ""
      }`}
    >
      {/* Day header row */}
      <div className="flex items-center w-full">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 p-4 text-right"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="font-bold text-foreground">{dayLoad.dayName}</div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[dayLoad.difficulty]}`}
              >
                {difficultyLabels[dayLoad.difficulty]}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-muted">
                <Clock className="w-3 h-3" />
                {dayLoad.totalMinutes} {t("weekly.minutesShort")}
              </div>
              <div className="text-sm font-medium text-muted">
                {dayLoad.tasks.length} {t("weekly.taskCount")}
              </div>
            </div>
          </div>

          {/* Category badges preview */}
          {!expanded && (
            <div className="flex flex-wrap gap-1 items-center">
              {calendarEvents.length > 0 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                  {calendarEvents.length} {t("weekly.meetingsCount")}
                </span>
              )}
              {Array.from(
                new Set(dayLoad.tasks.map((t) => getCategoryFromId(t.category_id)))
              )
                .slice(0, 4)
                .map((category) => (
                  <span key={category} className="text-xs">
                    {CATEGORY_ICONS[category] ?? "🏠"}
                  </span>
                ))}
              {dayLoad.tasks.length > 4 && (
                <div className="text-xs text-muted">
                  +{dayLoad.tasks.length - 4}
                </div>
              )}
            </div>
          )}
        </button>

        {/* Quick-add button */}
        {isRealData && (
          <button
            onClick={handleAddButtonClick}
            aria-label={t("weekly.addTaskToDay")}
            className={`flex-shrink-0 ms-2 me-3 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
              showAddForm
                ? "bg-primary text-white"
                : "bg-border/30 text-muted hover:bg-primary/10 hover:text-primary"
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Inline add-task form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 space-y-2 border-t border-border/20">
              {/* Title input + voice */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTask();
                    if (e.key === "Escape") {
                      setShowAddForm(false);
                      setNewTitle("");
                    }
                  }}
                  placeholder={t("weekly.newTaskPlaceholder")}
                  dir="rtl"
                  autoFocus
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-background border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted"
                />
                <VoiceInputButton
                  onTranscript={(text) => setNewTitle(text)}
                  ariaLabel={t("weekly.voiceAdd")}
                  className="flex-shrink-0 w-8 h-8"
                />
              </div>
              {/* Category selector */}
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_KEYS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      newCategory === cat
                        ? "bg-primary text-white"
                        : "bg-border/20 text-muted hover:bg-border/40"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_BG_CLASSES[cat]}`}
                    />
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-border text-muted hover:bg-surface-hover transition-colors"
                >
                  <X className="w-3 h-3" />
                  {t("weekly.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSaveTask}
                  disabled={!newTitle.trim() || saving}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl gradient-primary text-white disabled:opacity-50 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  {saving ? t("weekly.saving") : t("weekly.add")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded task list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {/* Calendar events */}
              {calendarEvents.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {t("weekly.calendarMeetingsLabel")} ({calendarEvents.length})
                  </div>
                  {calendarEvents.map((event, eventIdx) => (
                    <CalendarEventItem
                      key={event.id}
                      event={event}
                      index={eventIdx}
                    />
                  ))}
                </div>
              )}

              {dayLoad.tasks.length === 0 && calendarEvents.length === 0 && (
                <div className="text-xs text-muted text-center py-2">
                  {t("weekly.noTasksOrMeetings")}
                </div>
              )}

              {/* Zone-grouped view */}
              {zoneMode &&
                dayLoad.tasks.length > 0 &&
                (() => {
                  const zoneGroups = new Map<string, TaskRow[]>();
                  for (const task of dayLoad.tasks) {
                    const catKey = getCategoryFromId(task.category_id);
                    const existing = zoneGroups.get(catKey) ?? [];
                    existing.push(task);
                    zoneGroups.set(catKey, existing);
                  }

                  return Array.from(zoneGroups.entries()).map(
                    ([catKey, zoneTasks]) => {
                      const info = getZoneInfo(catKey as CategoryKey);
                      const zoneData: ZoneGroup = {
                        zone: catKey as CategoryKey,
                        label: info.label,
                        icon: info.icon,
                        color: info.color,
                        tasks: zoneTasks.map((t) => ({
                          title: t.title,
                          assignee: t.assigned_to,
                          estimated_minutes: 10,
                          completed: t.status === "completed",
                          taskId: t.id,
                        })),
                        totalMinutes: zoneTasks.length * 10,
                      };

                      return (
                        <ZoneGroupCard key={catKey} zone={zoneData}>
                          {zoneTasks.map((task) => (
                            <DraggableWeekTask
                              key={task.id}
                              task={task}
                              date={dayLoad.date}
                              memberNames={memberNames}
                              memberIds={memberIds}
                              onToggleComplete={onToggleComplete}
                              onReassignTask={onReassignTask}
                            />
                          ))}
                        </ZoneGroupCard>
                      );
                    }
                  );
                })()}

              {/* Flat view (default) */}
              {!zoneMode &&
                dayLoad.tasks.map((task) => (
                  <DraggableWeekTask
                    key={task.id}
                    task={task}
                    date={dayLoad.date}
                    memberNames={memberNames}
                    memberIds={memberIds}
                    onToggleComplete={onToggleComplete}
                    onReassignTask={onReassignTask}
                  />
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
