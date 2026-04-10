"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { TodayOverview, type TaskItem } from "@/components/dashboard/today-overview";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { PartnerStatus, MembersStatus } from "@/components/dashboard/partner-status";
// Moved to settings/weekly: EmergencyToggle (in quick links), WeeklySummaryCards, RoomConditions
// These are inside the collapsible achievements accordion — lazy-load them
const StreakTracker = dynamic(() => import("@/components/gamification/streak-tracker").then(m => ({ default: m.StreakTracker })), { ssr: false });
const WeeklyChallenge = dynamic(() => import("@/components/gamification/weekly-challenge").then(m => ({ default: m.WeeklyChallenge })), { ssr: false });
const CoupleRewards = dynamic(() => import("@/components/gamification/couple-rewards").then(m => ({ default: m.CoupleRewards })), { ssr: false });
const WeeklyChallenges = dynamic(() => import("@/components/gamification/weekly-challenges").then(m => ({ default: m.WeeklyChallenges })), { ssr: false });
const Leaderboard = dynamic(() => import("@/components/gamification/leaderboard").then(m => ({ default: m.Leaderboard })), { ssr: false });
const ActivityFeed = dynamic(() => import("@/components/dashboard/activity-feed").then(m => ({ default: m.ActivityFeed })), { ssr: false });
const HouseMap = dynamic(() => import("@/components/dashboard/house-map").then(m => ({ default: m.HouseMap })), { ssr: false });
const PrizeCard = dynamic(() => import("@/components/prizes/prize-card").then(m => ({ default: m.PrizeCard })), { ssr: false });
const QuickStatsBar = dynamic(() => import("@/components/dashboard/quick-stats-bar").then(m => ({ default: m.QuickStatsBar })), { ssr: false });
const GamificationRow = dynamic(() => import("@/components/dashboard/gamification-row").then(m => ({ default: m.GamificationRow })), { ssr: false });
import { getRandomMessage } from "@/lib/coaching-messages";
import { computeRoomHealth } from "@/lib/room-health";
import { computeRewardsProgress } from "@/lib/rewards";
import { computeBestStreak } from "@/lib/task-stats";
import { filterTasksByEnergy } from "@/lib/energy-filter";
import type { EnergyLevel } from "@/lib/energy-filter";
import { useProfile } from "@/hooks/useProfile";
import { useTasks } from "@/hooks/useTasks";
import { useCompletions } from "@/hooks/useCompletions";
import { useCategories } from "@/hooks/useCategories";
import { useAppSounds } from "@/hooks/useAppSound";

