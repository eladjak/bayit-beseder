"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { JoyCompletion, isConfirmedCompletion } from "@/components/joy-completion";
import { TodayOverview, type TaskItem } from "@/components/dashboard/today-overview";
import { StreakDisplay } from "@/components/dashboard/streak-display";
// Moved to settings/weekly: EmergencyToggle (in quick links), WeeklySummaryCards, RoomConditions
// These are inside the collapsible achievements accordion — lazy-load them
const WeeklyChallenges = dynamic(() => import("@/components/gamification/weekly-challenges").then(m => ({ default: m.WeeklyChallenges })), { ssr: false });
const ActivityFeed = dynamic(() => import("@/components/dashboard/activity-feed").then(m => ({ default: m.ActivityFeed })), { ssr: false });
const HouseMap = dynamic(() => import("@/components/dashboard/house-map").then(m => ({ default: m.HouseMap })), { ssr: false });
const PrizeCard = dynamic(() => import("@/components/prizes/prize-card").then(m => ({ default: m.PrizeCard })), { ssr: false });
import { getRandomMessage } from "@/lib/coaching-messages";
import { computeBestStreak } from "@/lib/task-stats";
import { filterTasksByEnergy } from "@/lib/energy-filter";
import type { EnergyLevel } from "@/lib/energy-filter";
import { useProfile } from "@/hooks/useProfile";
import { useTasks } from "@/hooks/useTasks";
import { isRecurring } from "@/lib/task-flags";
import { useCompletions } from "@/hooks/useCompletions";
import { useCategories } from "@/hooks/useCategories";
import { useAppSounds } from "@/hooks/useAppSound";

