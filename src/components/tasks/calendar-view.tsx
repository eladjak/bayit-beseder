"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useCalendarData } from "@/hooks/useCalendarData";
import { useTranslation } from "@/hooks/useTranslation";

const HEBREW_MONTH_NAMES = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const HEBREW_DAY_HEADERS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

const STATUS_COLOR: Record<string, string> = {
  full: "bg-green-500",
  partial: "bg-amber-400",
  none: "",
};

export const CalendarView = memo(function CalendarView() {
  const { t } = useTranslation();
  const {
    days,
    currentMonth,
    goToPrev,
    goToNext,
    selectedDay,
    setSelectedDay,
    dayTasks,
    isLoading,
  } = useCalendarData();

  const monthLabel = `${HEBREW_MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToNext}
          className="p-2 rounded-xl hover:bg-surface active:scale-90 transition-all"
          aria-label={t("calendar.nextMonth")}
        >
          <ChevronRight className="w-5 h-5 text-muted" />
        </button>

        <h2 className="text-base font-bold text-foreground" aria-live="polite">
          {monthLabel}
        </h2>

        <button
          onClick={goToPrev}
          className="p-2 rounded-xl hover:bg-surface active:scale-90 transition-all"
          aria-label={t("calendar.prevMonth")}
        >
          <ChevronLeft className="w-5 h-5 text-muted" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5" role="row">
        {HEBREW_DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-semibold text-muted py-1"
            role="columnheader"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-1" aria-busy="true">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg bg-surface animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-0.5" role="grid" aria-label={t("calendar.title")}>
          {days.map((day) => {
            const isSelected = selectedDay === day.date;
            const dotColor = STATUS_COLOR[day.status];

            return (
              <motion.button
                key={day.date}
                onClick={() =>
                  day.isCurrentMonth
                    ? setSelectedDay(isSelected ? null : day.date)
                    : undefined
                }
                disabled={!day.isCurrentMonth}
                whileTap={day.isCurrentMonth ? { scale: 0.85 } : undefined}
                className={`relative flex flex-col items-center justify-center h-10 rounded-lg text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  !day.isCurrentMonth
                    ? "text-muted/25 cursor-default"
                    : day.isToday
                      ? "bg-primary text-white font-bold ring-2 ring-primary ring-offset-1"
                      : isSelected
                        ? "bg-primary/15 text-primary font-semibold"
                        : "text-foreground hover:bg-surface"
                }`}
                aria-pressed={isSelected ? true : undefined}
                aria-label={
                  day.isCurrentMonth
                    ? `${day.dayOfMonth} ${monthLabel}${day.completionCount > 0 ? `, ${day.completionCount} ${t("calendar.completions")}` : ""}`
                    : undefined
                }
                aria-disabled={!day.isCurrentMonth}
                role="gridcell"
              >
                <span>{day.dayOfMonth}</span>

                {/* Status dot */}
                {day.isCurrentMonth && dotColor && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      day.isToday ? "bg-white/80" : dotColor
                    }`}
                    aria-hidden="true"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
          {t("calendar.allDone")}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
          {t("calendar.partial")}
        </span>
      </div>

      {/* Selected day tasks */}
      <AnimatePresence mode="wait">
        {selectedDay && (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface rounded-2xl p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                {new Date(selectedDay).toLocaleDateString("he-IL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>

              {dayTasks.length === 0 ? (
                <p className="text-xs text-muted py-2 text-center">
                  {t("calendar.noTasksDay")}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {dayTasks.map((task, i) => {
                    const time = new Date(task.completedAt).toLocaleTimeString(
                      "he-IL",
                      { hour: "2-digit", minute: "2-digit" }
                    );
                    return (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span className="flex-1 text-foreground">{task.title}</span>
                        <span className="text-[10px] text-muted">{time}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
