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
        {/* Outer glow when target hit */}
        {hitTarget && (
          <div
            className="absolute inset-0 rounded-full glow-pulse"
            style={{ filter: "blur(0px)" }}
          />
        )}
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
            opacity={0.5}
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
            style={{ stroke: "var(--color-muted)", opacity: 0.4 }}
          />
          {/* Glow pulse when target hit */}
          {hitTarget && (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth + 6}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              opacity={0}
              animate={{ opacity: [0, 0.25, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ filter: "blur(6px)" }}
            />
          )}
          {/* Progress arc - gradient when high progress */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={progress >= 70 ? "url(#ring-gradient)" : color}
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
          {hitTarget ? (
            <motion.span
              className="text-sm font-semibold gradient-text"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              בית בסדר!
            </motion.span>
          ) : (
            <span className="text-xs text-muted">כלל הזהב</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="px-2 py-0.5 bg-primary/8 rounded-full">יעד: {target}%</span>
      </div>
    </div>
  );
}
