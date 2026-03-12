"use client";

import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import type { ClientCalendarEvent } from "@/lib/types/calendar";

interface CalendarEventItemProps {
  event: ClientCalendarEvent;
  index?: number;
}

function formatEventTime(event: ClientCalendarEvent): string {
  if (event.isAllDay) return "כל היום";

  try {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const fmt = (d: Date) =>
      d.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jerusalem",
      });
    return `${fmt(start)} - ${fmt(end)}`;
  } catch {
    return "";
  }
}

export function CalendarEventItem({ event, index = 0 }: CalendarEventItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      className="flex items-start gap-2.5 rounded-lg border-r-[3px] border-blue-400 bg-blue-50/60 px-3 py-2 dark:border-blue-500 dark:bg-blue-950/30"
    >
      <Calendar className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-blue-900 dark:text-blue-100">
          {event.summary}
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          {formatEventTime(event)}
        </p>
      </div>
    </motion.div>
  );
}
