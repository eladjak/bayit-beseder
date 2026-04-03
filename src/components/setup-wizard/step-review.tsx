"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { getDifficultyColor, getDifficultyLabel } from "@/lib/room-task-templates";
import type { SelectedRoom } from "./setup-wizard";

interface StepReviewProps {
  selectedRooms: SelectedRoom[];
  totalTasks: number;
  isCreating: boolean;
  onFinish: () => void;
  onBack: () => void;
}

export function StepReview({ selectedRooms, totalTasks, isCreating, onFinish, onBack }: StepReviewProps) {
  const { t, locale } = useTranslation();
  const isRtl = locale === "he";

  if (isCreating) {
    return (
      <div className="text-center py-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
        />
        <p className="text-lg font-bold text-foreground">
          {t("setupWizard.creating")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">{"📋"}</div>
        <h2 className="text-xl font-bold text-foreground">
          {t("setupWizard.stepReview")}
        </h2>
        <p className="text-sm text-muted mt-1">
          {(t("setupWizard.totalTasks") || "")
            .replace("{count}", String(totalTasks))
            .replace("{rooms}", String(selectedRooms.length))}
        </p>
      </div>

      {/* Room summaries */}
      <div className="space-y-3">
        {selectedRooms.map((sr, index) => {
          const enabledTasks = sr.tasks.filter((t) => t.enabled);
          const byDifficulty = {
            easy: enabledTasks.filter((t) => t.difficulty === 1).length,
            medium: enabledTasks.filter((t) => t.difficulty === 2).length,
            hard: enabledTasks.filter((t) => t.difficulty === 3).length,
          };
          const totalPoints = enabledTasks.reduce(
            (sum, t) => sum + (t.difficulty === 1 ? 5 : t.difficulty === 2 ? 10 : 20),
            0
          );

          return (
            <motion.div
              key={sr.room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-2xl bg-surface border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{sr.room.icon}</span>
                  <span className="font-semibold text-foreground">
                    {isRtl ? sr.room.nameHe : sr.room.nameEn}
                  </span>
                </div>
                <span className="text-xs text-muted">
                  {enabledTasks.length} {isRtl ? "משימות" : "tasks"} · {totalPoints} {isRtl ? "נק'" : "pts"}
                </span>
              </div>

              {/* Difficulty breakdown */}
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((d) => {
                  const count = d === 1 ? byDifficulty.easy : d === 2 ? byDifficulty.medium : byDifficulty.hard;
                  if (count === 0) return null;
                  const color = getDifficultyColor(d);
                  const label = getDifficultyLabel(d);
                  return (
                    <span
                      key={d}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, var(--color-surface, #fff))`, color: `color-mix(in srgb, ${color} 70%, var(--color-foreground, #1a1a1a))` }}
                    >
                      {count} {isRtl ? label.he : label.en}
                    </span>
                  );
                })}
              </div>

              {/* Task list preview */}
              <div className="mt-2 space-y-0.5">
                {enabledTasks.slice(0, 5).map((task, i) => (
                  <div key={i} className="text-xs text-muted flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getDifficultyColor(task.difficulty) }}
                    />
                    {isRtl ? task.title : task.titleEn}
                  </div>
                ))}
                {enabledTasks.length > 5 && (
                  <div className="text-xs text-muted/60">
                    +{enabledTasks.length - 5} {isRtl ? "עוד" : "more"}...
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          {t("setupWizard.back")}
        </button>
        <motion.button
          onClick={onFinish}
          whileTap={{ scale: 0.95 }}
          className="flex-[2] py-3.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg hover:opacity-90 transition-all"
        >
          {t("setupWizard.finish")} ({totalTasks})
        </motion.button>
      </div>
    </div>
  );
}