import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { useWeeklyChallenges } from "@/hooks/useWeeklyChallenges";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { TaskListSkeleton } from "@/components/skeleton";
import { toast } from "sonner";
import { CATEGORY_NAME_TO_KEY, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/categories";
import { FairnessBalanceMeter } from "@/components/dashboard/fairness-balance-meter";
import { GoldenRuleSection } from "@/components/dashboard/golden-rule-section";
import { EnergyModeSection } from "@/components/dashboard/energy-mode-section";
import { CoachingTips } from "@/components/dashboard/coaching-tips";
const PesachCountdownBanner = dynamic(() => import("@/components/seasonal/pesach-countdown-banner").then(m => ({ default: m.PesachCountdownBanner })), { ssr: false });
import { useSeasonalMode } from "@/hooks/useSeasonalMode";
import { useTranslation } from "@/hooks/useTranslation";

// Lazy-load components that aren't always visible (modals, overlays, coaching)
const CelebrationOverlay = dynamic(() => import("@/components/gamification/celebration-overlay").then(m => ({ default: m.CelebrationOverlay })), { ssr: false });
const CoachingBubble = dynamic(() => import("@/components/gamification/coaching-bubble").then(m => ({ default: m.CoachingBubble })), { ssr: false });
const TaskCompletionModal = dynamic(() => import("@/components/task-completion-modal").then(m => ({ default: m.TaskCompletionModal })), { ssr: false });
const PesachActivationModal = dynamic(() => import("@/components/seasonal/pesach-activation-modal").then(m => ({ default: m.PesachActivationModal })), { ssr: false });
const ConversationalOnboarding = dynamic(() => import("@/components/onboarding/conversational-onboarding").then(m => ({ default: m.ConversationalOnboarding })), { ssr: false });
import { useHousehold, normalizeHouseholdCity } from "@/hooks/useHousehold";
import { OfflineIndicator } from "@/components/offline-indicator";
import { pushAssistantReaction } from "@/lib/assistant-reactions";
import { ilToday } from "@/lib/il-date";

function getHebrewDate(locale: "he" | "en"): string {
  return new Date().toLocaleDateString(locale === "en" ? "en-US" : "he-IL", {
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
  "מאוחר אבל הבית לא שופט",
  "לילה טוב — מחר מתחילים מחדש",
  "שינה טובה מגיעה למי שסידר היום",
];

function pickSubtitle(arr: string[]): string {
  return arr[new Date().getDate() % arr.length];
}

function getTimeGreeting(name: string): { greeting: string; subtitle: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { greeting: `לילה טוב, ${name}`, subtitle: pickSubtitle(NIGHT_SUBTITLES) };
  if (hour < 12) return { greeting: `בוקר טוב, ${name}!`, subtitle: pickSubtitle(MORNING_SUBTITLES) };
  if (hour < 17) return { greeting: `צהריים טובים, ${name}`, subtitle: pickSubtitle(AFTERNOON_SUBTITLES) };
  if (hour < 21) return { greeting: `ערב טוב, ${name}`, subtitle: pickSubtitle(EVENING_SUBTITLES) };
  return { greeting: `לילה טוב, ${name}`, subtitle: pickSubtitle(NIGHT_SUBTITLES) };
}

export default function DashboardPage() {
  const { t, locale } = useTranslation();
  // ---- Supabase hooks ----
  const { profile } = useProfile();
  const { tasks: dbTasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks } = useTasks({
    realtime: true,
  });
  const { completions: allCompletions, markComplete, isCompletedToday } = useCompletions({ limit: 500 });
  const { categoryMap } = useCategories();
  const { playComplete } = useAppSounds();
  const todayStr = useMemo(() => ilToday(), []);
  const { updateHousehold } = useHousehold(profile?.household_id ?? null);
  // N-member support: prefer household_members table; falls back to partner_id
  const { members: householdMembers } = useHouseholdMembers(
    profile?.household_id ?? null,
    todayStr
  );
  // Members other than the current user (for the "household activity" section)

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
    if (seedAttempted.current || tasksLoading || tasksError || !profile) return;
    // Show onboarding if no tasks exist AND onboarding not yet done
    const onboardingDone = localStorage.getItem("bayit-beseder-onboarding-done");
    if (dbTasks.length > 0 || onboardingDone) return;
    seedAttempted.current = true;
    setShowTaskWizard(true);
  }, [tasksLoading, tasksError, dbTasks.length, profile]);

  const handleOnboardingComplete = useCallback(
    async (result: { homeName: string; homeCity?: string; tasks: { title: string; category: string; estimatedMinutes: number; recurring: boolean; frequency: string }[] }) => {
      setShowTaskWizard(false);
      if (!profile) return;
      // Save home name to localStorage
      if (result.homeName) {
        localStorage.setItem("bayit-beseder-home-name", result.homeName);
      }
      // Persist the optional city to the household record (best-effort; the
      // wizard flow does not block on this and never surfaces its own error —
      // the household settings page remains the authoritative place to fix it).
      if (result.homeCity && profile.household_id) {
        const normalizedCity = normalizeHouseholdCity(result.homeCity);
        if (normalizedCity) {
          void updateHousehold({ city: normalizedCity });
        }
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
    [profile, refetchTasks, updateHousehold]
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

  // An authenticated member of a household always sees their REAL list — even
  // when that list is empty. MOCK_TASKS is now strictly the logged-out demo.
  //
  // WHY — previously this was `dbTasks.length > 0`, so a household with no tasks
  // was shown 8 fabricated chores with working checkboxes that wrote to
  // localStorage instead of the database. A brand-new home's first screen was
  // therefore a list of chores nobody had ever added, and ticking them was theatre.

  const dbTaskItems: TaskItem[] = useMemo(
    () =>
      dbTasks.map((t) => {
        const categoryName = t.category_id ? categoryMap[t.category_id] : null;
        const categoryKey = categoryName
          ? (CATEGORY_NAME_TO_KEY[categoryName] ?? "general")
          : "general";
        // Recurring tasks: check today's completions for daily reset.
        // One-time tasks: use permanent status.
        const completed = isCompletedToday(t.id) || (!isRecurring(t.recurring) && t.status === "completed");
        return {
          id: t.id,
          title: t.title,
          category: categoryKey,
          estimated_minutes: 0,
          completed,
          points: t.points ?? 0,
          assigned_to: t.assigned_to,
        };
      }),
    [dbTasks, categoryMap, isCompletedToday]
  );

  const tasks = dbTaskItems;

  const [emergencyMode, setEmergencyMode] = useState(false);
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

  const [joyConfirmation, setJoyConfirmation] = useState(0);
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

  const streakCount = profile?.streak ?? 0;
  const displayName = profile?.name ?? "שלום";
  const { greeting } = getTimeGreeting(displayName);
  const remainingTasks = tasks.filter(task => !task.completed);

  const handleToggle = useCallback(async (taskId: string) => {
    const task = dbTasks.find((item) => item.id === taskId);
    if (!profile || !task || (isRecurring(task.recurring) ? isCompletedToday(taskId) : task.status === "completed")) {
      throw new Error("Task cannot be completed");
    }
    const result = await markComplete({ taskId, userId: profile.id, recurring: isRecurring(task.recurring) });
    if (result === null) {
      toast.error("לא ניתן לסמן את המשימה כהושלמה. כדאי לנסות שוב.");
      throw new Error("Task completion failed");
    }
    if (result.id.startsWith("offline-")) {
      toast.success("הסימון נשמר לשליחה כשהחיבור יחזור");
    } else {
      if (isConfirmedCompletion(result)) setJoyConfirmation(Date.now());
      toast.success("המשימה סומנה כהושלמה", { icon: <Image src="/illustrations/tasks-done.jpg" alt="" width={40} height={40} className="rounded-lg" />, action: { label: "הוספת משוב", onClick: () => setCompletionModal({ isOpen: true, taskId, taskTitle: task.title }) } });
    }
    playComplete();
    if (!result.id.startsWith("offline-")) void refetchTasks();
  }, [profile, dbTasks, isCompletedToday, markComplete, playComplete, refetchTasks]);

  const handleCompletionFeedback = useCallback(
    async (feedback: { rating: number; notes: string; photoFile: File | null }): Promise<boolean> => {
      if (!profile) return false;
      try {
        const supabase = (await import("@/lib/supabase")).createClient();
        const updates: Record<string, unknown> = {};
        if (feedback.notes) updates.notes = feedback.notes;
        if (feedback.photoFile) {
          const { uploadTaskPhoto } = await import("@/lib/storage");
          const photoResult = await uploadTaskPhoto(profile.id, completionModal.taskId, feedback.photoFile);
          if ("error" in photoResult) {
            toast.error(photoResult.error);
            return false;
          }
          updates.photo_url = photoResult.url;
        }
        if (Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from("task_completions")
            .update(updates)
            .eq("task_id", completionModal.taskId)
            .eq("user_id", profile.id);
          if (error) {
            toast.error("שגיאה בשמירת המשוב");
            return false;
          }
        }
        if (feedback.rating > 0) {
          const ratings = JSON.parse(localStorage.getItem("bayit-task-ratings") ?? "{}");
          ratings[completionModal.taskId] = { rating: feedback.rating, date: new Date().toISOString() };
          localStorage.setItem("bayit-task-ratings", JSON.stringify(ratings));
        }
        if (feedback.rating > 0 || feedback.notes || feedback.photoFile) {
          toast.success("המשוב נשמר!");
        }
        setCompletionModal({ isOpen: false, taskId: "", taskTitle: "" });
        return true;
      } catch {
        toast.error("שגיאה בשמירת המשוב");
        return false;
      }
    },
    [profile, completionModal.taskId]
  );

  const dismissCelebration = useCallback(() => {
    setCelebration((prev) => ({ ...prev, visible: false }));
    const msg = getRandomMessage("task_complete");
    setCoaching({ visible: true, message: msg.message, emoji: msg.emoji });
    setTimeout(() => setCoaching((prev) => ({ ...prev, visible: false })), 5000);
    // Also broadcast it app-wide through the assistant-reactions store (see
    // src/lib/assistant-reactions.ts) so the floating assistant bubble in
    // the app shell can react to it on any screen, not just here — this
    // in-page coaching bubble above is unchanged and still shows locally.
    pushAssistantReaction(msg.message, msg.emoji);
  }, []);

  const bestStreak = useMemo(() => computeBestStreak(allCompletions), [allCompletions]);

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

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div
      className="space-y-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <JoyCompletion confirmation={joyConfirmation} message={locale === "en" ? "Nicely done!" : "כל הכבוד, עוד צעד לבית נעים!"} />
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

      {/* Conversational onboarding for new users */}
      <ConversationalOnboarding
        open={showTaskWizard}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />

      <header data-joy-restore="today" className="flex items-center justify-between gap-4 px-4 pt-6 sm:px-6">
        <div>
        <p className="text-sm font-semibold text-primary">{getHebrewDate(locale)}</p>
        <h1 className="mt-2 text-3xl font-bold">{locale === "en" ? `Hello, ${displayName}` : greeting}</h1>
        <p className="mt-2 text-muted">{locale === "en" ? "Make space for what matters, one step at a time." : "נעשה מקום למה שחשוב, צעד אחד בכל פעם."}</p>
        </div>
        <Image src="/illustrations/mascot-home.jpg" alt="" width={96} height={96} className="h-20 w-20 shrink-0 rounded-2xl object-cover sm:h-24 sm:w-24" />
      </header>
      <div className="space-y-4 px-4 sm:px-6">
        {seasonalMode.activeTemplate && <PesachCountdownBanner daysUntilHoliday={seasonalMode.daysUntilHoliday} progress={seasonalMode.progress} onTap={() => setShowSeasonalModal(true)} />}
        <section aria-label="הצעד הבא" className="joy-surface joy-surface-honey rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-bold">{locale === "en" ? "Your next step" : "הצעד הבא שלך"}</h2>
          <p className="mb-4 mt-1 text-sm text-muted">{locale === "en" ? "The most recently added open task in your household list." : "המשימה הפתוחה שנוספה לאחרונה לרשימת הבית."}</p>
          {tasksLoading ? <TaskListSkeleton count={1} /> : tasksError ? <div role="alert"><p>{locale === "en" ? "We could not load your tasks. Check your connection and try again." : "לא הצלחנו לטעון את המשימות. כדאי לבדוק את החיבור ולנסות שוב."}</p><button type="button" onClick={() => refetchTasks()} className="min-h-11 font-semibold text-primary">{locale === "en" ? "Try again" : "ניסיון נוסף"}</button></div> : remainingTasks.length ? <TodayOverview tasks={remainingTasks.slice(0, 1)} onToggle={handleToggle} single /> : <div data-joy-restore="empty" className="flex items-center gap-4 rounded-xl bg-surface p-4"><Image src="/illustrations/empty-tasks.jpg" alt="" width={88} height={88} className="h-20 w-20 shrink-0 rounded-xl object-cover" /><p className="text-muted">{locale === "en" ? "There are no open tasks in the list right now." : "אין כרגע משימות פתוחות ברשימה."}</p></div>}
          {!tasksLoading && !tasksError && <Link href="/tasks" className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary">{locale === "en" ? `${remainingTasks.length} tasks remaining · All tasks →` : `${remainingTasks.length} משימות נותרו · לכל המשימות ←`}</Link>}
        </section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/meals" className="joy-surface joy-surface-peach rounded-2xl p-5 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-primary"><Image src="/illustrations/weekly-plan.jpg" alt="" width={64} height={64} className="float-end ms-3 h-16 w-16 rounded-xl object-cover" /><h2 className="text-lg font-bold">{locale === "en" ? "What are we eating?" : "מה אוכלים?"}</h2><p className="mt-2 text-sm text-muted">{locale === "en" ? "Meal planning and ideas in one place." : "תכנון הארוחות והרעיונות של הבית במקום אחד."}</p><span className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary">{locale === "en" ? "Meal plan →" : "לתוכנית הארוחות ←"}</span></Link>
          <Link href="/shopping" className="joy-surface joy-surface-mint rounded-2xl p-5 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-primary"><Image src="/illustrations/shopping-food.jpg" alt="" width={64} height={64} className="float-end ms-3 h-16 w-16 rounded-xl object-cover" /><h2 className="text-lg font-bold">{locale === "en" ? "Shopping list" : "רשימת הקניות"}</h2><p className="mt-2 text-sm text-muted">{locale === "en" ? "Everything you need to buy, in a shared list." : "כל מה שצריך לקנות, ברשימה משותפת."}</p><span className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary">{locale === "en" ? "Open list →" : "לרשימה ←"}</span></Link>
        </div>
        <details className="rounded-2xl border border-border bg-surface p-4"><summary className="flex min-h-11 cursor-pointer items-center font-bold focus-visible:outline-2 focus-visible:outline-primary">{locale === "en" ? "How home is going" : "איך הבית מתקדם"}</summary>
        <div className="space-y-4 pt-3">
        {!tasksLoading && !tasksError && tasks.length === 0 && <p className="text-sm text-muted">כשתוסיפו משימות ותשלימו אותן, אפשר יהיה לראות כאן את התקדמות הבית.</p>}
        <button type="button" aria-pressed={emergencyMode} onClick={() => setEmergencyMode(value => !value)} className="min-h-11 rounded-xl border border-border px-3 text-sm font-semibold">{emergencyMode ? "יעד חירום פעיל" : "הפעלת יעד חירום"}</button>
        <EnergyModeSection energyLevel={energyLevel} onToggle={cycleEnergyLevel} filteredCount={filteredTasks.length} totalCount={tasks.length} />
        {tasks.length > 0 && <PrizeCard currentPoints={rankings.find(entry => entry.member.id === profile?.id)?.points ?? 0} />}

        {tasks.length > 0 && <>
        {/* ═══ SECTION 2.5: Fairness Balance Meter (the painkiller — council #1) ═══ */}
        <FairnessBalanceMeter
          completions={allCompletions}
          members={householdMembers.map((m) => ({ id: m.id, name: m.name }))}
          today={todayStr}
        />

        {/* ═══ SECTION 3: House Map — Room Progress ═══ */}
        <HouseMap
          tasks={(tasks ?? []).map((t: TaskItem) => ({ id: t.id, category_id: t.category ?? "", status: t.completed ? "completed" : "pending" }))}
          categories={Object.entries(CATEGORY_ICONS).map(([key, icon]) => ({ id: key, name: CATEGORY_LABELS[key] ?? key, icon: icon ?? "📦", color: CATEGORY_COLORS[key] ?? "#6366F1" }))}
        />

        <CoachingTips completedCount={completedCount} totalCount={filteredTasks.length} />
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

        <GoldenRuleSection percentage={percentage} target={target} loading={tasksLoading} />
        <StreakDisplay count={streakCount} bestCount={bestStreak} />
        <WeeklyChallenges progress={challengeProgress} weekNum={weekNum} />
        <div><h3 className="mb-2 px-1 text-sm font-semibold">{t("activity.sectionTitle")}</h3><ActivityFeed /></div>
        </>}

        </div></details>
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

    </div>
  );
}
