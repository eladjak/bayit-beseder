"use client";

import { motion } from "framer-motion";
import type { HeatmapDay } from "@/hooks/useAdvancedStats";

interface ActivityHeatmapProps {
  data: HeatmapDay[];
}

const INTENSITY_CLASSES = [
  "bg-border/30",       // 0 – no activity
  "bg-indigo-200 dark:bg-indigo-900/60",  // 1 – light
  "bg-indigo-400 dark:bg-indigo-700",     // 2 – medium
  "bg-indigo-500 dark:bg-indigo-500",     // 3 – high
  "bg-indigo-700 dark:bg-indigo-400",     // 4 – very high
];

const HEBREW_DAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // data is 28 days (4 weeks × 7 days), oldest first
  // Group into rows of 7
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  return (
    <div dir="rtl">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {HEBREW_DAYS.map((d) => (
          <div key={d} className="text-center text-[9px] text-muted font-medium">
            {d}
          </div>
        ))}
      </div>
      {/* Weeks */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              const date = new Date(day.date);
              const dayNum = date.getDate();
              const month = date.getMonth() + 1;

              return (
                <motion.div
                  key={day.date}
                  className={`h-7 rounded-md flex items-center justify-center text-[8px] font-medium cursor-default
                    ${INTENSITY_CLASSES[day.intensity]}
                    ${day.intensity > 0 ? "text-white" : "text-muted"}
                  `}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (wi * 7 + di) * 0.012, duration: 0.2 }}
                  title={`${dayNum}/${month} — ${day.count} משימות`}
                >
                  {dayNum}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1 mt-2 justify-end" dir="rtl">
        <span className="text-[9px] text-muted ml-1">פחות</span>
        {INTENSITY_CLASSES.map((cls, i) => (
          <div key={i} className={`w-3.5 h-3.5 rounded-sm ${cls}`} />
        ))}
        <span className="text-[9px] text-muted mr-1">יותר</span>
      </div>
    </div>
  );
}
