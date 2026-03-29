"use client";

import { memo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, ChevronDown, Trophy } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { ChallengeProgress } from "@/hooks/useWeeklyChallenges";

interface WeeklyChallengesProps {
  progress: ChallengeProgress[];
  weekNum: number;
  defaultOpen?: boolean;
}

const RANK_MEDAL = ["🥇", "🥈", "🥉"];

function ChallengeCard({ item, index }: { item: ChallengeProgress; index: number }) {
  const { t } = useTranslation();
  const confettiFired = useRef(false);

  const fireConfetti = useCallback(async () => {
    if (confettiFired.current || !item.isCompleted) return;
    confettiFired.current = true;
    try {
      const confetti = (await import("canvas-confetti")).default;
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    } catch {
      // ignore
    }
  }, [item.isCompleted]);

  // Fire confetti when this card mounts in a completed state
  // (only once per challenge per session via ref)
  if (typeof window !== "undefined" && item.isCompleted && !confettiFired.current) {
    // We schedule it to avoid calling async in render
    setTimeout(fireConfetti, 200);
  }

  const rankMedal = index < 3 ? RANK_MEDAL[index] : null;
  const typeLabel =
    item.challenge.type === "household"
      ? t("challenges.typeHousehold")
      : t("challenges.typeIndividual");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      className={`rounded-xl p-3 space-y-2 ${
        item.isCompleted
          ? "bg-success/10 border border-success/20"
          : "bg-surface-hover border border-border/40"
      }`}
    >
      {/* Challenge header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none flex-shrink-0" aria-hidden>
            {item.challenge.icon}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground truncate">
                {item.challenge.title}
              </span>
              {rankMedal && (
                <span className="text-xs" aria-hidden>
                  {rankMedal}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted leading-tight">
              {item.challenge.description}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              item.challenge.type === "household"
                ? "bg-primary/10 text-primary"
                : "bg-warning/10 text-warning"
            }`}
          >
            {typeLabel}
          </span>
          {item.isCompleted ? (
            <span className="text-success text-base leading-none" aria-label={t("challenges.completed")}>
              ✅
            </span>
          ) : (
            <span className="text-[11px] text-muted font-mono">
              {item.current}/{item.challenge.target}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-border/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              backgroundColor: item.isCompleted ? "#22C55E" : "#4F46E5",
              transformOrigin: "right",
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: item.percentage / 100 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted">
            {item.isCompleted
              ? t("challenges.completedLabel")
              : `${item.percentage}%`}
          </span>
          <span className="text-[10px] text-warning font-medium">
            +{item.challenge.reward} {t("challenges.points")}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export const WeeklyChallenges = memo(function WeeklyChallenges({
  progress,
  weekNum,
  defaultOpen = false,
}: WeeklyChallengesProps) {
  const { t } = useTranslation();

  const completedCount = progress.filter((p) => p.isCompleted).length;

  return (
    <div className="rounded-2xl overflow-hidden card-elevated">
      {/* Section header — always visible */}
      <div className="flex items-center justify-between p-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">
            {t("challenges.sectionTitle")}
          </span>
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
            {t("challenges.weekLabel")} {weekNum}
          </span>
        </div>
        <span className="text-[11px] text-muted">
          {completedCount}/{progress.length} {t("challenges.done")}
        </span>
      </div>

      {/* Challenge cards */}
      <div className="p-3 space-y-2.5">
        <AnimatePresence initial={false}>
          {progress.map((item, index) => (
            <ChallengeCard key={item.challenge.id} item={item} index={index} />
          ))}
        </AnimatePresence>

        {completedCount === progress.length && progress.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-2"
          >
            <Trophy className="w-5 h-5 text-warning mx-auto mb-1" />
            <p className="text-xs font-semibold text-warning">
              {t("challenges.allDone")}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
});

/** Collapsible version for the dashboard accordion */
export const WeeklyChallengesCollapsible = memo(function WeeklyChallengesCollapsible({
  progress,
  weekNum,
}: WeeklyChallengesProps) {
  const { t } = useTranslation();
  const completedCount = progress.filter((p) => p.isCompleted).length;

  return (
    <details className="group rounded-2xl overflow-hidden card-elevated">
      <summary className="flex items-center justify-between p-3 cursor-pointer list-none select-none hover:bg-surface-hover transition-colors">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">
            {t("challenges.sectionTitle")}
          </span>
          {completedCount > 0 && (
            <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded-full font-medium">
              {completedCount}/{progress.length}
            </span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="p-3 space-y-2.5 border-t border-border/20">
        <AnimatePresence initial={false}>
          {progress.map((item, index) => (
            <ChallengeCard key={item.challenge.id} item={item} index={index} />
          ))}
        </AnimatePresence>
      </div>
    </details>
  );
});
