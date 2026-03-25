"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { TodayOverview, type TaskItem } from "@/components/dashboard/today-overview";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { PartnerStatus } from "@/components/dashboard/partner-status";
import { EmergencyToggle } from "@/components/dashboard/emergency-toggle";
import { WeeklySummaryCards } from "@/components/dashboard/weekly-summary-cards";
import { RoomConditions } from "@/components/dashboard/room-conditions";
import { StreakTracker } from "@/components/gamification/streak-tracker";
import { WeeklyChallenge } from "@/components/gamification/weekly-challenge";
import { CoupleRewards } from "@/components/gamification/couple-rewards";
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
import { useNotifications } from "@/hooks/useNotifications";
import { usePartner } from "@/hooks/usePartner";
import { TaskListSkeleton } from "@/components/skeleton";
import { toast } from "sonner";
import { CATEGORY_NAME_TO_KEY, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/categories";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { GoldenRuleSection } from "@/components/dashboard/golden-rule-section";
import { PlaylistCard } from "@/components/dashboard/playlist-card";
import { EnergyModeSection } from "@/components/dashboard/energy-mode-section";
import { CoachingInsight } from "@/components/dashboard/coaching-insight";
import { CoachingTips } from "@/components/dashboard/coaching-tips";
import { PesachCountdownBanner } from "@/components/seasonal/pesach-countdown-banner";
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
  // ---- Supabase hooks ----
  const { profile } = useProfile();
  const { tasks: dbTasks, loading: tasksLoading, refetch: refetchTasks } = useTasks({
    realtime: true,
  });
  const { completions: allCompletions, markComplete, isCompletedToday } = useCompletions({ limit: 500 });
  const { categoryMap } = useCategories();
  const { playComplete, playAchievement, playStreak } = useAppSounds();
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismiss } = useNotifications();
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { partner } = usePartner(profile?.partner_id, todayStr);
  const { household } = useHousehold(profile?.household_id ?? null);
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

  return (
    <div className="space-y-4">
      <DashboardHeader
        displayName={displayName}
        greeting={greeting}
        subtitle={subtitle}
        hebrewDate={getHebrewDate()}
        avatarUrl={profile?.avatar_url}
        completedCount={completedCount}
        totalCount={filteredTasks.length}
        notifications={notifications}
        unreadCount={unreadCount}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        dismiss={dismiss}
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

        <EnergyModeSection
          energyLevel={energyLevel}
          onToggle={cycleEnergyLevel}
          filteredCount={filteredTasks.length}
          totalCount={tasks.length}
        />

        {tasksLoading ? (
          <TaskListSkeleton count={5} />
        ) : (
          <TodayOverview tasks={filteredTasks} onToggle={handleToggle} />
        )}

        {/* Collapsible gamification section */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-3 card-elevated text-sm font-medium text-foreground"
          >
            <span>🏆 {t("dashboard.achievementsSection")}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          {showAdvanced && (
            <div className="space-y-4 mt-2">
              <GoldenRuleSection percentage={percentage} target={target} loading={tasksLoading} />

              <StreakDisplay count={streakCount} bestCount={bestStreak} />

              <StreakTracker
                completionDates={completionDates}
                today={todayStr}
                bestStreak={bestStreak}
              />

              <WeeklyChallenge
                completionDates={completionDates}
                today={todayStr}
                target={5}
              />

              <CoupleRewards rewardsProgress={rewardsProgress} />
            </div>
          )}
        </div>

        <PlaylistCard />

        <WeeklySummaryCards
          tasks={dbTasks}
          completions={allCompletions}
          streak={streakCount}
          today={todayStr}
        />

        <RoomConditions categoryHealthData={categoryHealthData} />

        {profile?.partner_id && (
          <div>
            <h2 className="font-semibold text-foreground px-1 mb-2">{partner.name}</h2>
            <PartnerStatus
              name={partner.name}
              completedCount={partner.completedCount}
              totalCount={partner.totalCount}
              recentTasks={partner.recentTasks}
            />
          </div>
        )}

        <CoachingTips completedCount={completedCount} totalCount={filteredTasks.length} />

        <CoachingInsight />

        <EmergencyToggle
          active={emergencyMode}
          onToggle={() => setEmergencyMode((prev) => !prev)}
        />
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
