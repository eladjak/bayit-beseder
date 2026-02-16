"use client";

import { motion } from "framer-motion";

interface GoldenRuleRingProps {
  percentage: number;
  target?: number;
}

function getColor(pct: number): string {
  if (pct < 40) return "var(--color-golden-low)";
  if (pct < 70) return "var(--color-golden-mid)";
  return "var(--color-golden-high)";
}

export function GoldenRuleRing({
  percentage,
  target = 80,
}: GoldenRuleRingProps) {
  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(percentage, 100);
  const offset = circumference - (progress / 100) * circumference;
  const targetOffset = circumference - (target / 100) * circumference;
  const color = getColor(progress);
  const hitTarget = progress >= target;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
          />
          {/* Target marker */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="none"
            strokeWidth={strokeWidth}
            strokeDasharray={`2 ${circumference - 2}`}
            strokeDashoffset={targetOffset}
            strokeLinecap="round"
            style={{ stroke: "var(--color-muted)", opacity: 0.5 }}
          />
          {/* Progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-bold"
            style={{ color }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Math.round(progress)}%
          </motion.span>
          {hitTarget && (
            <motion.span
              className="text-sm font-medium text-success"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              בית בסדר!
            </motion.span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted">
        <span>יעד: {target}%</span>
        <span>•</span>
        <span>כלל הזהב</span>
      </div>
    </div>
  );
}
