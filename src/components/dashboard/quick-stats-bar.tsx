"use client";

import { useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

// ─────────────────────────────────────────────
// Animated number counter (rAF-based, no library)
// ─────────────────────────────────────────────
function useCountUp(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    if (from === target) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = target;
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return display;
}

// ─────────────────────────────────────────────
// Circular progress ring (SVG, stroke-dashoffset)
// ─────────────────────────────────────────────
interface ProgressRingProps {
  done: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

function ProgressRing({ done, total, size = 32, strokeWidth = 3 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(done / total, 1) : 0;
  const offset = circumference * (1 - progress);
  const active = progress > 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      // Flip so arc starts at the top (12 o'clock)
      style={{ transform: "rotate(-90deg)" }}
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-border"
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={
          active
            ? "stroke-primary transition-[stroke-dashoffset] duration-500"
            : "stroke-muted/40 transition-[stroke-dashoffset] duration-500"
        }
      />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
export interface QuickStatsBarProps {
  tasksCompleted: number;
  tasksTotal: number;
  streakDays: number;
  totalPoints: number;
  /** 1-based rank; 0 means no ranking available */
  rank: number;
}

// ─────────────────────────────────────────────
// Card wrapper
// ─────────────────────────────────────────────
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.2, ease: "easeOut" },
  }),
};

// ─────────────────────────────────────────────
// QuickStatsBar
// ─────────────────────────────────────────────
export function QuickStatsBar({
  tasksCompleted,
  tasksTotal,
  streakDays,
  totalPoints,
  rank,
}: QuickStatsBarProps) {
  const { t } = useTranslation();
  const animatedPoints = useCountUp(totalPoints);

  const streakActive = streakDays > 0;
  const rankIcon = rank === 1 ? "🏆" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🎖️";

  return (
    <div className="grid grid-cols-4 gap-2" dir="rtl">
      {/* ── Card 1 — Tasks Today ── */}
      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="bg-surface border border-border rounded-xl p-2.5 text-center flex flex-col items-center gap-1"
      >
        <ProgressRing done={tasksCompleted} total={tasksTotal} size={32} strokeWidth={3} />
        <span
          className={`text-[10px] font-semibold leading-none ${
            tasksCompleted > 0 ? "text-primary" : "text-muted"
          }`}
        >
          {tasksCompleted}/{tasksTotal}
        </span>
        <span className="text-[9px] text-muted leading-none">
          {t("quickStats.tasks")}
        </span>
      </motion.div>

      {/* ── Card 2 — Streak ── */}
      <motion.div
        custom={1}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className={`bg-surface border border-border rounded-xl p-2.5 text-center flex flex-col items-center gap-0.5 relative overflow-hidden ${
          streakActive ? "border-amber-300 dark:border-amber-600" : ""
        }`}
      >
        {/* Pulsing glow when active */}
        {streakActive && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-amber-400/10"
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <motion.span
          className="text-base leading-none relative z-10"
          animate={streakActive ? { scale: [1, 1.12, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          🔥
        </motion.span>
        <span
          className={`text-xs font-bold leading-none relative z-10 ${
            streakActive ? "text-amber-500 dark:text-amber-400" : "text-muted"
          }`}
        >
          {streakDays}
        </span>
        <span className="text-[9px] text-muted leading-none relative z-10">
          {t("quickStats.streakLabel")}
        </span>
      </motion.div>

      {/* ── Card 3 — Points ── */}
      <motion.div
        custom={2}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="bg-surface border border-border rounded-xl p-2.5 text-center flex flex-col items-center gap-0.5 relative overflow-hidden"
      >
        {/* Purple gradient overlay */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-purple-500/5 to-purple-500/10" />
        <span className="text-base leading-none relative z-10">⭐</span>
        <span className="text-xs font-bold leading-none text-purple-600 dark:text-purple-400 relative z-10">
          {animatedPoints}
        </span>
        <span className="text-[9px] text-muted leading-none relative z-10">
          {t("quickStats.pts")}
        </span>
      </motion.div>

      {/* ── Card 4 — Rank ── */}
      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className={`bg-surface border border-border rounded-xl p-2.5 text-center flex flex-col items-center gap-0.5 relative overflow-hidden ${
          rank === 1 ? "border-yellow-300 dark:border-yellow-600" : ""
        }`}
      >
        {/* Crown shimmer for #1 */}
        {rank === 1 && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-br from-yellow-300/20 via-transparent to-yellow-500/10"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <motion.span
          className="text-base leading-none relative z-10"
          animate={
            rank === 1
              ? {
                  rotate: [-3, 3, -3],
                  y: [0, -1, 0],
                }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {rank > 0 ? rankIcon : "—"}
        </motion.span>
        <span
          className={`text-xs font-bold leading-none relative z-10 ${
            rank === 1
              ? "text-yellow-600 dark:text-yellow-400"
              : rank > 0
              ? "text-foreground"
              : "text-muted"
          }`}
        >
          {rank > 0 ? `#${rank}` : "—"}
        </span>
        <span className="text-[9px] text-muted leading-none relative z-10">
          {t("quickStats.rankLabel")}
        </span>
      </motion.div>
    </div>
  );
}
