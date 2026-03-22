"use client";

import { motion } from "framer-motion";

interface PesachCountdownBannerProps {
  daysUntilHoliday: number;
  progress: { completed: number; total: number };
  onTap: () => void;
}

export function PesachCountdownBanner({
  daysUntilHoliday,
  progress,
  onTap,
}: PesachCountdownBannerProps) {
  const progressPct = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={onTap}
      className="w-full rounded-2xl p-4 text-white text-right relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
      }}
    >
      {/* Decorative matzah pattern */}
      <div className="absolute top-1 left-2 text-4xl opacity-20 rotate-12">🫓</div>
      <div className="absolute bottom-1 right-2 text-3xl opacity-15 -rotate-12">🍷</div>

      <div className="relative z-10 flex items-center gap-3">
        {/* Countdown circle */}
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="4"
            />
            {progress.total > 0 && (
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(progressPct / 100) * 150.8} 150.8`}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold leading-none">{daysUntilHoliday}</span>
            <span className="text-[9px] opacity-80">ימים</span>
          </div>
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">🫓 הכנות לפסח</div>
          {progress.total > 0 ? (
            <div className="text-xs opacity-90 mt-0.5">
              {progress.completed}/{progress.total} משימות הושלמו ({progressPct}%)
            </div>
          ) : (
            <div className="text-xs opacity-90 mt-0.5">
              לחצו להפעלת מצב פסח
            </div>
          )}
        </div>

        {/* Arrow indicator */}
        <div className="text-white/60 text-lg">←</div>
      </div>

      {/* Progress bar */}
      {progress.total > 0 && (
        <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden relative z-10">
          <motion.div
            className="h-full bg-white/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      )}
    </motion.button>
  );
}
