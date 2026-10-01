"use client";

import { useMemo, useState } from "react";
import type { TaskCompletionRow } from "@/lib/types/database";
import type { HouseholdMember } from "@/hooks/useHouseholdMembers";
import { addDaysStr, ilDay, ilToday } from "@/lib/il-date";

export type LeaderboardPeriod = "day" | "week" | "alltime";

export interface PointsBreakdown {
  easy: number;
  medium: number;
  hard: number;
}

export interface RankedMember {
  member: HouseholdMember;
  points: number;
  completionCount: number;
  rank: number;
  breakdown: PointsBreakdown;
}

interface UseLeaderboardOptions {
  members: HouseholdMember[];
  completions: TaskCompletionRow[];
  userId?: string | null;
}

interface UseLeaderboardReturn {
  rankings: RankedMember[];
  period: LeaderboardPeriod;
  setPeriod: (p: LeaderboardPeriod) => void;
  myRank: number | null;
  loading: boolean;
}

/** Today as ISO date string */
function todayStr(): string {
  return ilToday();
}

/** Monday of the current ISO week */
function weekStart(): string {
  const today = ilToday();
  const day = new Date(today).getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysStr(today, diff);
}

/** Simple points model: 10 pts per completion */
const PTS_PER_COMPLETION = 10;

/**
 * Approximate easy/medium/hard split from a completion count.
 * When actual task difficulty is unavailable, distribute ~50% easy, 35% medium, 15% hard.
 */
function estimateBreakdown(count: number): PointsBreakdown {
  const hard = Math.floor(count * 0.15);
  const medium = Math.floor(count * 0.35);
  const easy = count - medium - hard;
  return { easy, medium, hard };
}

function computeRankings(
  members: HouseholdMember[],
  completions: TaskCompletionRow[],
  period: LeaderboardPeriod
): RankedMember[] {
  const start =
    period === "day" ? todayStr() : period === "week" ? weekStart() : null;

  const filtered = start
    ? completions.filter((c) => ilDay(c.completed_at) >= start)
    : completions;

  // Count per user
  const countMap: Record<string, number> = {};
  for (const c of filtered) {
    countMap[c.user_id] = (countMap[c.user_id] ?? 0) + 1;
  }

  const ranked = members
    .map((m) => {
      const count = countMap[m.id] ?? 0;
      return {
        member: m,
        completionCount: count,
        points: count * PTS_PER_COMPLETION,
        rank: 0,
        breakdown: estimateBreakdown(count),
      };
    })
    .sort((a, b) => b.points - a.points || b.completionCount - a.completionCount);

  // Assign ranks (ties share the same rank)
  let currentRank = 1;
  for (let i = 0; i < ranked.length; i++) {
    if (i > 0 && ranked[i].points < ranked[i - 1].points) {
      currentRank = i + 1;
    }
    ranked[i].rank = currentRank;
  }

  return ranked;
}

export function useLeaderboard({
  members,
  completions,
  userId,
}: UseLeaderboardOptions): UseLeaderboardReturn {
  const [period, setPeriod] = useState<LeaderboardPeriod>("day");

  const rankings = useMemo(
    () => computeRankings(members, completions, period),
    [members, completions, period]
  );

  const myRank = useMemo(() => {
    if (!userId) return null;
    const entry = rankings.find((r) => r.member.id === userId);
    return entry?.rank ?? null;
  }, [rankings, userId]);

  return {
    rankings,
    period,
    setPeriod,
    myRank,
    loading: false,
  };
}
