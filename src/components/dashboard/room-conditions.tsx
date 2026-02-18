"use client";

import { motion } from "framer-motion";
import { Home } from "lucide-react";
import { getHealthColor, getHealthLabel } from "@/lib/room-health";

interface CategoryHealth {
  category: string;
  label: string;
  icon: string;
  color: string;
  health: number;
}

interface RoomConditionsProps {
  categoryHealthData: CategoryHealth[];
  onCategoryClick?: (category: string) => void;
}

export function RoomConditions({
  categoryHealthData,
  onCategoryClick,
}: RoomConditionsProps) {
  const sorted = [...categoryHealthData].sort((a, b) => a.health - b.health);

  return (
    <motion.div
      className="bg-surface rounded-2xl p-4 space-y-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-foreground">
            {"\u05DE\u05E6\u05D1 \u05D4\u05D7\u05D3\u05E8\u05D9\u05DD"}
          </span>
        </div>
        <p className="text-[10px] text-muted mt-0.5 mr-7">
          {"\u05D1\u05D4\u05EA\u05D1\u05E1\u05E1 \u05E2\u05DC \u05DE\u05E9\u05D9\u05DE\u05D5\u05EA \u05E9\u05D4\u05D5\u05E9\u05DC\u05DE\u05D5"}
        </p>
      </div>

      {/* Room rows */}
      <div className="space-y-2">
        {sorted.map((item, index) => {
          const barColor = getHealthColor(item.health);
          const label = getHealthLabel(item.health);

          return (
            <button
              key={item.category}
              type="button"
              className="w-full text-right"
              onClick={() => onCategoryClick?.(item.category)}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <span className="text-lg w-7 text-center shrink-0">
                  {item.icon}
                </span>

                {/* Label + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground truncate">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: barColor }}
                      >
                        {label}
                      </span>
                      <span className="text-[10px] text-muted tabular-nums">
                        {item.health}%
                      </span>
                    </div>
                  </div>

                  {/* Health bar */}
                  <div className="h-2 bg-border/30 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: barColor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.health}%` }}
                      transition={{
                        duration: 0.6,
                        delay: index * 0.05,
                        ease: "easeOut",
                      }}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <p className="text-xs text-muted text-center py-2">
          {"\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DC\u05D4\u05E6\u05D2\u05D4"}
        </p>
      )}
    </motion.div>
  );
}
