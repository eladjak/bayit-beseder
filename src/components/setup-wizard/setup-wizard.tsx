"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { StepCleaningLevel } from "./step-cleaning-level";
import { StepRoomPicker } from "./step-room-picker";
import { StepRoomTasks } from "./step-room-tasks";
import { StepReview } from "./step-review";
import type { CleaningLevel, RoomDefinition, RoomTaskTemplate } from "@/lib/room-task-templates";
import { ROOM_DEFINITIONS, getTasksForRoom } from "@/lib/room-task-templates";

// ============================================
// Types
// ============================================

export interface SelectedRoom {
  room: RoomDefinition;
  tasks: Array<RoomTaskTemplate & { enabled: boolean; custom?: boolean }>;
}

export interface SetupWizardProps {
  /** Called when wizard completes with final task list */
  onComplete: (tasks: Array<{ title: string; category: string; difficulty: 1 | 2 | 3; points: number; estimatedMinutes: number }>) => void;
  /** Called when wizard is dismissed */
  onClose?: () => void;
  /** Pre-select rooms (for Pesach mode) */
  preSelectedRoomIds?: string[];
  /** Pre-set cleaning level (for Pesach mode) */
  presetLevel?: CleaningLevel;
  /** Custom tasks to inject (for Pesach mode) */
  customTasks?: Record<string, RoomTaskTemplate[]>;
  /** Header override (e.g., Pesach countdown) */
  headerOverride?: React.ReactNode;
}

// ============================================
// Constants
// ============================================

const STEPS = ["level", "rooms", "tasks", "review"] as const;
type Step = (typeof STEPS)[number];

// ============================================
// Component
// ============================================

