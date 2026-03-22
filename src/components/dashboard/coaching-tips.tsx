"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { COACHING_MESSAGES } from "@/lib/coaching-messages";
import type { CoachingTrigger } from "@/lib/coaching-messages";

interface CoachingTipsProps {
  completedCount: number;
  totalCount: number;
}

function pickTrigger(completedCount: number, totalCount: number): CoachingTrigger {
  if (totalCount === 0) return "low_motivation";
  const pct = completedCount / totalCount;
  if (pct >= 1) return "all_daily_done";
  if (pct >= 0.8) return "golden_rule_hit";
  if (completedCount > 0) return "task_complete";
  return "low_motivation";
}

export function CoachingTips({ completedCount, totalCount }: CoachingTipsProps) {
  const tip = useMemo(() => {
    const trigger = pickTrigger(completedCount, totalCount);
    const pool = COACHING_MESSAGES.filter((m) => m.trigger === trigger);
    // Deterministic pick based on day of month so it doesn't flicker on re-render
    const dayIndex = new Date().getDate() % pool.length;
    return pool[dayIndex] ?? pool[0];
  }, [completedCount, totalCount]);

  if (!tip) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100/50 dark:border-indigo-800/30 p-4 shadow-sm"
      dir="rtl"
      aria-label="טיפ יומי"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">{tip.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">
            💡 מה שרק בית בסדר יודע
          </p>
          <p className="text-sm font-medium text-foreground leading-snug">
            {tip.message}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
