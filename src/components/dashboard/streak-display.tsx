"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

function useCountUp(target: number, duration = 500): number {
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
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);
  return display;
}

interface StreakDisplayProps {
  count: number;
  bestCount: number;
}

export const StreakDisplay = memo(function StreakDisplay({ count, bestCount }: StreakDisplayProps) {
  const { t } = useTranslation();
  const fireSize = Math.min(count * 4 + 20, 48);
  const animatedCount = useCountUp(count);
  const animatedBest = useCountUp(bestCount);

  return (
    <div className="card-elevated p-4 flex items-center gap-4 relative overflow-hidden">
      {/* Subtle warm gradient accent on the right edge */}
      <div className="absolute right-0 top-0 bottom-0 w-1 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-500" />

      <motion.span
        className="block"
        style={{ fontSize: fireSize }}
        animate={{
          scale: [1, 1.15, 0.95, 1.1, 1],
          rotate: [0, -3, 3, -2, 0],
          y: [0, -2, 0, -1, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.25, 0.5, 0.75, 1],
        }}
      >
        🔥
      </motion.span>
      <div className="flex-1">
        <div className="flex items-baseline gap-1">
          <motion.span
            className="text-2xl font-bold text-foreground"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {animatedCount}
          </motion.span>
          <span className="text-sm text-muted">{t("dashboard.streak")}</span>
        </div>
        <p className="text-xs text-muted">{t("dashboard.bestStreak")}: {animatedBest} {t("dashboard.days")}</p>
      </div>
      {count >= 7 && (
        <motion.span
          className="text-xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
        >
          ⭐
        </motion.span>
      )}
    </div>
  );
});
