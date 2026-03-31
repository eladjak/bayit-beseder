"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { RankedMember, LeaderboardPeriod } from "@/hooks/useLeaderboard";

interface LeaderboardProps {
  rankings: RankedMember[];
  period: LeaderboardPeriod;
  onSetPeriod: (p: LeaderboardPeriod) => void;
  myUserId?: string | null;
}

const TABS: LeaderboardPeriod[] = ["day", "week", "alltime"];

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function BreakdownTooltip({ entry }: { entry: RankedMember }) {
  const { t } = useTranslation();
  const { easy, medium, hard } = entry.breakdown;

  return (
    <div
      role="tooltip"
      className="absolute bottom-full mb-2 start-1/2 -translate-x-1/2 z-20 w-48 rounded-xl bg-surface border border-border/30 shadow-lg p-2.5 text-[11px] pointer-events-none"
    >
      <p className="font-semibold text-foreground mb-1.5">
        {t("scoreboard.pointsBreakdown")}
      </p>
      <div className="space-y-0.5 text-muted">
        <div className="flex justify-between">
          <span>{t("scoreboard.easyTasks")}</span>
          <span className="font-medium text-foreground">{easy}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("scoreboard.mediumTasks")}</span>
          <span className="font-medium text-foreground">{medium}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("scoreboard.hardTasks")}</span>
          <span className="font-medium text-foreground">{hard}</span>
        </div>
      </div>
    </div>
  );
}

function MemberRow({
  entry,
  isSelf,
  index,
}: {
  entry: RankedMember;
  isSelf: boolean;
  index: number;
}) {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);
  const medal = RANK_MEDALS[entry.rank];
  const isFirst = entry.rank === 1;

  return (
    <motion.div
      layout
      key={entry.member.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
        isSelf
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-surface-hover"
      }`}
    >
      {/* Rank */}
      <div className="w-7 flex-shrink-0 text-center">
        {medal ? (
          <span
            className="text-lg leading-none"
            aria-label={`${t("leaderboard.rank")} ${entry.rank}`}
          >
            {medal}
          </span>
        ) : (
          <span className="text-sm font-bold text-muted">{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {entry.member.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.member.avatarUrl}
            alt={entry.member.name}
            className="w-9 h-9 rounded-full object-cover border-2 border-border/30"
          />
        ) : (
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
              isFirst
                ? "bg-warning/20 border-warning/40 text-warning"
                : "bg-surface-hover border-border/30 text-muted"
            }`}
          >
            {entry.member.name.slice(0, 1)}
          </div>
        )}
        {isFirst && (
          <Crown
            className="absolute -top-2 -right-1 w-3.5 h-3.5 text-warning"
            aria-hidden
          />
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground truncate">
            {entry.member.name}
          </span>
          {isSelf && (
            <span className="text-[10px] bg-primary/20 text-primary px-1 py-0.5 rounded-full">
              {t("leaderboard.you")}
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted">
          {entry.completionCount} {t("leaderboard.completions")}
        </span>
      </div>

      {/* Points with tooltip */}
      <div
        className="relative flex-shrink-0 text-start cursor-default"
        onMouseEnter={() => entry.completionCount > 0 && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => entry.completionCount > 0 && setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        tabIndex={entry.completionCount > 0 ? 0 : -1}
        aria-describedby={showTooltip ? `breakdown-${entry.member.id}` : undefined}
      >
        <motion.span
          key={entry.points}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className={`text-sm font-bold block ${
            isFirst ? "text-warning" : isSelf ? "text-primary" : "text-foreground"
          }`}
        >
          {entry.points}
        </motion.span>
        <span className="text-[10px] text-muted">{t("leaderboard.pts")}</span>
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              id={`breakdown-${entry.member.id}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
            >
              <BreakdownTooltip entry={entry} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export const Leaderboard = memo(function Leaderboard({
  rankings,
  period,
  onSetPeriod,
  myUserId,
}: LeaderboardProps) {
  const { t } = useTranslation();

  const hasData = rankings.some((r) => r.completionCount > 0);

  const tabLabel = (p: LeaderboardPeriod) => {
    if (p === "day") return t("scoreboard.daily");
    if (p === "week") return t("scoreboard.weekly");
    return t("scoreboard.allTime");
  };

  return (
    <div className="rounded-2xl card-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-warning" />
          <span className="text-sm font-bold text-foreground">
            {t("leaderboard.title")}
          </span>
        </div>

        {/* Period tabs */}
        <div
          className="flex items-center bg-surface-hover rounded-full p-0.5 text-[11px] gap-0.5"
          role="group"
          aria-label={t("leaderboard.periodLabel")}
        >
          {TABS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onSetPeriod(p)}
              className={`relative px-2.5 py-1 rounded-full transition-colors font-medium ${
                period === p
                  ? "text-white"
                  : "text-muted hover:text-foreground"
              }`}
              aria-pressed={period === p}
            >
              {period === p && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tabLabel(p)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Rankings */}
      <div className="p-2 space-y-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={period}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {!hasData ? (
              <p className="text-center text-sm text-muted py-6">
                {t("scoreboard.noActivity")}
              </p>
            ) : (
              <AnimatePresence initial={false}>
                {rankings.map((entry, index) => (
                  <MemberRow
                    key={entry.member.id}
                    entry={entry}
                    isSelf={entry.member.id === myUserId}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
});
