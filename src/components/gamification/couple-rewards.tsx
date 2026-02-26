"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Gift, Lock, Sparkles } from "lucide-react";
import type { Reward, RewardProgress } from "@/lib/rewards";

interface CoupleRewardsProps {
  rewardsProgress: RewardProgress[];
  onRewardClick?: (reward: Reward) => void;
}

function sortRewards(progress: RewardProgress[]): RewardProgress[] {
  return [...progress].sort((a, b) => {
    // Closest to unlock first (locked, highest progress)
    if (!a.unlocked && !b.unlocked) return b.progress - a.progress;
    // Locked before unlocked
    if (a.unlocked && !b.unlocked) return 1;
    if (!a.unlocked && b.unlocked) return -1;
    // Both unlocked: keep original order
    return 0;
  });
}

function getProgressColor(progress: number, unlocked: boolean): string {
  if (unlocked) return "#EAB308"; // yellow/gold
  if (progress >= 75) return "#22C55E"; // green
  if (progress >= 50) return "#3B82F6"; // blue
  if (progress >= 25) return "#8B5CF6"; // purple
  return "#94A3B8"; // gray
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.3, ease: "easeOut" as const },
  }),
};

export function CoupleRewards({
  rewardsProgress,
  onRewardClick,
}: CoupleRewardsProps) {
  const sorted = useMemo(() => sortRewards(rewardsProgress), [rewardsProgress]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">
            הפרסים שלנו
          </h2>
        </div>
        <p className="text-xs text-muted">
          השלימו משימות יחד כדי לפתוח פרסים
        </p>
      </div>

      {/* Rewards grid */}
      <div className="grid grid-cols-2 gap-3">
        {sorted.map((item, i) => (
          <RewardCard
            key={item.reward.id}
            item={item}
            index={i}
            onClick={onRewardClick}
          />
        ))}
      </div>
    </div>
  );
}

function RewardCard({
  item,
  index,
  onClick,
}: {
  item: RewardProgress;
  index: number;
  onClick?: (reward: Reward) => void;
}) {
  const { reward, current, target, progress, unlocked } = item;
  const nearUnlock = !unlocked && progress >= 75;
  const color = getProgressColor(progress, unlocked);

  return (
    <motion.button
      className={`relative rounded-2xl p-3 text-right space-y-2 transition-colors ${
        unlocked
          ? "bg-yellow-50 border-2 border-yellow-400 dark:bg-yellow-950/20 dark:border-yellow-500/50"
          : "card-elevated border border-border/50"
      } ${!unlocked ? "opacity-70" : ""}`}
      variants={cardVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick?.(reward)}
    >
      {/* Near-unlock glow */}
      {nearUnlock && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-primary/30"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Emoji + lock overlay */}
      <div className="relative w-fit mx-auto">
        <span
          className={`text-3xl block ${!unlocked ? "grayscale" : ""}`}
        >
          {reward.emoji}
        </span>
        {!unlocked && (
          <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-surface-hover rounded-full flex items-center justify-center">
            <Lock className="w-2.5 h-2.5 text-muted" />
          </div>
        )}
        {unlocked && (
          <motion.div
            className="absolute -top-1 -left-1"
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </motion.div>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-foreground text-center leading-tight">
        {reward.title}
      </p>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-border/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.06 }}
          />
        </div>
        <p className="text-[10px] text-muted text-center">
          {current}/{target}
        </p>
      </div>

      {/* Description tooltip on unlocked */}
      {unlocked && (
        <p className="text-[10px] text-yellow-600 dark:text-yellow-400 text-center font-medium">
          נפתח!
        </p>
      )}
    </motion.button>
  );
}
