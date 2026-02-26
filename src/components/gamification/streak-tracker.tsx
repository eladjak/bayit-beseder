"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";
import { computeConsecutiveStreak } from "@/hooks/useNotifications";
import { AnimatedNumber } from "@/components/animated-number";

interface StreakTrackerProps {
  /** Array of ISO date strings when tasks were completed */
  completionDates: string[];
  /** Today's date as ISO string (YYYY-MM-DD) */
  today: string;
  /** Best streak ever */
  bestStreak: number;
}

const MILESTONES = [3, 7, 14, 21, 30, 60, 90];

function getStreakMessage(streak: number): string {
  if (streak === 0) return "התחילו היום!";
  if (streak === 1) return "יום ראשון - התחלה מצוינת!";
  if (streak < 3) return "ממשיכים!";
  if (streak < 7) return "שלושה ימים+! כל הכבוד";
  if (streak < 14) return "שבוע שלם! מדהים";
  if (streak < 30) return "שבועיים+! אלופים";
  return "חודש ומעלה! אגדיים";
}

function getNextMilestone(streak: number): number | null {
  for (const m of MILESTONES) {
    if (streak < m) return m;
  }
  return null;
}

export function StreakTracker({
  completionDates,
  today,
  bestStreak,
}: StreakTrackerProps) {
  const currentStreak = useMemo(
    () => computeConsecutiveStreak(completionDates, today),
    [completionDates, today]
  );

  const nextMilestone = getNextMilestone(currentStreak);
  const message = getStreakMessage(currentStreak);
  const isNewBest = currentStreak > 0 && currentStreak >= bestStreak;

  // Progress to next milestone (0-100)
  const prevMilestone = MILESTONES.findLast((m) => m <= currentStreak) ?? 0;
  const milestoneProgress =
    nextMilestone !== null
      ? Math.round(
          ((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) *
            100
        )
      : 100;

  return (
    <div className="card-elevated rounded-2xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.span
            className="text-2xl"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, -3, 3, 0],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {currentStreak >= 7 ? "🔥" : currentStreak > 0 ? "🕯️" : "💤"}
          </motion.span>
          <div>
            <div className="flex items-baseline gap-1.5">
              <AnimatedNumber
                value={currentStreak}
                className="text-2xl font-bold text-foreground"
              />
              <span className="text-sm text-muted">ימים ברצף</span>
            </div>
            <p className="text-xs text-muted">{message}</p>
          </div>
        </div>

        {/* Best streak badge */}
        <div className="flex items-center gap-1 text-xs text-muted bg-surface-hover rounded-lg px-2 py-1">
          <Trophy className="w-3.5 h-3.5" />
          <span>שיא: {bestStreak}</span>
          {isNewBest && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-warning text-xs"
            >
              🏆
            </motion.span>
          )}
        </div>
      </div>

      {/* Milestone progress bar */}
      {nextMilestone !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted">
            <span>יעד הבא: {nextMilestone} ימים</span>
            <span>
              {currentStreak}/{nextMilestone}
            </span>
          </div>
          <div className="h-2 bg-border/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #EF4444, #F59E0B, #22C55E)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${milestoneProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Last 7 days mini streak visualization */}
      <div className="flex items-center gap-1 justify-center pt-1">
        {Array.from({ length: 7 }).map((_, i) => {
          const dayOffset = 6 - i;
          const d = new Date(today);
          d.setDate(d.getDate() - dayOffset);
          const dateStr = d.toISOString().slice(0, 10);
          const hasActivity = completionDates.some(
            (cd) => cd.slice(0, 10) === dateStr
          );

          return (
            <div key={dateStr} className="flex flex-col items-center gap-0.5">
              <motion.div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                  hasActivity
                    ? "bg-success/20 text-success"
                    : dateStr === today
                      ? "bg-border/30 text-muted"
                      : "bg-border/20 text-muted/40"
                }`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                {hasActivity ? (
                  <Flame className="w-3 h-3" />
                ) : (
                  <span>{d.getDate()}</span>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
