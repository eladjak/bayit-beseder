"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { CATEGORY_KEYS, type CategoryKey } from "@/lib/categories";
import {
  getZoneInfo,
  DEFAULT_ZONE_MAPPINGS,
  type ZoneDayMapping,
} from "@/lib/zones";
import { haptic } from "@/lib/haptics";

// ============================================
// Types
// ============================================

export interface ZoneWizardStepProps {
  zoneMappings: ZoneDayMapping[];
  onZoneMappingsChange: (mappings: ZoneDayMapping[]) => void;
  taskCountByCategory: Record<string, number>;
}

// Days shown (Sun–Thu, Israeli work week)
const WIZARD_DAYS = [0, 1, 2, 3, 4] as const;
type WizardDay = (typeof WIZARD_DAYS)[number];

const DAY_SHORT_LABELS: Record<WizardDay, string> = {
  0: "ראשון",
  1: "שני",
  2: "שלישי",
  3: "רביעי",
  4: "חמישי",
};

// Zone colour classes — matching zone-day-picker.tsx
const ZONE_BG_CLASSES: Record<CategoryKey, string> = {
  kitchen: "bg-amber-50 dark:bg-amber-950/30 ring-amber-300 dark:ring-amber-700",
  bathroom: "bg-blue-50 dark:bg-blue-950/30 ring-blue-300 dark:ring-blue-700",
  living: "bg-purple-50 dark:bg-purple-950/30 ring-purple-300 dark:ring-purple-700",
  bedroom: "bg-pink-50 dark:bg-pink-950/30 ring-pink-300 dark:ring-pink-700",
  laundry: "bg-cyan-50 dark:bg-cyan-950/30 ring-cyan-300 dark:ring-cyan-700",
  outdoor: "bg-lime-50 dark:bg-lime-950/30 ring-lime-300 dark:ring-lime-700",
  pets: "bg-orange-50 dark:bg-orange-950/30 ring-orange-300 dark:ring-orange-700",
  general: "bg-emerald-50 dark:bg-emerald-950/30 ring-emerald-300 dark:ring-emerald-700",
};

const ZONE_ACCENT_CLASSES: Record<CategoryKey, string> = {
  kitchen: "bg-amber-500",
  bathroom: "bg-blue-500",
  living: "bg-purple-500",
  bedroom: "bg-pink-500",
  laundry: "bg-cyan-500",
  outdoor: "bg-lime-500",
  pets: "bg-orange-500",
  general: "bg-emerald-500",
};

// ============================================
// Helpers
// ============================================

function getAssignedDay(zone: CategoryKey, mappings: ZoneDayMapping[]): number | null {
  const m = mappings.find((x) => x.zone === zone);
  if (!m || m.preferredDays.length === 0) return null;
  const d = m.preferredDays[0];
  return WIZARD_DAYS.includes(d as WizardDay) ? d : null;
}

function setZoneDay(
  zone: CategoryKey,
  day: number | null,
  mappings: ZoneDayMapping[]
): ZoneDayMapping[] {
  const existing = mappings.find((m) => m.zone === zone);
  if (day === null) {
    // Remove zone from mappings
    return mappings.filter((m) => m.zone !== zone);
  }
  if (existing) {
    return mappings.map((m) =>
      m.zone === zone ? { ...m, preferredDays: [day] } : m
    );
  }
  return [...mappings, { zone, preferredDays: [day] }];
}

// ============================================
// Draggable Zone Card
// ============================================

interface ZoneCardProps {
  zone: CategoryKey;
  taskCount: number;
  isDragging?: boolean;
}

