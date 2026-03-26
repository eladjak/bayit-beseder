"use client";

import { useMemo, memo } from "react";
import { motion } from "framer-motion";
import { Target, PartyPopper } from "lucide-react";
import { computeWeeklyChallengeProgress } from "@/hooks/useNotifications";
import { AnimatedNumber } from "@/components/animated-number";
import { useTranslation } from "@/hooks/useTranslation";

interface WeeklyChallengeProps {
  /** Array of ISO date strings when tasks were completed */
  completionDates: string[];
  /** Today's date as ISO string (YYYY-MM-DD) */
  today: string;
  /** Weekly target number of completions */
  target?: number;
}

function getChallengeMessageKey(percentage: number): string {
  if (percentage === 0) return "gamification.challengeStart";
  if (percentage < 25) return "gamification.challengeGoodStart";
  if (percentage < 50) return "gamification.challengeKeepGoing";
  if (percentage < 75) return "gamification.challengeAlmostThere";
  if (percentage < 100) return "gamification.challengeAlmostDone";
  return "gamification.challengeCompleted";
}

export const WeeklyChallenge = memo(function WeeklyChallenge({
  completionDates,
  today,
  target = 5,
}: WeeklyChallengeProps) {
  const { t } = useTranslation();
  const progress = useMemo(
    () => computeWeeklyChallengeProgress(completionDates, today, target),
    [completionDates, today, target]
  );

  const isCompleted = progress.completed >= progress.target;
  const message = t(getChallengeMessageKey(progress.percentage));

  // Calculate days remaining in the week
  const dayOfWeek = new Date(today).getDay(); // 0=Sun
  const daysRemaining = 6 - dayOfWeek;

  return (
    <motion.div
      className={`rounded-2xl p-4 space-y-3 ${
        isCompleted
          ? "bg-success/10 border border-success/20"
          : "card-elevated"
      }`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <motion.div
              initial={{ rotate: -20 }}
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <PartyPopper className="w-5 h-5 text-success" />
            </motion.div>
          ) : (
            <Target className="w-5 h-5 text-primary" />
          )}
          <span className="text-sm font-bold text-foreground">
            {t("dashboard.weeklyChallenge")}
          </span>
        </div>
        <span className="text-[10px] text-muted px-2 py-0.5 bg-surface-hover rounded-full">
          {daysRemaining === 0
            ? t("gamification.lastDay")
            : `${daysRemaining} ${t("gamification.daysRemaining")}`}
        </span>
      </div>

      {/* Challenge description */}
      <p className="text-xs text-muted">
        {t("gamification.challengeGoalPrefix")}{target}{t("gamification.challengeGoalSuffix")}
      </p>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <AnimatedNumber
              value={progress.completed}
              className={`text-xl font-bold ${
                isCompleted ? "text-success" : "text-foreground"
              }`}
            />
            <span className="text-xs text-muted">/ {progress.target}</span>
          </div>
          <span className="text-xs text-muted">{message}</span>
        </div>
        <div className="h-3 bg-border/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              backgroundColor: isCompleted ? "#22C55E" : "#4F46E5",
              transformOrigin: "right",
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress.percentage / 100 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Completed celebration */}
      {isCompleted && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-success font-medium text-center"
        >
          {t("gamification.challengeFinished")}
        </motion.p>
      )}
    </motion.div>
  );
});
