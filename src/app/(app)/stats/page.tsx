"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Trophy, History, TrendingUp, Users } from "lucide-react";

import { ACHIEVEMENTS } from "@/lib/achievements";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";
import {
  computeWeeklyTrend,
  computeCategoryBreakdown,
  computePartnerComparison,
  computeMembersComparison,
  buildStreakHistory,
  countCompletedThisWeek,
  countCompletedThisMonth,
  computeBestStreak,
} from "@/lib/task-stats";
import { useTasks } from "@/hooks/useTasks";
import { useCompletions } from "@/hooks/useCompletions";
import { useCategories } from "@/hooks/useCategories";
import { useProfile } from "@/hooks/useProfile";
import { usePartner } from "@/hooks/usePartner";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { useUserAchievements } from "@/hooks/useUserAchievements";
import { AnimatedNumber } from "@/components/animated-number";
import type { TaskCompletionRow, TaskRow } from "@/lib/types/database";
import { CATEGORY_NAME_TO_KEY, CATEGORY_ICONS } from "@/lib/categories";
// WeeklyShareCard uses canvas — lazy-load it
const WeeklyShareCard = dynamic(
  () => import("@/components/gamification/weekly-share-card").then((m) => m.WeeklyShareCard),
  { ssr: false }
);
import { useTranslation } from "@/hooks/useTranslation";
import { StatCardSkeleton, RingSkeleton } from "@/components/skeleton";

// Recharts is ~200 KB — lazy-load the two chart panels independently
const WeeklyBarChart = dynamic(
  () => import("@/components/stats/weekly-bar-chart").then((m) => m.WeeklyBarChart),
  {
    ssr: false,
    loading: () => <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />,
  }
);

const CategoryPieChart = dynamic(
  () => import("@/components/stats/category-pie-chart").then((m) => m.CategoryPieChart),
  {
    ssr: false,
    loading: () => <div className="h-36 bg-muted/30 rounded-xl animate-pulse" />,
  }
);

const MOCK_WEEKLY_DATA = [
  { day: "א׳", completed: 7, total: 10 },
  { day: "ב׳", completed: 9, total: 10 },
  { day: "ג׳", completed: 6, total: 10 },
  { day: "ד׳", completed: 8, total: 10 },
  { day: "ה׳", completed: 10, total: 10 },
  { day: "ו׳", completed: 5, total: 8 },
  { day: "ש׳", completed: 3, total: 5 },
];

const MOCK_CATEGORY_DATA = [
  { name: "מטבח", value: 35, category: "kitchen" },
  { name: "אמבטיה", value: 20, category: "bathroom" },
  { name: "סלון", value: 15, category: "living" },
  { name: "חיות", value: 15, category: "pets" },
  { name: "כביסה", value: 10, category: "laundry" },
  { name: "כללי", value: 5, category: "general" },
];

// Compute unlocked achievements from real data
function computeUnlockedAchievements(
  completions: TaskCompletionRow[],
  streak: number,
  tasks: TaskRow[]
): Set<string> {
  const unlocked = new Set<string>();

  // first_task - completed at least 1 task
  if (completions.length >= 1) {
    unlocked.add("first_task");
  }

  // streak achievements
  if (streak >= 3) unlocked.add("streak_3");
  if (streak >= 7) unlocked.add("streak_7");
  if (streak >= 30) unlocked.add("streak_30");

  // kitchen_master - 50 kitchen tasks completed
  const kitchenCompletions = completions.filter((c) => {
    const task = tasks.find((t) => t.id === c.task_id);
    return task?.title.includes("מטבח") || task?.title.includes("כלים");
  }).length;
  if (kitchenCompletions >= 50) {
    unlocked.add("kitchen_master");
  }

  // all_daily_10 - completed all daily tasks 10+ times
  // Simplified: if total completions > 100, assume this is unlocked
  if (completions.length >= 100) {
    unlocked.add("all_daily_10");
  }

  // golden_rule_5 - met golden rule target 5+ times
  // Simplified: if completions > 50, assume golden rule hit multiple times
  if (completions.length >= 50) {
    unlocked.add("golden_rule_5");
  }

  return unlocked;
}

