"use client";

import { memo } from "react";
import { motion, type Variants, type Transition } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

export interface GamificationRowProps {
  streakDays: number;
  streakTarget: number;
  currentPoints: number;
  nextPrizeThreshold: number;
  nextPrizeName: string;
  nextPrizeEmoji: string;
  challengeTitle: string;
  challengeProgress: number; // 0-100
  challengeActive: boolean;
}

// ---- shared sub-components ----

function MiniProgress({
  value,
  max,
  className = "",
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={`w-full h-1.5 rounded-full bg-white/20 overflow-hidden ${className}`}>
      <motion.div
        className="h-full rounded-full bg-white/80"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: pct / 100 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ originX: 0 }}
      />
    </div>
  );
}

// ---- card animations ----

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.35, ease: "easeOut" } as Transition,
  }),
};

// ---- Card 1: Streak ----

function StreakCard({
  streakDays,
  streakTarget,
  index,
}: {
  streakDays: number;
  streakTarget: number;
  index: number;
}) {
  const { t } = useTranslation();
  const remaining = Math.max(0, streakTarget - streakDays);
  const isActive = streakDays > 0;

  return (
    <motion.div
      className="snap-start min-w-[200px] flex-shrink-0 rounded-2xl p-4 min-h-[120px] flex flex-col justify-between text-white"
      style={{
        background: isActive
          ? "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)"
          : "linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)",
      }}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={cardVariants}
      whileTap={{ scale: 0.97 }}
    >
      <p className="text-xs font-semibold opacity-90">{t("gamification.row.streakHeader")}</p>
      <div className="flex items-baseline gap-1 my-1">
        <span className="text-3xl font-bold leading-none">{streakDays}</span>
        <span className="text-sm opacity-80">{t("gamification.row.streakDays")}</span>
      </div>
      <MiniProgress value={streakDays} max={streakTarget} />
      <p className="text-xs opacity-80 mt-1">
        {t("gamification.row.streakRemaining")
          .replace("{remaining}", String(remaining))
          .replace("{target}", String(streakTarget))}
      </p>
    </motion.div>
  );
}

// ---- Card 2: Prize ----

function PrizeCard({
  currentPoints,
  nextPrizeThreshold,
  nextPrizeName,
  nextPrizeEmoji,
  index,
}: {
  currentPoints: number;
  nextPrizeThreshold: number;
  nextPrizeName: string;
  nextPrizeEmoji: string;
  index: number;
}) {
  const { t } = useTranslation();
  const remaining = Math.max(0, nextPrizeThreshold - currentPoints);

  return (
    <motion.div
      className="snap-start min-w-[200px] flex-shrink-0 rounded-2xl p-4 min-h-[120px] flex flex-col justify-between text-white"
      style={{
        background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
      }}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={cardVariants}
      whileTap={{ scale: 0.97 }}
    >
      <p className="text-xs font-semibold opacity-90">{t("gamification.row.prizeHeader")}</p>
      <div className="flex items-center gap-2 my-1">
        <span className="text-2xl leading-none">{nextPrizeEmoji}</span>
        <span className="text-sm font-semibold leading-tight truncate">{nextPrizeName}</span>
      </div>
      <MiniProgress value={currentPoints} max={nextPrizeThreshold} />
      <p className="text-xs opacity-80 mt-1">
        {t("gamification.row.prizeRemaining").replace("{remaining}", String(remaining))}
      </p>
    </motion.div>
  );
}

// ---- Card 3: Challenge ----

function ChallengeCard({
  challengeTitle,
  challengeProgress,
  challengeActive,
  index,
}: {
  challengeTitle: string;
  challengeProgress: number;
  challengeActive: boolean;
  index: number;
}) {
  const { t } = useTranslation();

  return (
    <motion.div
      className="snap-start min-w-[200px] flex-shrink-0 rounded-2xl p-4 min-h-[120px] flex flex-col justify-between text-white"
      style={{
        background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
      }}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={cardVariants}
      whileTap={{ scale: 0.97 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold opacity-90">{t("gamification.row.challengeHeader")}</p>
        {challengeActive && (
          <span className="text-[10px] font-bold bg-white/25 rounded-full px-2 py-0.5 leading-none">
            {t("gamification.row.challengeActive")}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold leading-tight line-clamp-2 my-1">{challengeTitle}</p>
      <MiniProgress value={challengeProgress} max={100} />
      <p className="text-xs opacity-80 mt-1">
        {t("gamification.row.challengeDone").replace(
          "{progress}",
          String(Math.round(challengeProgress)),
        )}
      </p>
    </motion.div>
  );
}

// ---- Empty / motivational card ----

function EmptyCard() {
  const { t } = useTranslation();

  return (
    <motion.div
      className="snap-start min-w-[280px] flex-shrink-0 rounded-2xl p-4 min-h-[120px] flex flex-col justify-center text-white"
      style={{
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      }}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
    >
      <p className="text-lg font-bold">{t("gamification.row.emptyTitle")}</p>
      <p className="text-sm opacity-80 mt-1">{t("gamification.row.emptySubtitle")}</p>
    </motion.div>
  );
}

// ---- Main export ----

export const GamificationRow = memo(function GamificationRow({
  streakDays,
  streakTarget,
  currentPoints,
  nextPrizeThreshold,
  nextPrizeName,
  nextPrizeEmoji,
  challengeTitle,
  challengeProgress,
  challengeActive,
}: GamificationRowProps) {
  const isEmpty =
    streakDays === 0 && currentPoints === 0 && !challengeActive && challengeProgress === 0;

  if (isEmpty) {
    return (
      <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory flex gap-3 px-1 pb-1">
        <EmptyCard />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory flex gap-3 px-1 pb-1">
      <StreakCard streakDays={streakDays} streakTarget={streakTarget} index={0} />
      <PrizeCard
        currentPoints={currentPoints}
        nextPrizeThreshold={nextPrizeThreshold}
        nextPrizeName={nextPrizeName}
        nextPrizeEmoji={nextPrizeEmoji}
        index={1}
      />
      <ChallengeCard
        challengeTitle={challengeTitle}
        challengeProgress={challengeProgress}
        challengeActive={challengeActive}
        index={2}
      />
    </div>
  );
});