import { usePartner } from "@/hooks/usePartner";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { useWeeklyChallenges } from "@/hooks/useWeeklyChallenges";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { TaskListSkeleton } from "@/components/skeleton";
import { toast } from "sonner";
import { CATEGORY_NAME_TO_KEY, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/categories";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { GoldenRuleSection } from "@/components/dashboard/golden-rule-section";
import { PlaylistCard } from "@/components/dashboard/playlist-card";
import { EnergyModeSection } from "@/components/dashboard/energy-mode-section";
import { CoachingInsight } from "@/components/dashboard/coaching-insight";
import { CoachingTips } from "@/components/dashboard/coaching-tips";
const PesachCountdownBanner = dynamic(() => import("@/components/seasonal/pesach-countdown-banner").then(m => ({ default: m.PesachCountdownBanner })), { ssr: false });
import { useSeasonalMode } from "@/hooks/useSeasonalMode";
import { useTranslation } from "@/hooks/useTranslation";
import { ChevronDown } from "lucide-react";

// Lazy-load components that aren't always visible (modals, overlays, coaching)
const CelebrationOverlay = dynamic(() => import("@/components/gamification/celebration-overlay").then(m => ({ default: m.CelebrationOverlay })), { ssr: false });
const CoachingBubble = dynamic(() => import("@/components/gamification/coaching-bubble").then(m => ({ default: m.CoachingBubble })), { ssr: false });
const TaskCompletionModal = dynamic(() => import("@/components/task-completion-modal").then(m => ({ default: m.TaskCompletionModal })), { ssr: false });
const PesachActivationModal = dynamic(() => import("@/components/seasonal/pesach-activation-modal").then(m => ({ default: m.PesachActivationModal })), { ssr: false });
const ConversationalOnboarding = dynamic(() => import("@/components/onboarding/conversational-onboarding").then(m => ({ default: m.ConversationalOnboarding })), { ssr: false });
import { useHousehold } from "@/hooks/useHousehold";
import { OfflineIndicator } from "@/components/offline-indicator";
import { useFirstVisit } from "@/hooks/useFirstVisit";
import { FeatureTooltip } from "@/components/feature-tooltip";

// ============================================
// Mock data (fallback when Supabase not connected)
// ============================================
const MOCK_TASKS: TaskItem[] = [
  { id: "1", title: "שטיפת כלים / הפעלת מדיח", category: "kitchen", estimated_minutes: 15, completed: false },
  { id: "2", title: "האכלת חתולים (בוקר)", category: "pets", estimated_minutes: 5, completed: true },
  { id: "3", title: "הוצאת אשפה", category: "kitchen", estimated_minutes: 5, completed: false },
  { id: "4", title: "ניקוי משטחי עבודה במטבח", category: "kitchen", estimated_minutes: 5, completed: false },
  { id: "5", title: "סידור מהיר של הסלון", category: "living", estimated_minutes: 5, completed: true },
  { id: "6", title: "מים טריים לחתולים", category: "pets", estimated_minutes: 2, completed: false },
  { id: "7", title: "ניקוי ארגז חול", category: "pets", estimated_minutes: 5, completed: false },
  { id: "8", title: "איוורור הבית", category: "general", estimated_minutes: 2, completed: true },
];

function getHebrewDate(): string {
  return new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const MORNING_SUBTITLES = [
  "בואו נתחיל לפני שהקפה מתקרר ☕",
  "יום חדש, בית חדש (כמעט)",
  "הבית לא ינקה את עצמו — בואו",
  "בוקר טוב לכם ולמדיח",
];

const AFTERNOON_SUBTITLES = [
  "איך הולך היום? הבית שואל",
  "אחרי הצהריים = שעת שיא ביצועים",
  "עדיין אפשר להספיק הרבה היום",
  "מה קורה? הבית בסדר?",
];

const EVENING_SUBTITLES = [
  "בואו נסכם את היום בנקיון קל",
  "ערב נעים — אחרי שמסדרים קצת",
  "כמה משימות ואז הספה שלכם",
  "ישר לנקות ואחר כך להירגע 💆",
];

const NIGHT_SUBTITLES = [
  "מאוחר אבל הבית לא שופט 🌙",
  "לילה טוב — מחר מתחילים מחדש",
  "שינה טובה מגיעה למי שסידר היום",
];

function pickSubtitle(arr: string[]): string {
  return arr[new Date().getDate() % arr.length];
}

function getTimeGreeting(name: string): { greeting: string; subtitle: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { greeting: `לילה טוב, ${name} 🌙`, subtitle: pickSubtitle(NIGHT_SUBTITLES) };
  if (hour < 12) return { greeting: `בוקר טוב, ${name}! ☀️`, subtitle: pickSubtitle(MORNING_SUBTITLES) };
  if (hour < 17) return { greeting: `צהריים טובים, ${name} 👋`, subtitle: pickSubtitle(AFTERNOON_SUBTITLES) };
  if (hour < 21) return { greeting: `ערב טוב, ${name} 🌆`, subtitle: pickSubtitle(EVENING_SUBTITLES) };
  return { greeting: `לילה טוב, ${name} 🌙`, subtitle: pickSubtitle(NIGHT_SUBTITLES) };
}

// CATEGORY_INFO derived from shared categories.ts
const CATEGORY_INFO = Object.fromEntries(
  Object.keys(CATEGORY_COLORS).map((key) => [
    key,
    { label: CATEGORY_LABELS[key] ?? key, icon: CATEGORY_ICONS[key] ?? "🏠", color: CATEGORY_COLORS[key] },
  ])
) as Record<string, { label: string; icon: string; color: string }>;

export default function DashboardPage() {
  const { t } = useTranslation();
  const { isFirstVisit: showDashboardTip, dismiss: dismissDashboardTip } = useFirstVisit("dashboard");
  // ---- Supabase hooks ----
  const { profile } = useProfile();
  const { tasks: dbTasks, loading: tasksLoading, refetch: refetchTasks } = useTasks({
    realtime: true,
  });
  const { completions: allCompletions, markComplete, isCompletedToday } = useCompletions({ limit: 500 });
  const { categoryMap } = useCategories();
  const { playComplete, playAchievement, playStreak } = useAppSounds();
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { partner } = usePartner(profile?.partner_id, todayStr);
  const { household } = useHousehold(profile?.household_id ?? null);
  // N-member support: prefer household_members table; falls back to partner_id
  const { members: householdMembers, loading: membersLoading } = useHouseholdMembers(
    profile?.household_id ?? null,
    todayStr
  );
  // Members other than the current user (for the "household activity" section)
  const otherMembers = householdMembers.filter((m) => m.id !== profile?.id);

  // ---- Gamification: weekly challenges & leaderboard ----
  const { progress: challengeProgress, weekNum } = useWeeklyChallenges({
    completions: allCompletions,
    userId: profile?.id,
  });
  const { rankings, period: lbPeriod, setPeriod: setLbPeriod } = useLeaderboard({
    members: householdMembers,
    completions: allCompletions,
    userId: profile?.id,
  });

  const seasonalMode = useSeasonalMode();
  const [showSeasonalModal, setShowSeasonalModal] = useState(false);

  // ---- Conversational Onboarding for new authenticated users ----
  const [showTaskWizard, setShowTaskWizard] = useState(false);
  const seedAttempted = useRef(false);
  useEffect(() => {
    if (seedAttempted.current || tasksLoading || !profile) return;
    // Show onboarding if no tasks exist AND onboarding not yet done
    const onboardingDone = localStorage.getItem("bayit-beseder-onboarding-done");
    if (dbTasks.length > 0 || onboardingDone) return;
    seedAttempted.current = true;
    setShowTaskWizard(true);
  }, [tasksLoading, dbTasks.length, profile]);

  const handleOnboardingComplete = useCallback(
    async (result: { homeName: string; tasks: { title: string; category: string; estimatedMinutes: number; recurring: boolean; frequency: string }[] }) => {
      setShowTaskWizard(false);
      if (!profile) return;
      // Save home name to localStorage
      if (result.homeName) {
        localStorage.setItem("bayit-beseder-home-name", result.homeName);
      }
      // Mark conversational onboarding as done
      localStorage.setItem("bayit-beseder-onboarding-done", "true");
      try {
        const res = await fetch("/api/seed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tasks: result.tasks }),
        });
        const data = await res.json();
        if (data.seeded) {
          refetchTasks();
          toast.success(`${result.tasks.length} משימות נוצרו בהצלחה!`);
        }
      } catch {
        toast.error("שגיאה ביצירת המשימות. נסו שוב.");
      }
    },
    [profile, refetchTasks]
  );

  const handleOnboardingSkip = useCallback(() => {
    setShowTaskWizard(false);
    localStorage.setItem("bayit-beseder-onboarding-done", "true");
    // Fall back to default seed
    fetch("/api/seed", { method: "POST" })
      .then((res) => res.json())
      .then((data) => { if (data.seeded) refetchTasks(); })
      .catch(() => {});
  }, [refetchTasks]);

  const hasDbTasks = !tasksLoading && dbTasks.length > 0;

  const dbTaskItems: TaskItem[] = useMemo(
    () =>
      dbTasks.map((t) => {
        const categoryName = t.category_id ? categoryMap[t.category_id] : null;
        const categoryKey = categoryName
          ? (CATEGORY_NAME_TO_KEY[categoryName] ?? "general")
          : "general";
        // Recurring tasks: check today's completions for daily reset.
        // One-time tasks: use permanent status.
        const completed = t.recurring
          ? isCompletedToday(t.id)
          : t.status === "completed";
        return {
          id: t.id,
          title: t.title,
          category: categoryKey,
          estimated_minutes: 10,
          completed,
          points: t.points ?? 0,
          assigned_to: t.assigned_to,
        };
      }),
    [dbTasks, categoryMap, isCompletedToday]
  );

  const [mockTasks] = useState(MOCK_TASKS);
  const [mockCompletedIds, setMockCompletedIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("bayit-completed-tasks");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });

  useEffect(() => {
    if (!hasDbTasks) {
      localStorage.setItem("bayit-completed-tasks", JSON.stringify([...mockCompletedIds]));
    }
  }, [mockCompletedIds, hasDbTasks]);

  const tasks = hasDbTasks
    ? dbTaskItems
    : mockTasks.map(t => ({ ...t, completed: mockCompletedIds.has(t.id) }));

  const [emergencyMode, setEmergencyMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("bayit-energy-mode") as EnergyLevel) || "all";
    }
    return "all";
  });

  const cycleEnergyLevel = useCallback(() => {
    setEnergyLevel((prev) => {
      const next = prev === "all" ? "moderate" : prev === "moderate" ? "light" : "all";
      localStorage.setItem("bayit-energy-mode", next);
      return next;
    });
  }, []);

  const [completionModal, setCompletionModal] = useState<{
    isOpen: boolean;
    taskId: string;
    taskTitle: string;
  }>({ isOpen: false, taskId: "", taskTitle: "" });

  const [celebration, setCelebration] = useState<{
    visible: boolean;
    type: "task" | "all_daily" | "golden_rule";
    message: string;
    emoji: string;
  }>({ visible: false, type: "task", message: "", emoji: "" });

  const [coaching, setCoaching] = useState<{
    visible: boolean;
    message: string;
    emoji: string;
  }>({ visible: false, message: "", emoji: "" });

  const filteredTasks = useMemo(
    () => filterTasksByEnergy(tasks, energyLevel),
    [tasks, energyLevel]
  );

  const completedCount = filteredTasks.filter((t) => t.completed).length;
  const percentage = filteredTasks.length > 0 ? Math.round((completedCount / filteredTasks.length) * 100) : 0;
  const target = emergencyMode ? 50 : 80;

  const streakCount = profile?.streak ?? 5;
  const displayName = profile?.name ?? "שלום";
  const { greeting, subtitle } = getTimeGreeting(displayName);

  const handleToggle = useCallback(
    async (taskId: string) => {
      if (hasDbTasks && profile) {
        const task = dbTasks.find((t) => t.id === taskId);
        // For recurring tasks, check today's completions; for one-time, check status
        const alreadyDone = task?.recurring
          ? isCompletedToday(taskId)
          : task?.status === "completed";
        if (task && !alreadyDone) {
          const result = await markComplete({ taskId, userId: profile.id, recurring: !!task.recurring });
          if (result === null) {
            toast.error("לא ניתן לסמן את המשימה כהושלמה. נסה שוב.");
            return;
          }
          setCompletionModal({ isOpen: true, taskId, taskTitle: task.title });
          const msg = getRandomMessage("task_complete");
          setCelebration({ visible: true, type: "task", message: msg.message, emoji: msg.emoji });
          playComplete();
        }
        return;
      }

      const isCurrentlyCompleted = mockCompletedIds.has(taskId);
      const newCompletedIds = new Set(mockCompletedIds);
      if (isCurrentlyCompleted) {
        newCompletedIds.delete(taskId);
      } else {
        newCompletedIds.add(taskId);
      }
      setMockCompletedIds(newCompletedIds);

      const newCompleted = newCompletedIds.size;
      const newPct = Math.round((newCompleted / mockTasks.length) * 100);
      const wasCompleting = !isCurrentlyCompleted;

      if (wasCompleting) {
        if (newCompleted === mockTasks.length) {
          const msg = getRandomMessage("all_daily_done");
          setCelebration({ visible: true, type: "all_daily", message: msg.message, emoji: msg.emoji });
          playAchievement();
        } else if (newPct >= target) {
          const prevPct = Math.round(((newCompleted - 1) / mockTasks.length) * 100);
          if (prevPct < target) {
            const msg = getRandomMessage("golden_rule_hit");
            setCelebration({ visible: true, type: "golden_rule", message: msg.message, emoji: msg.emoji });
            playStreak();
          } else {
            const msg = getRandomMessage("task_complete");
            setCelebration({ visible: true, type: "task", message: msg.message, emoji: msg.emoji });
            playComplete();
          }
        } else {
          const msg = getRandomMessage("task_complete");
          setCelebration({ visible: true, type: "task", message: msg.message, emoji: msg.emoji });
          playComplete();
        }
      }
    },
    [target, hasDbTasks, profile, dbTasks, markComplete, isCompletedToday, playComplete, playAchievement, playStreak, mockCompletedIds, mockTasks.length]
  );

  const handleCompletionFeedback = useCallback(
    async (feedback: { rating: number; notes: string; photoFile: File | null }) => {
      if (!profile) return;
      try {
        const supabase = (await import("@/lib/supabase")).createClient();
        const updates: Record<string, unknown> = {};
        if (feedback.notes) updates.notes = feedback.notes;
        if (feedback.photoFile) {
          const { uploadTaskPhoto } = await import("@/lib/storage");
          const photoResult = await uploadTaskPhoto(profile.id, completionModal.taskId, feedback.photoFile);
          if ("url" in photoResult) updates.photo_url = photoResult.url;
        }
        if (Object.keys(updates).length > 0) {
          await supabase
            .from("task_completions")
            .update(updates)
            .eq("task_id", completionModal.taskId)
            .eq("user_id", profile.id);
        }
        if (feedback.rating > 0) {
          const ratings = JSON.parse(localStorage.getItem("bayit-task-ratings") ?? "{}");
          ratings[completionModal.taskId] = { rating: feedback.rating, date: new Date().toISOString() };
          localStorage.setItem("bayit-task-ratings", JSON.stringify(ratings));
        }
        if (feedback.rating > 0 || feedback.notes || feedback.photoFile) {
          toast.success("המשוב נשמר!");
        }
      } catch {
        toast.error("שגיאה בשמירת המשוב");
      }
      setCompletionModal({ isOpen: false, taskId: "", taskTitle: "" });
    },
    [profile, completionModal.taskId]
  );

  const dismissCelebration = useCallback(() => {
    setCelebration((prev) => ({ ...prev, visible: false }));
    const msg = getRandomMessage("task_complete");
    setCoaching({ visible: true, message: msg.message, emoji: msg.emoji });
    setTimeout(() => setCoaching((prev) => ({ ...prev, visible: false })), 5000);
  }, []);

  const completionDates = useMemo(
    () => allCompletions.map((c) => c.completed_at),
    [allCompletions]
  );

  const bestStreak = useMemo(() => computeBestStreak(allCompletions), [allCompletions]);

  const categoryHealthData = useMemo(() => {
    const now = new Date();
    const categoriesWithData = new Set<string>();
    const latestByCategory: Record<string, Date> = {};
    for (const t of tasks) {
      categoriesWithData.add(t.category);
      if (t.completed) {
        const existing = latestByCategory[t.category];
        if (!existing || now > existing) latestByCategory[t.category] = now;
      }
    }
    return Object.entries(CATEGORY_INFO)
      .filter(([key]) => categoriesWithData.has(key) || key === "kitchen" || key === "bathroom" || key === "living")
      .map(([key, info]) => ({
        category: key,
        label: info.label,
        icon: info.icon,
        color: info.color,
        health: computeRoomHealth(latestByCategory[key] ?? null, "daily", now),
      }));
  }, [tasks]);

  const rewardsProgress = useMemo(
    () => computeRewardsProgress([], { user1Streak: streakCount, user2Streak: Math.max(streakCount - 2, 0) }, 0, [], todayStr),
    [streakCount, todayStr]
  );

  // Pull-to-refresh hint: track touch drag and trigger refresh on sufficient pull
  const pullStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const PULL_THRESHOLD = 70;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate when at the very top of the page
    if (window.scrollY <= 0) {
      pullStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling) return;
    const delta = Math.max(0, e.touches[0].clientY - pullStartY.current);
    setPullDistance(Math.min(delta, PULL_THRESHOLD * 1.5));
  }, [isPulling]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    setIsPulling(false);
    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(0);
      await refetchTasks();
      setIsRefreshing(false);
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, refetchTasks]);

  const handleClearCompleted = useCallback(() => {
    if (hasDbTasks) {
      // For DB tasks: recurring tasks auto-reset daily, so "clear" just refreshes
      refetchTasks();
      toast.success(t("dashboard.tasksAutoReset") || "המשימות מתאפסות אוטומטית כל יום 🔄");
    } else {
      // Mock mode: clear all completed
      setMockCompletedIds(new Set());
      toast.success(t("dashboard.clearedCompleted") || "סומנו כלא-הושלמו");
    }
  }, [hasDbTasks, refetchTasks, t]);

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div
      className="space-y-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Offline indicator */}
      <OfflineIndicator />

      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {(isPulling && pullDistance > 5) || isRefreshing ? (
          <motion.div
            key="ptr"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.15 }}
            className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none pt-2"
            aria-hidden
          >
            <div className="flex items-center gap-2 bg-surface/90 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-md border border-border/50 text-xs text-muted font-medium">
              <motion.span
                animate={isRefreshing ? { rotate: 360 } : { rotate: pullProgress * 180 }}
                transition={isRefreshing ? { duration: 0.7, repeat: Infinity, ease: "linear" } : { duration: 0 }}
              >
                ↻
              </motion.span>
              {isRefreshing ? "מרענן..." : pullProgress >= 1 ? "שחרר לרענון" : "משוך לרענון"}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <DashboardHeader
        displayName={displayName}
        greeting={greeting}
        subtitle={subtitle}
        hebrewDate={getHebrewDate()}
        avatarUrl={profile?.avatar_url}
        completedCount={completedCount}
        totalCount={filteredTasks.length}
      />

      {/* Content area with padding */}
      <div className="px-4 space-y-4 -mt-6">
        {seasonalMode.activeTemplate && (
          <PesachCountdownBanner
            daysUntilHoliday={seasonalMode.daysUntilHoliday}
            progress={seasonalMode.progress}
            onTap={() => setShowSeasonalModal(true)}
          />
        )}

        {/* ═══ SECTION 1: Quick Stats Bar ═══ */}
        <QuickStatsBar
          tasksCompleted={completedCount}
          tasksTotal={filteredTasks.length}
          streakDays={streakCount}
          totalPoints={completedCount * 10}
          rank={householdMembers.length > 1 ? 1 : 0}
        />

        {/* ═══ SECTION 2: Today's Tasks (limited to 5, expandable) ═══ */}
        <div className="relative">
          {tasksLoading ? (
            <TaskListSkeleton count={5} />
          ) : (
            <TodayOverview tasks={filteredTasks} onToggle={handleToggle} onClearCompleted={handleClearCompleted} maxItems={5} />
          )}
          <FeatureTooltip
            visible={showDashboardTip && !tasksLoading}
            text="הנה המשימות שלכם להיום. לחצו על V כשמסיימים!"
            onDismiss={dismissDashboardTip}
            position="below"
            className="left-0 right-auto"
          />
        </div>

        {/* ═══ SECTION 3: House Map — Room Progress ═══ */}
        <HouseMap
          tasks={(tasks ?? []).map((t: TaskItem) => ({ id: t.id, category_id: t.category ?? "", status: t.completed ? "completed" : "pending" }))}
          categories={Object.entries(CATEGORY_ICONS).map(([key, icon]) => ({ id: key, name: CATEGORY_LABELS[key] ?? key, icon: icon ?? "📦", color: CATEGORY_COLORS[key] ?? "#6366F1" }))}
        />

        {/* ═══ SECTION 4: Gamification Row (horizontal scroll) ═══ */}
        <GamificationRow
          streakDays={streakCount}
          streakTarget={streakCount < 7 ? 7 : streakCount < 14 ? 14 : streakCount < 30 ? 30 : 60}
          currentPoints={completedCount * 10}
          nextPrizeThreshold={50}
          nextPrizeName="גלידה לכולם"
          nextPrizeEmoji="🍦"
          challengeTitle={t("dashboard.achievementsSection") || "אתגר שבועי"}
          challengeProgress={Math.min(100, Math.round((completedCount / Math.max(filteredTasks.length, 1)) * 100))}
          challengeActive={true}
        />

        {/* ═══ SECTION 5: AI Coaching Tip ═══ */}
        <CoachingTips completedCount={completedCount} totalCount={filteredTasks.length} />

        {/* ═══ SECTION 6: Prize Card ═══ */}
        <PrizeCard currentPoints={completedCount * 10} />

        {/* ═══ SECTION 7: Mini Leaderboard — always visible when 2+ members ═══ */}
        {householdMembers.length > 1 && rankings.length > 0 && (
          <div className="card-elevated overflow-hidden">
            <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border/20">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🏆</span>
                <span className="text-sm font-bold text-foreground">{t("leaderboard.title")}</span>
              </div>
              <div className="flex gap-1">
                {(["day", "week", "alltime"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setLbPeriod(p)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                      lbPeriod === p
                        ? "bg-primary text-white"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {p === "day" ? t("scoreboard.daily") : p === "week" ? t("scoreboard.weekly") : t("scoreboard.allTime")}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-border/10">
              {rankings.slice(0, 3).map((entry) => {
                const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
                const isSelf = entry.member.id === profile?.id;
                const isFirst = entry.rank === 1;
                return (
                  <div
                    key={entry.member.id}
                    className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                      isSelf ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="w-6 text-center text-base flex-shrink-0">
                      {medals[entry.rank] ?? <span className="text-sm font-bold text-muted">{entry.rank}</span>}
                    </span>
                    {entry.member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.member.avatarUrl}
                        alt={entry.member.name}
                        className="w-8 h-8 rounded-full object-cover border-2 border-border/30 flex-shrink-0"
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${
                        isFirst ? "bg-amber-100 dark:bg-amber-900/30 border-amber-300/50 text-amber-700 dark:text-amber-400" : "bg-surface-hover border-border/30 text-muted"
                      }`}>
                        {entry.member.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground truncate">{entry.member.name}</span>
                        {isSelf && (
                          <span className="text-[9px] bg-primary/15 text-primary px-1 py-0.5 rounded-full flex-shrink-0">{t("leaderboard.you")}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted">{entry.completionCount} {t("leaderboard.completions")}</span>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <div className={`text-sm font-bold ${isFirst ? "text-amber-500" : isSelf ? "text-primary" : "text-foreground"}`}>
                        {entry.points}
                      </div>
                      <div className="text-[10px] text-muted">{t("leaderboard.pts")}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ SECTION 8: Activity Feed (inside gamification accordion) ═══ */}

        {/* ═══ SECTION 9: More Details (collapsible) ═══ */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-3 card-elevated text-sm font-medium text-foreground hover:bg-surface-hover transition-colors duration-150 active:scale-[0.99]"
          >
            <span>🎖️ {t("dashboard.achievementsSection")}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          {showAdvanced && (
            <div className="space-y-4 mt-2">
              <GoldenRuleSection percentage={percentage} target={target} loading={tasksLoading} />
              <StreakDisplay count={streakCount} bestCount={bestStreak} />
              <WeeklyChallenges progress={challengeProgress} weekNum={weekNum} />
              <div>
                <h3 className="font-semibold text-foreground px-1 mb-2 text-sm">
                  {t("activity.sectionTitle")}
                </h3>
                <ActivityFeed />
              </div>
            </div>
          )}
        </div>

        {/* ═══ SECTION 9: Quick Links (2x2 grid) ═══ */}
        <div className="grid grid-cols-2 gap-2">
          <Link href="/blog" className="card-elevated p-3 flex flex-col items-center gap-1.5 text-center hover:scale-[0.98] active:scale-[0.96] transition-transform">
            <span className="text-2xl">{"✍️"}</span>
            <span className="text-xs font-semibold text-foreground">{t("common.login") === "Login" ? "Blog" : "טיפים"}</span>
          </Link>
          <Link href="/tasks/print" className="card-elevated p-3 flex flex-col items-center gap-1.5 text-center hover:scale-[0.98] active:scale-[0.96] transition-transform">
            <span className="text-2xl">{"🖨️"}</span>
            <span className="text-xs font-semibold text-foreground">{t("print.button") || "הדפסה"}</span>
          </Link>
          <a href="/" className="card-elevated p-3 flex flex-col items-center gap-1.5 text-center hover:scale-[0.98] active:scale-[0.96] transition-transform bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20">
            <span className="text-2xl">{"🌐"}</span>
            <span className="text-xs font-semibold text-primary">{t("common.login") === "Login" ? "Our Site" : "דף הנחיתה"}</span>
          </a>
          <button onClick={() => setEmergencyMode((prev) => !prev)} className={`card-elevated p-3 flex flex-col items-center gap-1.5 text-center hover:scale-[0.98] active:scale-[0.96] transition-transform ${emergencyMode ? "ring-2 ring-red-500" : ""}`}>
            <span className="text-2xl">{"⚡"}</span>
            <span className="text-xs font-semibold text-foreground">{emergencyMode ? "🔴 חירום" : "חירום"}</span>
          </button>
        </div>
      </div>

      <CelebrationOverlay
        type={celebration.type}
        message={celebration.message}
        emoji={celebration.emoji}
        visible={celebration.visible}
        onDismiss={dismissCelebration}
      />

      <CoachingBubble
        visible={coaching.visible}
        message={coaching.message}
        emoji={coaching.emoji}
        onDismiss={() => setCoaching((prev) => ({ ...prev, visible: false }))}
      />

      <TaskCompletionModal
        taskTitle={completionModal.taskTitle}
        isOpen={completionModal.isOpen}
        onClose={() => setCompletionModal({ isOpen: false, taskId: "", taskTitle: "" })}
        onSubmit={handleCompletionFeedback}
      />

      {seasonalMode.activeTemplate && (
        <PesachActivationModal
          isOpen={showSeasonalModal}
          template={seasonalMode.activeTemplate}
          activation={seasonalMode.activation}
          members={profile ? [profile.id, ...(profile.partner_id ? [profile.partner_id] : [])] : []}
          householdId={profile?.household_id ?? null}
          userId={profile?.id ?? null}
          onClose={() => setShowSeasonalModal(false)}
          onActivate={seasonalMode.activate}
          onCreateTasks={seasonalMode.createTasks}
          onAddShopping={seasonalMode.addShoppingItems}
          onDeactivate={seasonalMode.deactivate}
        />
      )}

      {/* Conversational onboarding for new users */}
      <ConversationalOnboarding
        open={showTaskWizard}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </div>
  );
}