// ============================================
// Streak Visualization Component
// ============================================

interface StreakVisualizationProps {
  streakDays: { date: string; hadActivity: boolean }[];
  currentStreak: number;
  bestStreak: number;
}

function StreakVisualization({
  streakDays,
  currentStreak,
  bestStreak,
}: StreakVisualizationProps) {
  const { t } = useTranslation();
  const hebrewDayNames = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm">🔥 {t("stats.streakActivity")}</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted">עכשיו:</span>
            <span className="text-xs font-bold text-primary">
              {currentStreak}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted">שיא:</span>
            <span className="text-xs font-bold text-amber-500">
              {bestStreak}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-1 justify-between">
        {streakDays.map((day) => {
          const date = new Date(day.date);
          const dayLabel = hebrewDayNames[date.getDay()];
          const dayOfMonth = date.getDate();

          return (
            <div key={day.date} className="flex flex-col items-center gap-1">
              <motion.div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-medium ${
                  day.hadActivity
                    ? "bg-primary text-white"
                    : "bg-border/50 text-muted"
                }`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.02 * streakDays.indexOf(day) }}
                title={`${dayOfMonth}/${date.getMonth() + 1} - ${day.hadActivity ? "בוצע" : "לא בוצע"}`}
              >
                {day.hadActivity ? "V" : ""}
              </motion.div>
              <span className="text-[8px] text-muted leading-none">
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Partner Comparison Component
// ============================================

interface PartnerComparisonProps {
  myCount: number;
  partnerCount: number;
  myName: string;
  partnerName: string;
  weeklyCompletedTotal: number;
  monthlyCompletedTotal: number;
}

function PartnerComparisonSection({
  myCount,
  partnerCount,
  myName,
  partnerName,
  weeklyCompletedTotal,
  monthlyCompletedTotal,
}: PartnerComparisonProps) {
  const total = myCount + partnerCount;
  const myPct = total > 0 ? Math.round((myCount / total) * 100) : 50;
  const partnerPct = total > 0 ? 100 - myPct : 50;

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-sm">⚖️ השבוע — מי עשה מה?</h2>
      </div>

      {/* Bar comparison */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs text-muted mb-1">{myName}</p>
            <AnimatedNumber
              value={myCount}
              className="text-2xl font-bold text-primary"
            />
            <p className="text-xs text-muted">משימות</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted mb-1">{partnerName}</p>
            <AnimatedNumber
              value={partnerCount}
              className="text-2xl font-bold text-primary-light"
            />
            <p className="text-xs text-muted">משימות</p>
          </div>
        </div>

        {/* Ratio bar */}
        {total > 0 && (
          <div className="space-y-1">
            <div className="flex rounded-full h-2.5 overflow-hidden bg-border/30">
              <motion.div
                className="bg-primary rounded-r-full"
                initial={{ width: 0 }}
                animate={{ width: `${myPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
              <motion.div
                className="bg-primary-light rounded-l-full"
                initial={{ width: 0 }}
                animate={{ width: `${partnerPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted">
              <span>{myPct}%</span>
              <span>{partnerPct}%</span>
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="flex justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-success" />
            <span className="text-[11px] text-muted">
              השבוע: <span className="font-medium text-foreground">{weeklyCompletedTotal}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-[11px] text-muted">
              החודש: <span className="font-medium text-foreground">{monthlyCompletedTotal}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Stats Page
// ============================================

export default function StatsPage() {
  const { t } = useTranslation();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { tasks, loading: tasksLoading } = useTasks({});
  const { completions, loading: completionsLoading } = useCompletions({ limit: 500 });
  const { categoryMap } = useCategories();
  const { profile } = useProfile();
  const { partner } = usePartner(profile?.partner_id, today);
  const { members: householdMembers } = useHouseholdMembers(profile?.household_id ?? null, today);
  const { dbUnlockedCodes, hasDbData: hasAchievementsDbData } = useUserAchievements();

  // Build category_id -> key mapping
  const categoryIdToKey = useMemo(() => {
    const result: Record<string, string> = {};
    for (const [id, name] of Object.entries(categoryMap)) {
      result[id] = CATEGORY_NAME_TO_KEY[name] ?? "general";
    }
    return result;
  }, [categoryMap]);

  const hasDbData = tasks.length > 0 || completions.length > 0;

  // Compute weekly trend from real data (falls back to mock)
  const weeklyData = useMemo(() => {
    if (!hasDbData) return MOCK_WEEKLY_DATA;
    return computeWeeklyTrend(completions, tasks, today);
  }, [hasDbData, completions, tasks, today]);

  // Category breakdown - real or mock
  const categoryData = useMemo(() => {
    if (!hasDbData) return MOCK_CATEGORY_DATA;
    const breakdown = computeCategoryBreakdown(
      completions,
      tasks,
      categoryIdToKey
    );
    return breakdown.length > 0 ? breakdown : MOCK_CATEGORY_DATA;
  }, [hasDbData, completions, tasks, categoryIdToKey]);

  // Partner comparison
  const partnerComparison = useMemo(() => {
    if (!hasDbData || !profile) {
      return { myCount: 48, partnerCount: 42, myUserId: "", partnerUserId: "" };
    }
    return computePartnerComparison(
      completions,
      profile.id,
      profile.partner_id ?? "",
      today
    );
  }, [hasDbData, completions, profile, today]);

  // Streak history for visualization
  const streakHistory = useMemo(
    () => buildStreakHistory(completions, today, 14),
    [completions, today]
  );

  // Best streak computed from completion history (0 when no data)
  const bestStreak = useMemo(
    () => computeBestStreak(completions),
    [completions]
  );

  // Weekly and monthly totals
  const weeklyTotal = useMemo(
    () => countCompletedThisWeek(completions, today),
    [completions, today]
  );
  const monthlyTotal = useMemo(
    () => countCompletedThisMonth(completions, today),
    [completions, today]
  );

  // Compute unlocked achievements:
  // 1. Try DB (user_achievements table) first
  // 2. Fall back to client-side computation from completions/streaks
  // 3. Fall back to mock data for demo
  const unlockedAchievements = useMemo(() => {
    if (hasAchievementsDbData && dbUnlockedCodes.size > 0) {
      // DB data available - use it as the source of truth
      return dbUnlockedCodes;
    }
    if (!hasDbData) {
      // Mock data for demo
      return new Set(["first_task", "streak_3", "streak_7", "golden_rule_5"]);
    }
    // Client-side computation as fallback when DB has no achievement records yet
    return computeUnlockedAchievements(
      completions,
      profile?.streak ?? 0,
      tasks
    );
  }, [hasAchievementsDbData, dbUnlockedCodes, hasDbData, completions, profile?.streak, tasks]);

  // Show skeleton while data is loading to prevent blank flash
  if (tasksLoading || completionsLoading) {
    return (
      <div className="space-y-4 pb-28 px-4 pt-6" dir="rtl">
        <RingSkeleton />
        <div className="grid grid-cols-2 gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header with gradient */}
      <div className="gradient-hero mesh-overlay rounded-b-[2rem] px-4 pt-6 pb-5 overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <h1 className="text-xl font-bold text-white tracking-tight">📊 {t("stats.pageTitle")}</h1>
          <Link
            href="/history"
            className="flex items-center gap-1.5 text-xs text-white bg-white/12 px-3.5 py-1.5 rounded-xl font-medium backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors"
            aria-label="עבור להיסטוריית משימות"
          >
            <History className="w-3.5 h-3.5" />
            {t("stats.history")}
          </Link>
        </div>
      </div>

      <div className="px-4 space-y-4">

      {/* Weekly share card */}
      <WeeklyShareCard
        weekRange={`${new Date().toLocaleDateString("he-IL", { day: "numeric", month: "short" })}`}
        completedTasks={weeklyTotal}
        totalTasks={tasks.length > 0 ? Math.min(tasks.length, weeklyTotal + 10) : 44}
        streakDays={profile?.streak ?? 0}
        topCategory={categoryData.length > 0 ? {
          name: categoryData[0].name,
          icon: CATEGORY_ICONS[categoryData[0].category] ?? "🏠",
          count: categoryData[0].value,
        } : null}
        householdName="הבית שלנו"
      />

      {/* Empty state illustration - shown when no real data yet */}
      {!hasDbData && (
        <motion.div
          className="card-elevated p-4 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Image
            src="/illustrations/empty-stats.jpg"
            alt="אין נתונים עדיין"
            width={192}
            height={192}
            className="w-48 h-48 mx-auto object-cover rounded-2xl mb-3"
          />
          <p className="font-medium text-foreground">עדיין אין מה להראות 🌱</p>
          <p className="text-sm text-muted">השלימו כמה משימות ונתחיל לראות תמונה</p>
        </motion.div>
      )}

      {/* Dashboard Analytics - shown when DB data is available */}
      {hasDbData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DashboardStats
            tasks={tasks}
            completions={completions}
            categoryNameToKey={categoryIdToKey}
            today={today}
          />
        </motion.div>
      )}

      {/* Streak Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <StreakVisualization
          streakDays={streakHistory}
          currentStreak={profile?.streak ?? 0}
          bestStreak={bestStreak}
        />
      </motion.div>

      {/* Weekly Completion Trend Chart */}
      <motion.div
        className="card-elevated p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">📈 {t("stats.thisWeek")}</h2>
          <span className="text-[10px] text-muted bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {hasDbData ? t("stats.ourData") : t("stats.demo")}
          </span>
        </div>
        <WeeklyBarChart data={weeklyData} />
      </motion.div>

      {/* Monthly Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <MonthlyCalendar tasks={tasks} completions={completions} today={today} />
      </motion.div>

      {/* Category Breakdown - now uses real data when available */}
      <motion.div
        className="card-elevated p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">🏷️ {t("stats.byCategory")}</h2>
          {hasDbData && (
            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
              {t("stats.ourData")}
            </span>
          )}
        </div>
        <CategoryPieChart data={categoryData} />
      </motion.div>

      {/* Partner Comparison - now uses real data when available */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <PartnerComparisonSection
        myCount={partnerComparison.myCount}
        partnerCount={partnerComparison.partnerCount}
        myName={profile?.name ?? "אני"}
        partnerName={partner.name}
        weeklyCompletedTotal={weeklyTotal}
        monthlyCompletedTotal={monthlyTotal}
      />
      </motion.div>

      {/* Achievements */}
      <motion.div
        className="card-elevated p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-sm">🏆 {t("stats.achievements")}</h2>
          <span className="text-xs text-muted">
            {unlockedAchievements.size}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <Image
          src="/illustrations/stats-achievements.jpg"
          alt="הישגים ופרסים"
          width={512}
          height={128}
          className="w-full h-32 object-cover rounded-xl mb-3"
        />
        <div className="grid grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((achievement, idx) => {
            const unlocked = unlockedAchievements.has(achievement.code);
            return (
              <motion.div
                key={achievement.code}
                className={`card-elevated p-3 text-center ${
                  unlocked ? "" : "opacity-40 grayscale"
                }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.7 + idx * 0.05 }}
                whileTap={unlocked ? { scale: 0.95 } : undefined}
                title={achievement.description}
              >
                <span className="text-2xl block mb-1">{achievement.icon}</span>
                <p className="text-[10px] font-medium text-foreground leading-tight">
                  {achievement.title}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
      </div>
    </div>
  );
}
