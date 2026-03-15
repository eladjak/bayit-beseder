"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wand2,
  ChevronDown,
  ChevronUp,
  Trash2,
  GripVertical,
  Plus,
  Check,
  Loader2,
  Clock,
  Users,
  Sparkles,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { haptic } from "@/lib/haptics";
import {
  CATEGORY_BG_CLASSES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_KEYS,
} from "@/lib/categories";
import type { WeekPlan, PlannedTask } from "@/lib/weekly-generator";
import type { TaskTemplate } from "@/lib/seed-data";

// ============================================
// Props
// ============================================

interface WeeklyGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  plan: WeekPlan | null;
  state: "idle" | "preview" | "editing" | "applying" | "done";
  applyProgress: number;
  members: Array<{ id: string; name: string }>;
  onStartEditing: () => void;
  onMoveTask: (fromDate: string, taskIndex: number, toDate: string) => void;
  onRemoveTask: (date: string, taskIndex: number) => void;
  onAddTask: (date: string, task: PlannedTask) => void;
  onReassignTask: (date: string, taskIndex: number, newUserId: string) => void;
  onApply: () => void;
  onReset: () => void;
}

// ============================================
// Component
// ============================================

export function WeeklyGeneratorModal({
  open,
  onClose,
  plan,
  state,
  applyProgress,
  members,
  onStartEditing,
  onMoveTask,
  onRemoveTask,
  onAddTask,
  onReassignTask,
  onApply,
  onReset,
}: WeeklyGeneratorModalProps) {
  if (!open || !plan) return null;

  const totalNew = plan.reduce(
    (sum, day) => sum + day.tasks.filter((t) => !t.isExisting).length,
    0
  );
  const totalMinutes = plan.reduce((sum, day) => sum + day.totalMinutes, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-stone-50 dark:bg-stone-900"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 safe-top">
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-bold">אשף שבועי</h2>
            </div>
            <button
              onClick={() => {
                onReset();
                onClose();
              }}
              className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="סגור"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
            <StepDot active={state === "preview"} done={state === "editing" || state === "applying" || state === "done"} label="תצוגה" />
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
            <StepDot active={state === "editing"} done={state === "applying" || state === "done"} label="עריכה" />
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
            <StepDot active={state === "applying" || state === "done"} done={state === "done"} label="החלה" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {state === "preview" && (
              <PreviewStep plan={plan} members={members} />
            )}
            {state === "editing" && (
              <EditStep
                plan={plan}
                members={members}
                onMoveTask={onMoveTask}
                onRemoveTask={onRemoveTask}
                onAddTask={onAddTask}
                onReassignTask={onReassignTask}
              />
            )}
            {(state === "applying" || state === "done") && (
              <ApplyStep
                totalNew={totalNew}
                totalMinutes={totalMinutes}
                progress={applyProgress}
                isDone={state === "done"}
              />
            )}
          </div>

          {/* Footer actions */}
          <div className="px-4 py-3 bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 safe-bottom">
            {state === "preview" && (
              <div className="flex gap-2">
                <button
                  onClick={onStartEditing}
                  className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform min-h-[48px]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="truncate">ערוך תוכנית</span>
                </button>
                <button
                  onClick={onApply}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform min-h-[48px]"
                >
                  <Check className="w-4 h-4" />
                  <span className="truncate">החל ישירות</span>
                </button>
              </div>
            )}
            {state === "editing" && (
              <button
                onClick={onApply}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform min-h-[48px]"
              >
                <Check className="w-4 h-4" />
                <span className="truncate">החל תוכנית ({totalNew} משימות חדשות)</span>
              </button>
            )}
            {state === "done" && (
              <button
                onClick={() => {
                  onReset();
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-indigo-500 text-white font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform min-h-[48px]"
              >
                <Check className="w-4 h-4" />
                סיום
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Step Components
// ============================================

function StepDot({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
          done
            ? "bg-emerald-500 text-white"
            : active
              ? "bg-indigo-500 text-white"
              : "bg-stone-200 dark:bg-stone-700 text-stone-400"
        }`}
      >
        {done ? <Check className="w-3.5 h-3.5" /> : null}
      </div>
      <span
        className={`text-[11px] ${
          active || done ? "text-stone-900 dark:text-stone-100 font-medium" : "text-stone-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// ============================================
// Preview Step
// ============================================

function PreviewStep({
  plan,
  members,
}: {
  plan: WeekPlan;
  members: Array<{ id: string; name: string }>;
}) {
  const totalNew = plan.reduce(
    (sum, day) => sum + day.tasks.filter((t) => !t.isExisting).length,
    0
  );
  const totalMinutes = plan.reduce((sum, day) => sum + day.totalMinutes, 0);

  const memberStats = useMemo(() => {
    const stats = new Map<string, { tasks: number; minutes: number }>();
    for (const m of members) {
      stats.set(m.id, { tasks: 0, minutes: 0 });
    }
    for (const day of plan) {
      for (const task of day.tasks) {
        if (task.assignee && stats.has(task.assignee)) {
          const s = stats.get(task.assignee)!;
          s.tasks++;
          s.minutes += task.estimated_minutes;
        }
      }
    }
    return stats;
  }, [plan, members]);

  return (
    <div className="p-4 space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-stone-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-indigo-500">{totalNew}</div>
          <div className="text-[11px] text-stone-500">משימות חדשות</div>
        </div>
        <div className="bg-white dark:bg-stone-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-500">{totalMinutes}</div>
          <div className="text-[11px] text-stone-500">דקות סה״כ</div>
        </div>
        <div className="bg-white dark:bg-stone-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-500">
            {plan.filter((d) => d.tasks.length > 0).length}
          </div>
          <div className="text-[11px] text-stone-500">ימים פעילים</div>
        </div>
      </div>

      {/* Per-member balance */}
      {members.length === 2 && (
        <div className="bg-white dark:bg-stone-800 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-medium">חלוקה בין השותפים</span>
          </div>
          <div className="flex gap-2">
            {members.map((m) => {
              const s = memberStats.get(m.id);
              return (
                <div key={m.id} className="flex-1 bg-stone-50 dark:bg-stone-700 rounded-lg p-2">
                  <div className="text-sm font-medium truncate">{m.name}</div>
                  <div className="text-xs text-stone-500">
                    {s?.tasks ?? 0} משימות · {s?.minutes ?? 0} דק׳
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day columns */}
      <div className="space-y-2">
        {plan.map((day) => (
          <DayPreviewCard key={day.date} day={day} members={members} />
        ))}
      </div>
    </div>
  );
}

function DayPreviewCard({
  day,
  members,
}: {
  day: WeekPlan[number];
  members: Array<{ id: string; name: string }>;
}) {
  const newCount = day.tasks.filter((t) => !t.isExisting).length;
  const getMemberName = (id: string | null) =>
    members.find((m) => m.id === id)?.name ?? "—";

  return (
    <div className="bg-white dark:bg-stone-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{day.dayName}</span>
          <span className="text-xs text-stone-400">{day.date.slice(5)}</span>
        </div>
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">
              +{newCount} חדש
            </span>
          )}
          <div className="flex items-center gap-1 text-xs text-stone-500">
            <Clock className="w-3 h-3" />
            {day.totalMinutes} דק׳
          </div>
        </div>
      </div>

      {day.tasks.length === 0 ? (
        <div className="text-xs text-stone-400 text-center py-2">אין משימות</div>
      ) : (
        <div className="space-y-1">
          {day.tasks.map((task, i) => (
            <div
              key={`${day.date}-${i}`}
              className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs ${
                task.isExisting
                  ? "bg-stone-50 dark:bg-stone-700/50 text-stone-500"
                  : "bg-indigo-50 dark:bg-indigo-900/20 text-stone-700 dark:text-stone-300"
              }`}
            >
              <span>{CATEGORY_ICONS[task.category] ?? "🏠"}</span>
              <span className="flex-1 truncate min-w-0">{task.title}</span>
              <span className="text-stone-400 whitespace-nowrap text-[10px]">
                {getMemberName(task.assignee)}
              </span>
              <span className="text-stone-400 text-[10px]">{task.estimated_minutes}′</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Edit Step with Drag & Drop
// ============================================

function EditStep({
  plan,
  members,
  onMoveTask,
  onRemoveTask,
  onAddTask,
  onReassignTask,
}: {
  plan: WeekPlan;
  members: Array<{ id: string; name: string }>;
  onMoveTask: (fromDate: string, taskIndex: number, toDate: string) => void;
  onRemoveTask: (date: string, taskIndex: number) => void;
  onAddTask: (date: string, task: PlannedTask) => void;
  onReassignTask: (date: string, taskIndex: number, newUserId: string) => void;
}) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<{
    task: PlannedTask;
    fromDate: string;
    taskIndex: number;
  } | null>(null);

  // dnd-kit sensors: touch has delay to prevent conflict with scroll
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data) {
      setActiveDrag({
        task: data.task as PlannedTask,
        fromDate: data.fromDate as string,
        taskIndex: data.taskIndex as number,
      });
      haptic("tap");
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDrag(null);

      if (!over || !active.data.current) return;

      const fromDate = active.data.current.fromDate as string;
      const taskIndex = active.data.current.taskIndex as number;
      const toDate = over.id as string;

      if (fromDate !== toDate) {
        onMoveTask(fromDate, taskIndex, toDate);
        haptic("success");
      }
    },
    [onMoveTask]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 space-y-2">
        {/* Summary bar */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm text-indigo-700 dark:text-indigo-300">
            {plan.reduce((s, d) => s + d.tasks.filter((t) => !t.isExisting).length, 0)} משימות חדשות
          </span>
          <span className="text-xs sm:text-sm text-indigo-700 dark:text-indigo-300">
            {plan.reduce((s, d) => s + d.totalMinutes, 0)} דק׳ סה״כ
          </span>
        </div>

        {plan.map((day) => (
          <DayEditCard
            key={day.date}
            day={day}
            plan={plan}
            members={members}
            expanded={expandedDay === day.date}
            isDragTarget={activeDrag !== null && activeDrag.fromDate !== day.date}
            onToggle={() =>
              setExpandedDay((prev) => (prev === day.date ? null : day.date))
            }
            onRemoveTask={onRemoveTask}
            onAddTask={onAddTask}
            onReassignTask={onReassignTask}
          />
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDrag && (
          <div className="bg-indigo-100 dark:bg-indigo-800 rounded-lg px-3 py-2 text-xs shadow-lg border-2 border-indigo-400 opacity-90">
            <span className="ml-1">{CATEGORY_ICONS[activeDrag.task.category] ?? "🏠"}</span>
            {activeDrag.task.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function DayEditCard({
  day,
  plan,
  members,
  expanded,
  isDragTarget,
  onToggle,
  onRemoveTask,
  onAddTask,
  onReassignTask,
}: {
  day: WeekPlan[number];
  plan: WeekPlan;
  members: Array<{ id: string; name: string }>;
  expanded: boolean;
  isDragTarget: boolean;
  onToggle: () => void;
  onRemoveTask: (date: string, taskIndex: number) => void;
  onAddTask: (date: string, task: PlannedTask) => void;
  onReassignTask: (date: string, taskIndex: number, newUserId: string) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>("general");

  // Make this day card a drop target
  const { isOver, setNodeRef } = useDroppable({ id: day.date });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAddTask(day.date, {
      title: newTitle.trim(),
      category: newCategory as TaskTemplate["category"],
      assignee: members[0]?.id ?? null,
      estimated_minutes: 10,
      difficulty: 2,
      isExisting: false,
    });
    setNewTitle("");
    setShowAddForm(false);
    haptic("tap");
  };

  const getMemberName = (id: string | null) =>
    members.find((m) => m.id === id)?.name ?? "—";

  const taskIds = day.tasks.map((_, i) => `${day.date}-${i}`);

  return (
    <div
      ref={setNodeRef}
      className={`bg-white dark:bg-stone-800 rounded-xl overflow-hidden transition-colors ${
        isOver ? "ring-2 ring-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20" : ""
      } ${isDragTarget ? "ring-1 ring-indigo-200 dark:ring-indigo-800" : ""}`}
    >
      {/* Day header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors min-h-[48px]"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{day.dayName}</span>
          <span className="text-xs text-stone-400">{day.tasks.length} משימות</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">{day.totalMinutes} דק׳</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1">
              <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                {day.tasks.map((task, i) => (
                  <DraggableTaskRow
                    key={`${day.date}-${i}`}
                    id={`${day.date}-${i}`}
                    task={task}
                    taskIndex={i}
                    date={day.date}
                    members={members}
                    getMemberName={getMemberName}
                    onRemove={() => {
                      onRemoveTask(day.date, i);
                      haptic("tap");
                    }}
                    onReassign={(newId) => {
                      onReassignTask(day.date, i, newId);
                      haptic("tap");
                    }}
                  />
                ))}
              </SortableContext>

              {/* Add task form */}
              {showAddForm ? (
                <div className="mt-2 space-y-2 bg-stone-50 dark:bg-stone-700/50 p-3 rounded-lg">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="שם המשימה..."
                    className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    autoFocus
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {CATEGORY_KEYS.map((key) => (
                      <button
                        key={key}
                        onClick={() => setNewCategory(key)}
                        className={`px-2 py-1.5 rounded text-xs transition-colors min-h-[32px] ${
                          newCategory === key
                            ? `${CATEGORY_BG_CLASSES[key]} text-white`
                            : "bg-stone-200 dark:bg-stone-600 text-stone-600 dark:text-stone-300"
                        }`}
                      >
                        {CATEGORY_ICONS[key]} {CATEGORY_LABELS[key]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAdd}
                      disabled={!newTitle.trim()}
                      className="flex-1 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium disabled:opacity-50 min-h-[40px]"
                    >
                      הוסף
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 rounded-lg bg-stone-200 dark:bg-stone-600 text-sm min-h-[40px]"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors mt-1 min-h-[40px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  הוסף משימה
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Draggable Task Row
// ============================================

function DraggableTaskRow({
  id,
  task,
  taskIndex,
  date,
  members,
  getMemberName,
  onRemove,
  onReassign,
}: {
  id: string;
  task: PlannedTask;
  taskIndex: number;
  date: string;
  members: Array<{ id: string; name: string }>;
  getMemberName: (id: string | null) => string;
  onRemove: () => void;
  onReassign: (newUserId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: { task, fromDate: date, taskIndex },
    disabled: task.isExisting,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-2 px-2 rounded-lg text-xs transition-colors ${
        isDragging ? "opacity-40" : ""
      } ${
        task.isExisting
          ? "bg-stone-50 dark:bg-stone-700/30 text-stone-500"
          : "bg-indigo-50 dark:bg-indigo-900/20"
      }`}
    >
      {/* Drag handle */}
      {!task.isExisting && (
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded touch-none cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-600 min-w-[28px] min-h-[28px] flex items-center justify-center"
          aria-label="גרור להעברה"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}

      <span className="text-sm">{CATEGORY_ICONS[task.category] ?? "🏠"}</span>
      <span className="flex-1 truncate min-w-0">{task.title}</span>

      {/* Assignee toggle */}
      {members.length === 2 && !task.isExisting && (
        <button
          onClick={() => {
            const other = members.find((m) => m.id !== task.assignee);
            if (other) onReassign(other.id);
          }}
          className="px-2 py-1 rounded bg-stone-200 dark:bg-stone-600 text-[11px] hover:bg-stone-300 dark:hover:bg-stone-500 transition-colors whitespace-nowrap min-h-[28px]"
          title="החלף שותף"
        >
          {getMemberName(task.assignee)}
        </button>
      )}

      {/* Remove */}
      {!task.isExisting && (
        <button
          onClick={onRemove}
          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-500 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          title="הסר"
          aria-label="הסר משימה"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ============================================
// Apply Step
// ============================================

function ApplyStep({
  totalNew,
  totalMinutes,
  progress,
  isDone,
}: {
  totalNew: number;
  totalMinutes: number;
  progress: number;
  isDone: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[250px]">
      {isDone ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold">התוכנית הוחלה!</h3>
            <p className="text-sm text-stone-500 mt-1">
              {totalNew} משימות חדשות נוספו · {totalMinutes} דקות סה״כ
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="text-center space-y-4 w-full max-w-xs">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <div>
            <h3 className="text-lg font-bold">מוסיף משימות...</h3>
            <p className="text-sm text-stone-500 mt-1">
              {totalNew} משימות חדשות
            </p>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
          <span className="text-xs text-stone-500">{progress}%</span>
        </div>
      )}
    </div>
  );
}