export function SetupWizard({
  onComplete,
  onClose,
  preSelectedRoomIds,
  presetLevel,
  customTasks,
  headerOverride,
}: SetupWizardProps) {
  const { t, locale } = useTranslation();
  const isRtl = locale === "he";

  // Wizard state
  const [currentStep, setCurrentStep] = useState<Step>(presetLevel ? "rooms" : "level");
  const [level, setLevel] = useState<CleaningLevel>(presetLevel ?? "thorough");
  const [selectedRooms, setSelectedRooms] = useState<SelectedRoom[]>(() => {
    if (preSelectedRoomIds) {
      return preSelectedRoomIds
        .map((id) => ROOM_DEFINITIONS.find((r) => r.id === id))
        .filter(Boolean)
        .map((room) => ({
          room: room!,
          tasks: (customTasks?.[room!.id] ?? getTasksForRoom(room!.id, presetLevel ?? "thorough")).map((t) => ({ ...t, enabled: true })),
        }));
    }
    return [];
  });
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  // ============================================
  // Handlers
  // ============================================

  const handleLevelSelect = useCallback((l: CleaningLevel) => {
    setLevel(l);
    setCurrentStep("rooms");
  }, []);

  const handleRoomsConfirm = useCallback((rooms: RoomDefinition[]) => {
    setSelectedRooms(
      rooms.map((room) => ({
        room,
        tasks: (customTasks?.[room.id] ?? getTasksForRoom(room.id, level)).map((t) => ({ ...t, enabled: true })),
      }))
    );
    setCurrentRoomIndex(0);
    setCurrentStep("tasks");
  }, [level, customTasks]);

  const handleTasksUpdate = useCallback((roomId: string, tasks: SelectedRoom["tasks"]) => {
    setSelectedRooms((prev) =>
      prev.map((sr) => (sr.room.id === roomId ? { ...sr, tasks } : sr))
    );
  }, []);

  const handleNextRoom = useCallback(() => {
    if (currentRoomIndex < selectedRooms.length - 1) {
      setCurrentRoomIndex((i) => i + 1);
    } else {
      setCurrentStep("review");
    }
  }, [currentRoomIndex, selectedRooms.length]);

  const handlePrevRoom = useCallback(() => {
    if (currentRoomIndex > 0) {
      setCurrentRoomIndex((i) => i - 1);
    } else {
      setCurrentStep("rooms");
    }
  }, [currentRoomIndex]);

  const handleBack = useCallback(() => {
    const idx = STEPS.indexOf(currentStep);
    if (currentStep === "tasks") {
      handlePrevRoom();
      return;
    }
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1]);
    } else {
      onClose?.();
    }
  }, [currentStep, handlePrevRoom, onClose]);

  const handleFinish = useCallback(async () => {
    setIsCreating(true);
    const allTasks = selectedRooms.flatMap((sr) =>
      sr.tasks
        .filter((t) => t.enabled)
        .map((t) => ({
          title: isRtl ? t.title : t.titleEn,
          category: sr.room.id,
          difficulty: t.difficulty,
          points: t.difficulty === 1 ? 5 : t.difficulty === 2 ? 10 : 20,
          estimatedMinutes: t.estimatedMinutes,
        }))
    );
    onComplete(allTasks);
  }, [selectedRooms, isRtl, onComplete]);

  // ============================================
  // Render
  // ============================================

  const totalSelectedTasks = selectedRooms.reduce(
    (sum, sr) => sum + sr.tasks.filter((t) => t.enabled).length,
    0
  );

  return (
    <div className="min-h-dvh bg-background" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        {headerOverride ?? (
          <div className="max-w-lg mx-auto">
            <h1 className="text-lg font-bold text-foreground text-center">
              {t("setupWizard.title")}
            </h1>
            <p className="text-xs text-muted text-center mt-0.5">
              {t("setupWizard.subtitle")}
            </p>
          </div>
        )}

        {/* Progress bar */}
        <div className="max-w-lg mx-auto mt-3 flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="flex-1 h-1.5 rounded-full bg-border/50 overflow-hidden"
            >
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: i <= stepIndex ? "100%" : "0%" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          ))}
        </div>

        {/* Step labels */}
        <div className="max-w-lg mx-auto mt-1.5 flex justify-between text-[10px] text-muted">
          <span className={stepIndex >= 0 ? "text-primary font-medium" : ""}>
            {t("setupWizard.stepLevel")}
          </span>
          <span className={stepIndex >= 1 ? "text-primary font-medium" : ""}>
            {t("setupWizard.stepRooms")}
          </span>
          <span className={stepIndex >= 2 ? "text-primary font-medium" : ""}>
            {t("setupWizard.stepTasks")}
          </span>
          <span className={stepIndex >= 3 ? "text-primary font-medium" : ""}>
            {t("setupWizard.stepReview")}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {currentStep === "level" && (
            <motion.div
              key="level"
              initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
              transition={{ duration: 0.2 }}
            >
              <StepCleaningLevel
                selected={level}
                onSelect={handleLevelSelect}
              />
            </motion.div>
          )}

          {currentStep === "rooms" && (
            <motion.div
              key="rooms"
              initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
              transition={{ duration: 0.2 }}
            >
              <StepRoomPicker
                level={level}
                selectedRoomIds={selectedRooms.map((sr) => sr.room.id)}
                onConfirm={handleRoomsConfirm}
                onBack={() => setCurrentStep("level")}
              />
            </motion.div>
          )}

          {currentStep === "tasks" && selectedRooms[currentRoomIndex] && (
            <motion.div
              key={`tasks-${selectedRooms[currentRoomIndex].room.id}`}
              initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
              transition={{ duration: 0.2 }}
            >
              <StepRoomTasks
                room={selectedRooms[currentRoomIndex].room}
                tasks={selectedRooms[currentRoomIndex].tasks}
                onUpdate={(tasks) =>
                  handleTasksUpdate(selectedRooms[currentRoomIndex].room.id, tasks)
                }
                roomIndex={currentRoomIndex}
                totalRooms={selectedRooms.length}
                onNext={handleNextRoom}
                onBack={handlePrevRoom}
              />
            </motion.div>
          )}

          {currentStep === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
              transition={{ duration: 0.2 }}
            >
              <StepReview
                selectedRooms={selectedRooms}
                totalTasks={totalSelectedTasks}
                isCreating={isCreating}
                onFinish={handleFinish}
                onBack={() => {
                  setCurrentRoomIndex(selectedRooms.length - 1);
                  setCurrentStep("tasks");
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="fixed top-4 left-4 z-20 w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
