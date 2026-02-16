"use client";

import { motion } from "framer-motion";

interface StreakDisplayProps {
  count: number;
  bestCount: number;
}

export function StreakDisplay({ count, bestCount }: StreakDisplayProps) {
  const fireSize = Math.min(count * 4 + 20, 48);

  return (
    <div className="bg-surface rounded-2xl p-4 flex items-center gap-4">
      <motion.span
        className="block"
        style={{ fontSize: fireSize }}
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        🔥
      </motion.span>
      <div className="flex-1">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">{count}</span>
          <span className="text-sm text-muted">ימים ברצף</span>
        </div>
        <p className="text-xs text-muted">שיא: {bestCount} ימים</p>
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
}
