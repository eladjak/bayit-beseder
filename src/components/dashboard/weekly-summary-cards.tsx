"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Flame, TrendingUp } from "lucide-react";
import {
  countCompletedThisWeek,
  countUpcomingTasks,
  computeCompletionRate,
} from "@/lib/task-stats";
import { AnimatedNumber } from "@/components/animated-number";
import type { TaskRow, TaskCompletionRow } from "@/lib/types/database";

interface WeeklySummaryCardsProps {
  tasks: TaskRow[];
  completions: TaskCompletionRow[];
  streak: number;
  today: string;
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  numericValue: number;
  suffix?: string;
  subtitle: string;
  colorClass: string;
  delay: number;
}

function SummaryCard({
  icon,
  label,
  numericValue,
  suffix = "",
  subtitle,
  colorClass,
  delay,
}: SummaryCardProps) {
  return (
    <motion.div
      className="card-elevated p-4 hover:shadow-md transition-shadow duration-150"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorClass}`}
        >
          {icon}
        </div>
        <span className="text-[11px] text-muted font-medium">{label}</span>
      </div>
      <AnimatedNumber
        value={numericValue}
        suffix={suffix}
        className="text-xl font-bold text-foreground"
      />
      <p className="text-xs text-muted mt-0.5">{subtitle}</p>
    </motion.div>
  );
}

export function WeeklySummaryCards({
  tasks,
  completions,
  streak,
  today,
}: WeeklySummaryCardsProps) {
  const completedThisWeek = useMemo(
    () => countCompletedThisWeek(completions, today),
    [completions, today]
  );

  const upcomingCount = useMemo(
    () => countUpcomingTasks(tasks, today),
    [tasks, today]
  );

  const completionRate = useMemo(
    () => computeCompletionRate(tasks),
    [tasks]
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      <SummaryCard
        icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
        label="הושלמו השבוע"
        numericValue={completedThisWeek}
        subtitle={
          completedThisWeek === 0
            ? "עדיין לא התחלתם"
            : completedThisWeek === 1
              ? "משימה אחת"
              : `${completedThisWeek} משימות`
        }
        colorClass="bg-green-500/10"
        delay={0}
      />
      <SummaryCard
        icon={<Clock className="w-4 h-4 text-amber-500" />}
        label="ממתינות"
        numericValue={upcomingCount}
        subtitle="7 ימים הבאים"
        colorClass="bg-amber-500/10"
        delay={0.05}
      />
      <SummaryCard
        icon={<Flame className="w-4 h-4 text-red-500" />}
        label="רצף"
        numericValue={streak}
        subtitle={
          streak === 0
            ? "התחילו היום!"
            : streak === 1
              ? "יום אחד"
              : `${streak} ימים ברצף`
        }
        colorClass="bg-red-500/10"
        delay={0.1}
      />
      <SummaryCard
        icon={<TrendingUp className="w-4 h-4 text-primary" />}
        label="אחוז השלמה"
        numericValue={completionRate}
        suffix="%"
        subtitle={
          completionRate >= 80
            ? "מצוין!"
            : completionRate >= 50
              ? "בכיוון הנכון"
              : "יש מקום לשיפור"
        }
        colorClass="bg-primary/10"
        delay={0.15}
      />
    </div>
  );
}
