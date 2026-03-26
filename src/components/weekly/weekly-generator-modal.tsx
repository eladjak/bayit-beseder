"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/useFocusTrap";
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
import { useTranslation } from "@/hooks/useTranslation";
import {
  CATEGORY_BG_CLASSES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_KEYS,
} from "@/lib/categories";
import type { WeekPlan, PlannedTask } from "@/lib/weekly-generator";
import type { TaskTemplate } from "@/lib/seed-data";
import { ZoneDayPicker } from "@/components/weekly/zone-day-picker";
import { ZoneWizardStep } from "@/components/weekly/zone-wizard-step";
import type { ZoneDayMapping } from "@/lib/zones";

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
  // Zone configuration (optional)
  showZoneStep?: boolean;
  zoneMappings?: ZoneDayMapping[];
  onZoneMappingsChange?: (mappings: ZoneDayMapping[]) => void;
  onRegenerateWithZones?: () => void;
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
  showZoneStep = false,
  zoneMappings = [],
  onZoneMappingsChange,
  onRegenerateWithZones,
}: WeeklyGeneratorModalProps) {
  const focusRef = useFocusTrap<HTMLDivElement>(open && !!plan, onClose);
  const { t } = useTranslation();
  const [zoneOpen, setZoneOpen] = useState(false);
  // Internal wizard step: show zone-config before preview when showZoneStep is on
  const [localStep, setLocalStep] = useState<"zone-config" | "plan">(
    showZoneStep ? "zone-config" : "plan"
  );

  if (!open || !plan) return null;

  // Compute task count per category from the plan for the zone wizard
  const taskCountByCategory: Record<string, number> = {};
  for (const day of plan) {
    for (const task of day.tasks) {
      const catKey = task.category;
      taskCountByCategory[catKey] = (taskCountByCategory[catKey] ?? 0) + 1;
    }
  }

  const showingZoneStep = localStep === "zone-config" && state === "preview" && showZoneStep;

  const totalNew = plan.reduce(
    (sum, day) => sum + day.tasks.filter((task) => !task.isExisting).length,
    0
  );
  const totalMinutes = plan.reduce((sum, day) => sum + day.totalMinutes, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { onReset(); onClose(); }}
          />

          {/* Modal container — centered, max-w-lg like the app */}
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              ref={focusRef}
              role="dialog"
              aria-modal="true"
              aria-label={t("weekly.wizardLabel")}
              className="pointer-events-auto w-full max-w-lg flex flex-col bg-background rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[85dvh] sm:mx-4 overflow-hidden"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header — gradient-hero to match app */}
              <div className="gradient-hero mesh-overlay relative px-4 pt-4 pb-3 safe-top">
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-white" />
                    <h2 className="text-lg font-bold text-white">{t("weekly.wizard")}</h2>
                  </div>
                  <button
                    onClick={() => { onReset(); onClose(); }}
                    className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={t("common.close")}
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-2 mt-3 relative z-10">
                  {showZoneStep && (
                    <>
                      <StepDot
                        active={showingZoneStep}
                        done={!showingZoneStep}
                        label={t("weekly.stepZoneConfig")}
                      />
                      <div className="flex-1 h-px bg-white/20" />
                    </>
                  )}
                  <StepDot active={state === "preview" && !showingZoneStep} done={state === "editing" || state === "applying" || state === "done"} label={t("weekly.stepPreview")} />
                  <div className="flex-1 h-px bg-white/20" />
                  <StepDot active={state === "editing"} done={state === "applying" || state === "done"} label={t("weekly.stepEdit")} />
                  <div className="flex-1 h-px bg-white/20" />
                  <StepDot active={state === "applying" || state === "done"} done={state === "done"} label={t("weekly.stepApply")} />
                </div>
              </div>

              {/* Content — scrollable */}
              <div className="flex-1 overflow-y-auto overscroll-contain bg-background">
                {/* Zone wizard step — full-page step before preview */}
                {showingZoneStep && (
                  <ZoneWizardStep
                    zoneMappings={zoneMappings}
                    onZoneMappingsChange={onZoneMappingsChange ?? (() => {})}
                    taskCountByCategory={taskCountByCategory}
                  />
                )}

                {/* Zone configuration collapsible — shown in preview state when showZoneStep is true AND zone step was already completed */}
                {state === "preview" && showZoneStep && !showingZoneStep && (
                  <div className="border-b border-border">
                    <button
                      type="button"
                      onClick={() => setZoneOpen((o) => !o)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-surface transition-colors"
                      aria-expanded={zoneOpen}
                    >
                      <span>{t("weekly.zoneConfigToggle")}</span>
                      {zoneOpen ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {zoneOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 flex flex-col gap-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t("weekly.zoneConfigDesc")}
                            </p>
                            <ZoneDayPicker
                              mappings={zoneMappings}
                              onChange={onZoneMappingsChange ?? (() => {})}
                            />
                            {onRegenerateWithZones && (
                              <button
                                type="button"
                                onClick={() => {
                                  setZoneOpen(false);
                                  onRegenerateWithZones();
                                }}
                                className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform min-h-[44px]"
                              >
                                <Wand2 className="w-4 h-4" />
                                {t("weekly.regenerateWithZones")}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {state === "preview" && !showingZoneStep && (
                  <PreviewStep
                    plan={plan}
                    members={members}
                    onMoveTask={onMoveTask}
                    onRemoveTask={onRemoveTask}
                    onReassignTask={onReassignTask}
                  />
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

              {/* Footer actions — elevated surface */}
              <div className="px-4 py-3 bg-surface border-t border-border safe-bottom">
                {/* Zone step footer: Next button to proceed to preview */}
                {showingZoneStep && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (onRegenerateWithZones) onRegenerateWithZones();
                        setLocalStep("plan");
                      }}
                      className="flex-1 py-3 rounded-2xl gradient-primary text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform min-h-[48px]"
                    >
                      <Wand2 className="w-4 h-4" />
                      <span className="truncate">{t("weekly.regenerateWithZones")}</span>
                    </button>
                  </div>
                )}
                {state === "preview" && !showingZoneStep && (
                  <div className="flex gap-2">
                    {/* Back to zone step if zone mode is on */}
                    {showZoneStep && (
                      <button
                        onClick={() => setLocalStep("zone-config")}
                        className="py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform min-h-[48px]"
                        aria-label={t("weekly.stepZoneConfig")}
                      >
                        <span className="text-base">🏠</span>
                      </button>
                    )}
                    <button
                      onClick={onStartEditing}
                      className="flex-1 py-3 rounded-xl bg-primary/10 text-primary font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform min-h-[48px]"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="truncate">{t("weekly.editPlan")}</span>
                    </button>
                    <button
                      onClick={onApply}
                      className="flex-1 py-3 rounded-2xl gradient-primary text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform min-h-[48px]"
                    >
                      <Check className="w-4 h-4" />
                      <span className="truncate">{t("weekly.applyDirect")}</span>
                    </button>
                  </div>
                )}
                {state === "editing" && (
                  <button
                    onClick={onApply}
                    className="w-full py-3 rounded-2xl gradient-primary text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform min-h-[48px]"
                  >
                    <Check className="w-4 h-4" />
                    <span className="truncate">{t("weekly.applyPlan")} ({totalNew} {t("weekly.newTasks")})</span>
                  </button>
                )}
                {state === "done" && (
                  <button
                    onClick={() => { onReset(); onClose(); }}
                    className="w-full py-3 rounded-2xl gradient-primary text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform min-h-[48px]"
                  >
                    <Check className="w-4 h-4" />
                    {t("weekly.finish")}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
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
            ? "bg-white text-primary"
            : active
              ? "bg-white/90 text-primary"
              : "bg-white/20 text-white/60"
        }`}
      >
        {done ? <Check className="w-3.5 h-3.5" /> : null}
      </div>
      <span
        className={`text-[11px] ${
          active || done ? "text-white font-medium" : "text-white/50"
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
  onMoveTask,
  onRemoveTask,
  onReassignTask,
}: {
  plan: WeekPlan;
  members: Array<{ id: string; name: string }>;
  onMoveTask: (fromDate: string, taskIndex: number, toDate: string) => void;
  onRemoveTask: (date: string, taskIndex: number) => void;
  onReassignTask: (date: string, taskIndex: number, newUserId: string) => void;
}) {
  const { t } = useTranslation();
  const totalNew = plan.reduce(
    (sum, day) => sum + day.tasks.filter((task) => !task.isExisting).length,
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

  // D&D support in preview
  const [activeDrag, setActiveDrag] = useState<{
    task: PlannedTask;
    fromDate: string;
    taskIndex: number;
  } | null>(null);

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
      <div className="p-4 space-y-3">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="card-elevated p-3 text-center">
            <div className="text-2xl font-bold text-primary">{totalNew}</div>
            <div className="text-[11px] text-muted">{t("weekly.newTasks")}</div>
          </div>
          <div className="card-elevated p-3 text-center">
            <div className="text-2xl font-bold text-success">{totalMinutes}</div>
            <div className="text-[11px] text-muted">{t("weekly.totalMin")}</div>
          </div>
          <div className="card-elevated p-3 text-center">
            <div className="text-2xl font-bold text-warning">
              {plan.filter((d) => d.tasks.length > 0).length}
            </div>
            <div className="text-[11px] text-muted">{t("weekly.activeDays")}</div>
          </div>
        </div>

        {/* Per-member balance */}
        {members.length === 2 && (
          <div className="card-elevated p-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted" />
              <span className="text-sm font-medium text-foreground">{t("weekly.partnerSplit")}</span>
            </div>
            <div className="flex gap-2">
              {members.map((m) => {
                const s = memberStats.get(m.id);
                return (
                  <div key={m.id} className="flex-1 bg-background rounded-lg p-2">
                    <div className="text-sm font-medium text-foreground truncate">{m.name}</div>
                    <div className="text-xs text-muted">
                      {s?.tasks ?? 0} {t("nav.tasks")} · {s?.minutes ?? 0} {t("common.minutes")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* D&D hint */}
        <div className="text-xs text-center text-muted/60 flex items-center justify-center gap-1">
          <GripVertical className="w-3 h-3" />
          {t("weekly.dragHint")}
        </div>

        {/* Day columns */}
        <div className="space-y-2">
          {plan.map((day) => (
            <DayPreviewCard
              key={day.date}
              day={day}
              members={members}
              isDragTarget={activeDrag !== null && activeDrag.fromDate !== day.date}
              onRemoveTask={onRemoveTask}
              onReassignTask={onReassignTask}
            />
          ))}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDrag && (
          <div className="bg-primary/15 rounded-lg px-3 py-2 text-xs shadow-lg border-2 border-primary opacity-90 text-foreground">
            <span className="ms-1">{CATEGORY_ICONS[activeDrag.task.category] ?? "🏠"}</span>
            {activeDrag.task.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function DayPreviewCard({
  day,
  members,
  isDragTarget,
  onRemoveTask,
  onReassignTask,
}: {
  day: WeekPlan[number];
  members: Array<{ id: string; name: string }>;
  isDragTarget: boolean;
  onRemoveTask: (date: string, taskIndex: number) => void;
  onReassignTask: (date: string, taskIndex: number, newUserId: string) => void;
}) {
  const { t } = useTranslation();
  const newCount = day.tasks.filter((ti) => !ti.isExisting).length;
  const getMemberName = (id: string | null) =>
    members.find((m) => m.id === id)?.name ?? "—";

  // Make this card a droppable target
  const { isOver, setNodeRef } = useDroppable({ id: day.date });

  return (
    <div
      ref={setNodeRef}
      className={`card-elevated p-3 transition-all ${
        isOver
          ? "ring-2 ring-primary bg-primary/5"
          : isDragTarget
            ? "ring-1 ring-primary/30"
            : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">{day.dayName}</span>
          <span className="text-xs text-muted">{day.date.slice(5)}</span>
        </div>
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
              +{newCount} {t("weekly.new")}
            </span>
          )}
          <div className="flex items-center gap-1 text-xs text-muted">
            <Clock className="w-3 h-3" />
            {day.totalMinutes} {t("common.minutes")}
          </div>
        </div>
      </div>

      {day.tasks.length === 0 ? (
        <div className="text-xs text-muted text-center py-2">{t("weekly.noTasks")}</div>
      ) : (
        <SortableContext items={day.tasks.map((_, i) => `preview-${day.date}-${i}`)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {day.tasks.map((task, i) => (
              <PreviewDraggableTask
                key={`preview-${day.date}-${i}`}
                id={`preview-${day.date}-${i}`}
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
          </div>
        </SortableContext>
      )}
    </div>
  );
}

function PreviewDraggableTask({
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
  const { t } = useTranslation();
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
      className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs transition-opacity ${
        isDragging ? "opacity-40" : ""
      } ${
        task.isExisting
          ? "bg-background text-muted"
          : "bg-primary/5 text-foreground"
      }`}
    >
      {/* Drag handle for new tasks */}
      {!task.isExisting && (
        <button
          {...attributes}
          {...listeners}
          className="p-0.5 rounded touch-none cursor-grab active:cursor-grabbing text-muted/40 hover:text-muted flex-shrink-0"
          aria-label={t("weekly.dragToMove")}
        >
          <GripVertical className="w-3 h-3" />
        </button>
      )}

      <span>{CATEGORY_ICONS[task.category] ?? "🏠"}</span>
      <span className="flex-1 truncate min-w-0">{task.title}</span>

      {/* Assignee toggle */}
      {members.length === 2 && !task.isExisting ? (
        <button
          onClick={() => {
            const other = members.find((m) => m.id !== task.assignee);
            if (other) onReassign(other.id);
          }}
          className="px-2 py-0.5 rounded bg-border/30 text-[10px] hover:bg-border/50 transition-colors whitespace-nowrap text-foreground"
          title={t("weekly.switchPartner")}
        >
          {getMemberName(task.assignee)}
        </button>
      ) : (
        <span className="text-muted whitespace-nowrap text-[10px]">
          {getMemberName(task.assignee)}
        </span>
      )}

      <span className="text-muted text-[10px]">{task.estimated_minutes}′</span>

      {/* Remove button for new tasks */}
      {!task.isExisting && (
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-danger/10 text-danger/40 hover:text-danger transition-colors"
          title={t("weekly.remove")}
          aria-label={t("weekly.removeTask")}
        >
          <Trash2 className="w-3 h-3" />
        </button>
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
  const { t } = useTranslation();
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
        <div className="bg-primary/5 rounded-xl p-3 flex items-center justify-between gap-2 border border-primary/10">
          <span className="text-xs sm:text-sm text-primary font-medium">
            {plan.reduce((s, d) => s + d.tasks.filter((task) => !task.isExisting).length, 0)} {t("weekly.newTasks")}
          </span>
          <span className="text-xs sm:text-sm text-primary font-medium">
            {plan.reduce((s, d) => s + d.totalMinutes, 0)} {t("weekly.totalMin")}
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
          <div className="bg-primary/15 rounded-lg px-3 py-2 text-xs shadow-lg border-2 border-primary opacity-90 text-foreground">
            <span className="ms-1">{CATEGORY_ICONS[activeDrag.task.category] ?? "🏠"}</span>
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
  const { t } = useTranslation();
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
      className={`card-elevated overflow-hidden transition-all ${
        isOver ? "ring-2 ring-primary bg-primary/5" : ""
      } ${isDragTarget ? "ring-1 ring-primary/30" : ""}`}
    >
      {/* Day header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-surface-hover transition-colors min-h-[48px]"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">{day.dayName}</span>
          <span className="text-xs text-muted">{day.tasks.length} {t("nav.tasks")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{day.totalMinutes} {t("common.minutes")}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted" />
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
                <div className="mt-2 space-y-2 bg-background p-3 rounded-lg border border-border/50">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={t("weekly.taskNamePlaceholder")}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted"
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
                            : "bg-border/30 text-muted hover:bg-border/50"
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
                      className="flex-1 py-2 rounded-xl gradient-primary text-white text-sm font-semibold disabled:opacity-50 min-h-[40px]"
                    >
                      {t("weekly.addButton")}
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 rounded-xl border border-border text-muted text-sm min-h-[40px] hover:bg-surface-hover transition-colors"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-primary hover:bg-primary/5 rounded-lg transition-colors mt-1 min-h-[40px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("tasks.addTask")}
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
  const { t } = useTranslation();
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
          ? "bg-background text-muted"
          : "bg-primary/5 text-foreground"
      }`}
    >
      {/* Drag handle */}
      {!task.isExisting && (
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded touch-none cursor-grab active:cursor-grabbing text-muted hover:text-foreground min-w-[28px] min-h-[28px] flex items-center justify-center"
          aria-label={t("weekly.dragToMove")}
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
          className="px-2 py-1 rounded bg-border/30 text-[11px] hover:bg-border/50 transition-colors whitespace-nowrap min-h-[28px] text-foreground"
          title={t("weekly.switchPartner")}
        >
          {getMemberName(task.assignee)}
        </button>
      )}

      {/* Remove */}
      {!task.isExisting && (
        <button
          onClick={onRemove}
          className="p-1.5 rounded hover:bg-danger/10 text-danger/60 hover:text-danger transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          title={t("weekly.remove")}
          aria-label={t("weekly.removeTask")}
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[250px]">
      {isDone ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-success" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{t("common.success")}!</h3>
            <p className="text-sm text-muted mt-1">
              {totalNew} {t("weekly.newTasks")} · {totalMinutes} {t("weekly.totalMin")}
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="text-center space-y-4 w-full max-w-xs">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-foreground">{t("common.loading")}</h3>
            <p className="text-sm text-muted mt-1">
              {totalNew} {t("weekly.newTasks")}
            </p>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-border/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
          <span className="text-xs text-muted">{progress}%</span>
        </div>
      )}
    </div>
  );
}