function ZoneCard({ zone, taskCount, isDragging = false }: ZoneCardProps) {
  const { t } = useTranslation();
  const info = getZoneInfo(zone);
  const bgClass = ZONE_BG_CLASSES[zone];

  return (
    <div
      className={[
        "flex items-center gap-2 rounded-xl ring-1 px-3 py-2.5 min-h-[44px] select-none transition-shadow",
        bgClass,
        isDragging ? "shadow-lg opacity-95 rotate-1 scale-105" : "shadow-sm",
      ].join(" ")}
    >
      <span className="text-xl leading-none shrink-0">{info.icon}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight">
          {info.label}
        </span>
        {taskCount > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
            {taskCount} {t("weekly.zoneWizard.tasksCount")}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// Draggable wrapper
// ============================================

function DraggableZone({
  zone,
  taskCount,
}: {
  zone: CategoryKey;
  taskCount: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: zone,
    data: { zone },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={[
        "cursor-grab active:cursor-grabbing touch-none rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        isDragging ? "opacity-30" : "",
      ].join(" ")}
      style={{ touchAction: "none" }}
    >
      <ZoneCard zone={zone} taskCount={taskCount} />
    </div>
  );
}

// ============================================
// Droppable Day Column
// ============================================

interface DayColumnProps {
  dayIndex: WizardDay;
  zones: CategoryKey[];
  taskCountByCategory: Record<string, number>;
  onRemoveZone: (zone: CategoryKey) => void;
}

function DayColumn({ dayIndex, zones, taskCountByCategory, onRemoveZone }: DayColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: `day-${dayIndex}` });

  return (
    <div
      ref={setNodeRef}
      className={[
        "flex flex-col gap-1.5 rounded-xl border-2 border-dashed p-2 min-h-[80px] transition-colors duration-150",
        isOver
          ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30"
          : "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30",
      ].join(" ")}
    >
      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 text-center pb-0.5">
        {DAY_SHORT_LABELS[dayIndex]}
      </span>
      <AnimatePresence initial={false}>
        {zones.map((zone) => (
          <motion.button
            key={zone}
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            type="button"
            onClick={() => onRemoveZone(zone)}
            onPointerDown={(e) => {
              // Allow drag to start; tap only fires on pointerup without movement
              e.currentTarget.dataset.pointerDownX = String(e.clientX);
              e.currentTarget.dataset.pointerDownY = String(e.clientY);
            }}
            aria-label={`הסר ${getZoneInfo(zone).label} מיום ${DAY_SHORT_LABELS[dayIndex]}`}
            className="w-full text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
          >
            <ZoneCard zone={zone} taskCount={taskCountByCategory[zone] ?? 0} />
          </motion.button>
        ))}
      </AnimatePresence>
      {zones.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] text-gray-300 dark:text-gray-600">
            גרור לכאן
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Mobile Day Picker Popover
// ============================================

interface MobileDayPickerProps {
  zone: CategoryKey;
  currentDay: number | null;
  onSelect: (day: number | null) => void;
  onClose: () => void;
}

function MobileDayPicker({ zone, currentDay, onSelect, onClose }: MobileDayPickerProps) {
  const { t } = useTranslation();
  const info = getZoneInfo(zone);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-lg bg-background rounded-t-2xl p-4 pb-safe-bottom"
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: 60 }}
        transition={{ duration: 0.2 }}
        dir="rtl"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{info.icon}</span>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {info.label}
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {t("weekly.zoneWizard.tapHint")}
        </p>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {WIZARD_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => {
                onSelect(currentDay === day ? null : day);
                onClose();
              }}
              className={[
                "py-2.5 rounded-xl text-xs font-semibold transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                currentDay === day
                  ? `${ZONE_ACCENT_CLASSES[zone]} text-white`
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
              ].join(" ")}
            >
              {DAY_SHORT_LABELS[day]}
            </button>
          ))}
        </div>
        {currentDay !== null && (
          <button
            type="button"
            onClick={() => { onSelect(null); onClose(); }}
            className="w-full py-2.5 rounded-xl text-sm text-red-500 font-medium bg-red-50 dark:bg-red-950/30 min-h-[44px]"
          >
            {t("weekly.zoneWizard.unassigned")}
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Main Component
// ============================================

export function ZoneWizardStep({
  zoneMappings,
  onZoneMappingsChange,
  taskCountByCategory,
}: ZoneWizardStepProps) {
  const { t } = useTranslation();
  const [activeZone, setActiveZone] = useState<CategoryKey | null>(null);
  const [mobilePicker, setMobilePicker] = useState<CategoryKey | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Build a map of day → zones assigned to that day
  const zonesByDay = WIZARD_DAYS.reduce(
    (acc, day) => {
      acc[day] = CATEGORY_KEYS.filter((zone) => {
        const assigned = getAssignedDay(zone, zoneMappings);
        return assigned === day;
      });
      return acc;
    },
    {} as Record<WizardDay, CategoryKey[]>
  );

  // Zones that are not assigned to any work day
  const unassignedZones = CATEGORY_KEYS.filter(
    (zone) => getAssignedDay(zone, zoneMappings) === null
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const zone = event.active.data.current?.zone as CategoryKey | undefined;
    if (zone) {
      setActiveZone(zone);
      haptic("tap");
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over, active } = event;
      setActiveZone(null);

      const zone = active.data.current?.zone as CategoryKey | undefined;
      if (!zone) return;

      if (over && String(over.id).startsWith("day-")) {
        const dayIndex = Number(String(over.id).replace("day-", ""));
        onZoneMappingsChange(setZoneDay(zone, dayIndex, zoneMappings));
        haptic("success");
      }
    },
    [zoneMappings, onZoneMappingsChange]
  );

  const handleRemoveZoneFromDay = useCallback(
    (zone: CategoryKey) => {
      onZoneMappingsChange(setZoneDay(zone, null, zoneMappings));
      haptic("tap");
    },
    [zoneMappings, onZoneMappingsChange]
  );

  const handleMobileSelect = useCallback(
    (zone: CategoryKey, day: number | null) => {
      onZoneMappingsChange(setZoneDay(zone, day, zoneMappings));
    },
    [zoneMappings, onZoneMappingsChange]
  );

  const handleReset = useCallback(() => {
    onZoneMappingsChange(DEFAULT_ZONE_MAPPINGS);
    haptic("tap");
  }, [onZoneMappingsChange]);

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4 p-4" dir="rtl">
        {/* Header */}
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {t("weekly.zoneWizard.title")}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {t("weekly.zoneWizard.dragHint")}
          </p>
        </div>

        {/* Day columns — horizontal scroll on small screens */}
        <div className="grid grid-cols-5 gap-2">
          {WIZARD_DAYS.map((day) => (
            <DayColumn
              key={day}
              dayIndex={day}
              zones={zonesByDay[day]}
              taskCountByCategory={taskCountByCategory}
              onRemoveZone={handleRemoveZoneFromDay}
            />
          ))}
        </div>

        {/* Unassigned pool */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {t("weekly.zoneWizard.unassigned")}
            </span>
          </div>
          <div
            className="min-h-[60px] rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-2"
          >
            {unassignedZones.length === 0 ? (
              <div className="flex items-center justify-center h-12">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  כל האזורים שויכו לימים ✓
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unassignedZones.map((zone) => (
                  <div
                    key={zone}
                    className="relative"
                  >
                    {/* Desktop: draggable */}
                    <div className="hidden sm:block">
                      <DraggableZone
                        zone={zone}
                        taskCount={taskCountByCategory[zone] ?? 0}
                      />
                    </div>
                    {/* Mobile: tap to open day picker */}
                    <button
                      type="button"
                      className="sm:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
                      onClick={() => setMobilePicker(zone)}
                      aria-label={`${getZoneInfo(zone).label} — ${t("weekly.zoneWizard.tapHint")}`}
                    >
                      <ZoneCard
                        zone={zone}
                        taskCount={taskCountByCategory[zone] ?? 0}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reset button */}
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <RotateCcw className="w-4 h-4" />
          {t("weekly.zoneWizard.resetDefaults")}
        </button>
      </div>

      {/* Drag overlay */}
      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeZone ? (
          <ZoneCard
            zone={activeZone}
            taskCount={taskCountByCategory[activeZone] ?? 0}
            isDragging
          />
        ) : null}
      </DragOverlay>

      {/* Mobile day picker */}
      <AnimatePresence>
        {mobilePicker && (
          <MobileDayPicker
            zone={mobilePicker}
            currentDay={getAssignedDay(mobilePicker, zoneMappings)}
            onSelect={(day) => handleMobileSelect(mobilePicker, day)}
            onClose={() => setMobilePicker(null)}
          />
        )}
      </AnimatePresence>
    </DndContext>
  );
}
