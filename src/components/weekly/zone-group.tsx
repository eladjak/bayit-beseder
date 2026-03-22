"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ZoneGroup as ZoneGroupType } from "@/lib/zones";

interface ZoneGroupProps {
  zone: ZoneGroupType;
  children: React.ReactNode;
}

export function ZoneGroupCard({ zone, children }: ZoneGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  const completedCount = zone.tasks.filter((t) => t.completed).length;
  const totalCount = zone.tasks.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  return (
    <div className="overflow-hidden rounded-xl border border-border/50">
      {/* Zone header */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="w-full flex items-center gap-2.5 px-3 py-2 bg-surface/50 hover:bg-surface-hover transition-colors"
        aria-expanded={!collapsed}
        aria-label={`${zone.label} - ${totalCount} משימות`}
      >
        {/* Color bar */}
        <div
          className="w-1 h-8 rounded-full flex-shrink-0"
          style={{ backgroundColor: zone.color }}
        />

        {/* Icon + label */}
        <span className="text-base flex-shrink-0">{zone.icon}</span>
        <span className="text-sm font-semibold text-foreground flex-1 text-right">
          {zone.label}
        </span>

        {/* Minutes + progress */}
        <span className="text-[10px] text-muted font-medium">
          {zone.totalMinutes} דק׳
        </span>

        {/* Progress badge */}
        {totalCount > 0 && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              allDone
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-surface-hover text-muted"
            }`}
          >
            {completedCount}/{totalCount}
          </span>
        )}

        {/* Chevron */}
        <span className="text-muted">
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {/* Tasks inside */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "tween", duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
