"use client";

import { useState, useMemo } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { buildCalendarMonth } from "@/lib/task-stats";
import type { CalendarDay } from "@/lib/task-stats";
import type { TaskRow, TaskCompletionRow } from "@/lib/types/database";

const HEBREW_MONTH_NAMES = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

const HEBREW_DAY_HEADERS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

interface MonthlyCalendarProps {
  tasks: TaskRow[];
  completions: TaskCompletionRow[];
  today: string;
}

function DayCell({ day }: { day: CalendarDay }) {
  const hasCompletions = day.completedCount > 0;
  const hasDue = day.dueCount > 0;

  return (
    <div
      className={`relative flex flex-col items-center justify-center h-10 rounded-lg text-xs transition-colors ${
        !day.isCurrentMonth
          ? "text-muted/40"
          : day.isToday
            ? "bg-primary text-white font-bold"
            : "text-foreground"
      }`}
      title={
        day.isCurrentMonth
          ? `${day.dayOfMonth}: ${day.dueCount} משימות, ${day.completedCount} הושלמו`
          : undefined
      }
    >
      <span>{day.dayOfMonth}</span>
      {/* Dots row below the number */}
      {day.isCurrentMonth && (hasDue || hasCompletions) && (
        <div className="flex gap-0.5 mt-0.5">
          {hasCompletions && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                day.isToday ? "bg-white/80" : "bg-success"
              }`}
            />
          )}
          {hasDue && !hasCompletions && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                day.isToday ? "bg-white/60" : "bg-warning"
              }`}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function MonthlyCalendar({
  tasks,
  completions,
  today,
}: MonthlyCalendarProps) {
  const todayDate = new Date(today);
  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());

  const calendarDays = useMemo(
    () => buildCalendarMonth(year, month, tasks, completions, today),
    [year, month, tasks, completions, today]
  );

  // Count summary for displayed month
  const monthStats = useMemo(() => {
    const monthDays = calendarDays.filter((d) => d.isCurrentMonth);
    const totalDue = monthDays.reduce((sum, d) => sum + d.dueCount, 0);
    const totalCompleted = monthDays.reduce(
      (sum, d) => sum + d.completedCount,
      0
    );
    return { totalDue, totalCompleted };
  }, [calendarDays]);

  const goToPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setYear(todayDate.getFullYear());
    setMonth(todayDate.getMonth());
  };

  const isCurrentMonth =
    year === todayDate.getFullYear() && month === todayDate.getMonth();

  return (
    <div className="bg-surface rounded-2xl p-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToNextMonth}
          className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
          aria-label="חודש הבא"
        >
          <ChevronRight className="w-4 h-4 text-muted" />
        </button>

        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {HEBREW_MONTH_NAMES[month]} {year}
          </h3>
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium"
            >
              היום
            </button>
          )}
        </div>

        <button
          onClick={goToPrevMonth}
          className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
          aria-label="חודש קודם"
        >
          <ChevronLeft className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {HEBREW_DAY_HEADERS.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] font-medium text-muted py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => (
          <DayCell key={day.date} day={day} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-[10px] text-muted">הושלם</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-[10px] text-muted">ממתין</span>
          </div>
        </div>
        <div className="text-[10px] text-muted">
          {monthStats.totalCompleted}/{monthStats.totalDue} משימות
        </div>
      </div>
    </div>
  );
}
