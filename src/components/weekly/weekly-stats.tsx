"use client";

import { TrendingUp, Clock, Users, Calendar } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { DayLoad, DayLoadWithCalendar } from "@/lib/smart-scheduler";
import type { ClientCalendarEvent } from "@/lib/types/calendar";

interface WeeklyStatsProps {
  stats: {
    total: number;
    completed: number;
    completionRate: number;
    myTasks: number;
    partnerTasks: number;
    fairnessRatio: number;
  };
  dailyLoads: (DayLoad | DayLoadWithCalendar)[];
  calendarConnected: boolean;
  calendarEvents: ClientCalendarEvent[];
  partnerName?: string;
}

export function WeeklyStats({
  stats,
  dailyLoads,
  calendarConnected,
  calendarEvents,
  partnerName,
}: WeeklyStatsProps) {
  const { t } = useTranslation();

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">{t("weekly.weekSummary")}</h3>
      </div>

      <div className="space-y-3">
        {/* Fairness ratio */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted" />
            <span className="text-sm text-foreground">{t("weekly.taskBalance")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-foreground">
              {Math.round(stats.fairnessRatio * 100)}%
            </div>
            <div className="w-24 h-2 bg-border/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                style={{ width: `${stats.fairnessRatio * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Time distribution */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted" />
            <span className="text-sm text-foreground">{t("weekly.taskTime")}</span>
          </div>
          <div className="text-sm font-medium text-foreground">
            {dailyLoads.reduce((sum, d) => sum + d.totalMinutes, 0)} {t("weekly.minutes")}
          </div>
        </div>

        {/* Calendar busyness */}
        {calendarConnected && calendarEvents.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-foreground">{t("weekly.calendarMeetings")}</span>
            </div>
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {calendarEvents.length} {t("weekly.calendarEventsLabel")}
            </div>
          </div>
        )}

        {/* Completion rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted" />
            <span className="text-sm text-foreground">{t("weekly.completionRateLabel")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {stats.completionRate}%
            </span>
            <div className="text-xs text-muted">
              ({stats.completed}/{stats.total})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
