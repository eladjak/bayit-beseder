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
  color: string;
  delay: number;
}

function SummaryCard({
  icon,
  label,
  numericValue,
  suffix = "",
  subtitle,
  color,
  delay,
}: SummaryCardProps) {
  return (
    <motion.div
      className="card-elevated p-3.5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
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
      <p className="text-[10px] text-muted mt-0.5">{subtitle}</p>
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
        icon={<CheckCircle2 className="w-4 h-4" style={{ color: "#22C55E" }} />}
        label="הושלמו השבוע"
        numericValue={completedThisWeek}
        subtitle={
          completedThisWeek === 0
            ? "עדיין לא התחלתם"
            : completedThisWeek === 1
              ? "משימה אחת"
              : `${completedThisWeek} משימות`
        }
        color="#22C55E"
        delay={0}
      />
      <SummaryCard
        icon={<Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />}
        label="ממתינות"
        numericValue={upcomingCount}
        subtitle="7 ימים הבאים"
        color="#F59E0B"
        delay={0.05}
      />
      <SummaryCard
        icon={<Flame className="w-4 h-4" style={{ color: "#EF4444" }} />}
        label="רצף"
        numericValue={streak}
        subtitle={
          streak === 0
            ? "התחילו היום!"
            : streak === 1
              ? "יום אחד"
              : `${streak} ימים ברצף`
        }
        color="#EF4444"
        delay={0.1}
      />
      <SummaryCard
        icon={<TrendingUp className="w-4 h-4" style={{ color: "#4F46E5" }} />}
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
        color="#4F46E5"
        delay={0.15}
      />
    </div>
  );
}
