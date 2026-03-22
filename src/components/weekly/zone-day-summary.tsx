"use client";

import type { CategoryKey } from "@/lib/categories";

interface ZoneDaySummaryProps {
  summary: Array<{
    dayIndex: number;
    dayName: string;
    zones: Array<{ zone: CategoryKey; icon: string; label: string }>;
  }>;
  /** Currently selected day index for highlighting */
  activeDayIndex?: number;
}

const SHORT_DAY_NAMES = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export function ZoneDaySummary({ summary, activeDayIndex }: ZoneDaySummaryProps) {
  // Only show Sun-Thu (0-4) since Friday is light and Shabbat is empty
  const activeDays = summary.filter(
    (d) => d.dayIndex <= 4 && d.zones.length > 0
  );

  if (activeDays.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1">
      {activeDays.map((day) => (
        <div
          key={day.dayIndex}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            activeDayIndex === day.dayIndex
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-surface-hover text-muted"
          }`}
        >
          <span className="font-bold">{SHORT_DAY_NAMES[day.dayIndex]}</span>
          <span className="flex gap-0.5">
            {day.zones.map((z) => (
              <span key={z.zone} title={z.label}>
                {z.icon}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
