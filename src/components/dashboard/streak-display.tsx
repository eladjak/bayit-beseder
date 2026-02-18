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
            {count}
          </motion.span>
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
