"use client";

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, X } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { useEarnedBadges } from "@/hooks/useEarnedBadges";
import { useCompletions } from "@/hooks/useCompletions";
import { useTasks } from "@/hooks/useTasks";
import { useTranslation } from "@/hooks/useTranslation";

interface BadgeDetailModalProps {
  code: string;
  onClose: () => void;
  isEarned: boolean;
  progress: number;
}

function BadgeDetailModal({ code, onClose, isEarned, progress }: BadgeDetailModalProps) {
  const { t } = useTranslation();
  const ach = ACHIEVEMENTS.find((a) => a.code === code);
  if (!ach) return null;

  const pct = Math.min(100, Math.round((progress / ach.threshold) * 100));

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

        {/* Sheet */}
        <motion.div
          className="relative w-full max-w-lg bg-background rounded-t-3xl p-6 pb-8 shadow-2xl"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          dir="rtl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full hover:bg-surface text-muted hover:text-foreground transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center gap-3 text-center">
            <span
              className={`text-5xl ${isEarned ? "" : "grayscale opacity-40"}`}
              aria-hidden="true"
            >
              {ach.icon}
            </span>
            <h3 className="text-lg font-bold text-foreground">{ach.title}</h3>
            <p className="text-sm text-muted">{ach.description}</p>

            {isEarned ? (
              <span className="bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-xs font-semibold px-3 py-1 rounded-full">
                {t("badges.earned")} ✓
              </span>
            ) : (
              <div className="w-full space-y-1.5">
                <div className="flex justify-between text-xs text-muted">
                  <span>{t("badges.progress")}</span>
                  <span>{progress} / {ach.threshold}</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-sm font-medium">
              <span aria-hidden="true">⭐</span>
              <span>{ach.points} {t("badges.points")}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface BadgeTileProps {
  code: string;
  isEarned: boolean;
  onClick: () => void;
}

const BadgeTile = memo(function BadgeTile({ code, isEarned, onClick }: BadgeTileProps) {
  const ach = ACHIEVEMENTS.find((a) => a.code === code);
  if (!ach) return null;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        isEarned
          ? "bg-surface border-primary/20 shadow-sm shadow-primary/10"
          : "bg-surface/40 border-border/40"
      }`}
      aria-label={`${ach.title}${isEarned ? " — הושג" : " — לא הושג עדיין"}`}
      title={ach.title}
    >
      {/* Badge icon */}
      <span
        className={`text-2xl leading-none ${isEarned ? "" : "grayscale opacity-30"}`}
        aria-hidden="true"
      >
        {ach.icon}
      </span>

      {/* Lock overlay */}
      {!isEarned && (
        <div
          className="absolute top-1.5 right-1.5 bg-background/80 rounded-full p-0.5"
          aria-hidden="true"
        >
          <Lock className="w-2.5 h-2.5 text-muted/70" />
        </div>
      )}

      {/* Glow ring for earned */}
      {isEarned && (
        <span
          className="absolute inset-0 rounded-2xl ring-1 ring-primary/30"
          aria-hidden="true"
        />
      )}

      {/* Title */}
      <p
        className={`text-[10px] text-center leading-tight line-clamp-2 ${
          isEarned ? "text-foreground font-medium" : "text-muted"
        }`}
      >
        {ach.title}
      </p>
    </motion.button>
  );
});

export const BadgesDisplay = memo(function BadgesDisplay() {
  const { t } = useTranslation();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const { completions, loading: completionsLoading } = useCompletions({ limit: 500 });
  const { tasks, loading: tasksLoading } = useTasks({});

  const isDemo = !completionsLoading && completions.length === 0;
  const { earned, progress } = useEarnedBadges({
    completions,
    tasks,
    isDemo,
  });

  const isLoading = completionsLoading || tasksLoading;

  if (isLoading) {
    return (
      <div
        className="grid grid-cols-4 gap-2"
        aria-busy="true"
        aria-label={t("common.loading")}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-2xl bg-surface animate-pulse"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        className="grid grid-cols-4 gap-2"
        role="list"
        aria-label={t("badges.title")}
      >
        {ACHIEVEMENTS.map((ach) => (
          <div key={ach.code} role="listitem">
            <BadgeTile
              code={ach.code}
              isEarned={earned.has(ach.code)}
              onClick={() => setSelectedCode(ach.code)}
            />
          </div>
        ))}
      </div>

      {/* Summary */}
      <p className="text-xs text-muted text-center mt-3">
        {earned.size} / {ACHIEVEMENTS.length} {t("badges.unlocked")}
      </p>

      {/* Detail Modal */}
      {selectedCode && (
        <BadgeDetailModal
          code={selectedCode}
          isEarned={earned.has(selectedCode)}
          progress={progress[selectedCode] ?? 0}
          onClose={() => setSelectedCode(null)}
        />
      )}
    </>
  );
});
