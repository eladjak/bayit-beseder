"use client";

import { useMemo } from "react";
import {
  computeCategoryStats,
  computeMonthlyData,
  countUpcomingTasks,
} from "@/lib/task-stats";
import type {
  CategoryStat,
  MonthlyCompletionPoint,
} from "@/lib/task-stats";
import type { TaskRow, TaskCompletionRow } from "@/lib/types/database";

// Re-export types for consumers
export type { CategoryStat, MonthlyCompletionPoint };

// ============================================
// Bar Chart Component (CSS-only, no library)
// ============================================

interface BarChartProps {
  data: MonthlyCompletionPoint[];
}

function CssBarChart({ data }: BarChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  // Show a label every 5 days to avoid crowding
  const visibleIndices = new Set([0, 4, 9, 14, 19, 24, 29]);

  return (
    <div
      className="flex items-end gap-px h-24 w-full"
      aria-label="גרף השלמה חודשי"
    >
      {data.map((point, i) => {
        const heightPct = Math.round((point.count / maxCount) * 100);
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-0.5"
            title={`יום ${point.day}: ${point.count} משימות`}
          >
            <div
              className="w-full rounded-t-sm bg-primary transition-all duration-300 min-h-px"
              style={{ height: `${heightPct}%` }}
            />
            {visibleIndices.has(i) && (
              <span className="text-[8px] text-muted leading-none mt-0.5">
                {point.day}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Main DashboardStats Component
// ============================================

interface DashboardStatsProps {
  tasks: TaskRow[];
  completions: TaskCompletionRow[];
  /** Map of category_id -> category key (e.g. "kitchen") */
  categoryNameToKey: Record<string, string>;
  today: string;
}

export function DashboardStats({
  tasks,
  completions,
  categoryNameToKey,
  today,
}: DashboardStatsProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const upcomingCount = useMemo(
    () => countUpcomingTasks(tasks, today),
    [tasks, today]
  );

  const categoryStats = useMemo(
    () => computeCategoryStats(tasks, categoryNameToKey),
    [tasks, categoryNameToKey]
  );

  const monthlyData = useMemo(
    () => computeMonthlyData(completions, today),
    [completions, today]
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-elevated rounded-2xl p-4">
          <p className="text-xs text-muted mb-1">סה״כ משימות</p>
          <p className="text-2xl font-bold text-foreground">{totalTasks}</p>
          <div className="flex gap-2 mt-1">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
              {completedTasks} הושלמו
            </span>
            <span className="text-[11px] text-muted">·</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400">
              {pendingTasks} ממתינות
            </span>
          </div>
        </div>

        <div className="card-elevated rounded-2xl p-4">
          <p className="text-xs text-muted mb-1">אחוז השלמה</p>
          <p className="text-2xl font-bold text-primary">{completionRate}%</p>
          <div className="mt-2 bg-border rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div className="bg-surface dark:bg-[#1a1730] rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">משימות קרובות</p>
          <span className="text-xs text-muted">7 ימים הבאים</span>
        </div>
        <p className="text-3xl font-bold text-primary mt-2">{upcomingCount}</p>
        <p className="text-xs text-muted mt-0.5">
          {upcomingCount === 0
            ? "אין משימות ממתינות בשבוע הקרוב"
            : upcomingCount === 1
            ? "משימה ממתינה בשבוע הקרוב"
            : "משימות ממתינות בשבוע הקרוב"}
        </p>
      </div>

      {/* Category Breakdown */}
      {categoryStats.length > 0 && (
        <div className="card-elevated rounded-2xl p-4">
          <p className="text-sm font-semibold text-foreground mb-3">
            לפי קטגוריה
          </p>
          <div className="space-y-2.5">
            {categoryStats.slice(0, 6).map((cat) => {
              const pct =
                cat.total > 0
                  ? Math.round((cat.completed / cat.total) * 100)
                  : 0;
              return (
                <div key={cat.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs text-foreground">
                        {cat.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted">
                      {cat.completed}/{cat.total}
                    </span>
                  </div>
                  <div className="bg-border rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Completion Chart */}
      <div className="bg-surface dark:bg-[#1a1730] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">
            30 יום אחרונים
          </p>
          <span className="text-xs text-muted">
            {completions.length} השלמות
          </span>
        </div>
        <CssBarChart data={monthlyData} />
      </div>
    </div>
  );
}
