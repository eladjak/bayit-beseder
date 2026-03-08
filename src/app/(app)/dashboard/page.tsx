"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { GoldenRuleRing } from "@/components/dashboard/golden-rule-ring";
import { TodayOverview, type TaskItem } from "@/components/dashboard/today-overview";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { PartnerStatus } from "@/components/dashboard/partner-status";
import { EmergencyToggle } from "@/components/dashboard/emergency-toggle";
import { WeeklySummaryCards } from "@/components/dashboard/weekly-summary-cards";
import { RoomConditions } from "@/components/dashboard/room-conditions";
import { CelebrationOverlay } from "@/components/gamification/celebration-overlay";
import { CoachingBubble } from "@/components/gamification/coaching-bubble";
import { StreakTracker } from "@/components/gamification/streak-tracker";
import { WeeklyChallenge } from "@/components/gamification/weekly-challenge";
import { CoupleRewards } from "@/components/gamification/couple-rewards";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { EnergyModeToggle } from "@/components/dashboard/energy-mode-toggle";
import { getRandomMessage } from "@/lib/coaching-messages";
import { computeRoomHealth, getHealthColor } from "@/lib/room-health";
import { computeRewardsProgress } from "@/lib/rewards";
import { filterTasksByEnergy, getEnergyDescription } from "@/lib/energy-filter";
import type { EnergyLevel } from "@/lib/energy-filter";
import { useProfile } from "@/hooks/useProfile";
import { useTasks } from "@/hooks/useTasks";
import { useCompletions } from "@/hooks/useCompletions";
import { useCategories } from "@/hooks/useCategories";
import { useAppSounds } from "@/hooks/useAppSound";
import { useNotifications } from "@/hooks/useNotifications";
import { usePartner } from "@/hooks/usePartner";
import { TaskCompletionModal } from "@/components/task-completion-modal";
import { TaskListSkeleton } from "@/components/skeleton";
import { RingSkeleton } from "@/components/skeleton";
import { toast } from "sonner";

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

// Map Hebrew category names to internal category keys for color/label lookups
const CATEGORY_NAME_TO_KEY: Record<string, string> = {
  "מטבח": "kitchen",
  "אמבטיה": "bathroom",
  "סלון": "living",
  "חדר שינה": "bedroom",
  "כביסה": "laundry",
  "חוץ": "outdoor",
  "חיות מחמד": "pets",
  "כללי": "general",
};

function getHebrewDate(): string {
  return new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getTimeGreeting(name: string): { greeting: string; subtitle: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { greeting: `לילה טוב, ${name}`, subtitle: "מנוחה טובה מגיעה לכם" };
  if (hour < 12) return { greeting: `בוקר טוב, ${name}!`, subtitle: "בואו נתחיל את היום" };
  if (hour < 17) return { greeting: `צהריים טובים, ${name}`, subtitle: "איך הולך היום?" };
  if (hour < 21) return { greeting: `ערב טוב, ${name}`, subtitle: "בואו נסכם את היום" };
  return { greeting: `לילה טוב, ${name}`, subtitle: "יום מצוין מאחוריכם" };
}

export default function DashboardPage() {
  // ---- Supabase hooks ----
  const { profile } = useProfile();
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { tasks: dbTasks, loading: tasksLoading, refetch: refetchTodayTasks } = useTasks({
    dueDate: todayStr,
    realtime: true,
  });
  // Fetch all tasks (no date filter) for summary cards
  const { tasks: allDbTasks, refetch: refetchAllTasks } = useTasks({});
  const { completions: allCompletions, markComplete } = useCompletions({ limit: 200 });
  const { categoryMap } = useCategories();
  const { playComplete, playAchievement, playStreak } = useAppSounds();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
  } = useNotifications();
  const { partner } = usePartner(profile?.partner_id, todayStr);

  // ---- Auto-seed tasks for authenticated users on first visit ----
  const seedAttempted = useRef(false);
  useEffect(() => {
    if (seedAttempted.current || tasksLoading || dbTasks.length > 0 || !profile) return;
    seedAttempted.current = true;

    fetch("/api/seed", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.seeded) {
          refetchTodayTasks();
          refetchAllTasks();
        }
      })
      .catch(() => {
        // Seed failed - will use mock data fallback
      });
  }, [tasksLoading, dbTasks.length, profile, refetchTodayTasks, refetchAllTasks]);

  // ---- Determine if we should use DB data or mock ----
  const hasDbTasks = !tasksLoading && dbTasks.length > 0;

  // Convert DB tasks to TaskItem shape for TodayOverview
  const dbTaskItems: TaskItem[] = useMemo(
    () =>
      dbTasks.map((t) => {
        // Resolve category name from category_id using the categories table
        const categoryName = t.category_id ? categoryMap[t.category_id] : null;
        const categoryKey = categoryName
          ? (CATEGORY_NAME_TO_KEY[categoryName] ?? "general")
          : "general";

        return {
          id: t.id,
          title: t.title,
          category: categoryKey,
          estimated_minutes: 10,
          completed: t.status === "completed",
        };
      }),
    [dbTasks, categoryMap]
  );

  // ---- Local state for mock tasks (fallback mode) ----
  const [mockTasks, setMockTasks] = useState(MOCK_TASKS);

  // Load completed task IDs from localStorage for mock mode
  const [mockCompletedIds, setMockCompletedIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("bayit-completed-tasks");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });

  // Sync mockCompletedIds to localStorage
  useEffect(() => {
    if (!hasDbTasks) {
      localStorage.setItem("bayit-completed-tasks", JSON.stringify([...mockCompletedIds]));
    }
  }, [mockCompletedIds, hasDbTasks]);

  // The actual tasks list shown in the UI (apply mock completed state)
  const tasks = hasDbTasks
    ? dbTaskItems
    : mockTasks.map(t => ({ ...t, completed: mockCompletedIds.has(t.id) }));

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
  // Task completion feedback modal
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

  // Apply energy filter to tasks
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
      // If using DB tasks, update via Supabase
      if (hasDbTasks && profile) {
        const task = dbTasks.find((t) => t.id === taskId);
        if (task && task.status !== "completed") {
          // Call markComplete and await the result
          const result = await markComplete({ taskId, userId: profile.id });

          if (result === null) {
            toast.error("לא ניתן לסמן את המשימה כהושלמה. נסה שוב.");
            return;
          }

          // Show completion feedback modal
          setCompletionModal({ isOpen: true, taskId, taskTitle: task.title });

          // Trigger celebration
          const msg = getRandomMessage("task_complete");
          setCelebration({
            visible: true,
            type: "task",
            message: msg.message,
            emoji: msg.emoji,
          });
          playComplete();
        }
        return;
      }

      // Fallback: local mock toggle with localStorage persistence
      const isCurrentlyCompleted = mockCompletedIds.has(taskId);
      const newCompletedIds = new Set(mockCompletedIds);

      if (isCurrentlyCompleted) {
        newCompletedIds.delete(taskId);
      } else {
        newCompletedIds.add(taskId);
      }

      setMockCompletedIds(newCompletedIds);

      // Calculate completion stats
      const newCompleted = newCompletedIds.size;
      const newPct = Math.round((newCompleted / mockTasks.length) * 100);
      const wasCompleting = !isCurrentlyCompleted;

      if (wasCompleting) {
        if (newCompleted === mockTasks.length) {
          const msg = getRandomMessage("all_daily_done");
          setCelebration({
            visible: true,
            type: "all_daily",
            message: msg.message,
            emoji: msg.emoji,
          });
          playAchievement();
        } else if (newPct >= target && newPct - Math.round(((newCompleted - 1) / mockTasks.length) * 100) > 0) {
          const prevPct = Math.round(((newCompleted - 1) / mockTasks.length) * 100);
          if (prevPct < target) {
            const msg = getRandomMessage("golden_rule_hit");
            setCelebration({
              visible: true,
              type: "golden_rule",
              message: msg.message,
              emoji: msg.emoji,
            });
            playStreak();
          } else {
            const msg = getRandomMessage("task_complete");
            setCelebration({
              visible: true,
              type: "task",
              message: msg.message,
              emoji: msg.emoji,
            });
            playComplete();
          }
        } else {
          const msg = getRandomMessage("task_complete");
          setCelebration({
            visible: true,
            type: "task",
            message: msg.message,
            emoji: msg.emoji,
          });
          playComplete();
        }
      }
    },
    [target, hasDbTasks, profile, dbTasks, markComplete, playComplete, playAchievement, playStreak, mockCompletedIds, mockTasks.length]
  );

  // Handle task completion feedback submission
  const handleCompletionFeedback = useCallback(
    async (feedback: { rating: number; notes: string; photoFile: File | null }) => {
      if (!profile) return;

      try {
        const supabase = (await import("@/lib/supabase")).createClient();

        // Save rating/notes to the task completion record
        const updates: Record<string, unknown> = {};
        if (feedback.notes) updates.notes = feedback.notes;

        // Upload photo if provided
        if (feedback.photoFile) {
          const { uploadTaskPhoto } = await import("@/lib/storage");
          const photoResult = await uploadTaskPhoto(profile.id, completionModal.taskId, feedback.photoFile);
          if ("url" in photoResult) {
            updates.photo_url = photoResult.url;
          }
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from("task_completions")
            .update(updates)
            .eq("task_id", completionModal.taskId)
            .eq("completed_by", profile.id);
        }

        // Save rating to task (if we have one)
        if (feedback.rating > 0) {
          // Store rating in localStorage as a simple approach
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
    setTimeout(() => setCoaching((prev) => ({ ...prev, visible: false })), 3000);
  }, []);

  // Build completion dates array for streak tracker + weekly challenge
  const completionDates = useMemo(
    () => allCompletions.map((c) => c.completed_at),
    [allCompletions]
  );

  // Room conditions - compute health per category from task completions
  const CATEGORY_INFO: Record<string, { label: string; icon: string; color: string }> = {
    kitchen: { label: "מטבח", icon: "🍽️", color: "#F59E0B" },
    bathroom: { label: "אמבטיה", icon: "🚿", color: "#3B82F6" },
    living: { label: "סלון", icon: "🛋️", color: "#8B5CF6" },
    bedroom: { label: "חדר שינה", icon: "🛏️", color: "#EC4899" },
    laundry: { label: "כביסה", icon: "👕", color: "#06B6D4" },
    outdoor: { label: "חוץ", icon: "🌿", color: "#84CC16" },
    pets: { label: "חיות מחמד", icon: "🐱", color: "#F97316" },
    general: { label: "כללי", icon: "🏠", color: "#10B981" },
  };

  const categoryHealthData = useMemo(() => {
    // Compute health for each category based on completed tasks
    const now = new Date();
    const categoriesWithData = new Set<string>();
    const latestByCategory: Record<string, Date> = {};

    // Find latest completion per category from tasks
    for (const t of tasks) {
      categoriesWithData.add(t.category);
      if (t.completed) {
        const existing = latestByCategory[t.category];
        if (!existing || now > existing) {
          latestByCategory[t.category] = now;
        }
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

  // Couple rewards progress
  const rewardsProgress = useMemo(
    () => computeRewardsProgress([], { user1Streak: streakCount, user2Streak: Math.max(streakCount - 2, 0) }, 0, [], todayStr),
    [streakCount, todayStr]
  );

  return (
    <div className="space-y-5">
      {/* Header - Gradient hero area */}
      <div className="relative gradient-hero rounded-b-3xl px-4 pt-6 pb-8 -mx-0">
        {/* Notification bell - positioned top-left (RTL: visually top-right) */}
        <div className="absolute top-4 left-4">
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            markAsRead={markAsRead}
            markAllAsRead={markAllAsRead}
            dismiss={dismiss}
          />
        </div>
        <div className="text-center">
          {/* User avatar in header */}
          {profile?.avatar_url && (
            <div className="flex justify-center mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-12 h-12 rounded-full border-2 border-white/30 object-cover"
              />
            </div>
          )}
          <h1 className="text-xl font-bold text-white">{greeting}</h1>
          <p className="text-sm text-white/70">{getHebrewDate()}</p>
          {filteredTasks.length > 0 && (
            <p className="text-xs text-white/60 mt-1">
              {completedCount === filteredTasks.length
                ? "יום מושלם! סיימתם הכל ביחד"
                : completedCount > 0
                  ? `ביחד סיימתם ${completedCount} מתוך ${filteredTasks.length} משימות`
                  : subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Content area with padding */}
      <div className="px-4 space-y-5 -mt-4">
        {/* Golden Rule Ring - overlapping the header */}
        <div className="flex justify-center card-elevated p-5 -mt-2">
          {tasksLoading ? (
            <RingSkeleton />
          ) : (
            <GoldenRuleRing percentage={percentage} target={target} />
          )}
        </div>

        {/* Streak */}
        <StreakDisplay count={streakCount} bestCount={12} />

        {/* Streak Tracker - consecutive day tracking */}
        <StreakTracker
          completionDates={completionDates}
          today={todayStr}
          bestStreak={12}
        />

        {/* Weekly Challenge */}
        <WeeklyChallenge
          completionDates={completionDates}
          today={todayStr}
          target={5}
        />

        {/* Energy Mode Toggle */}
        <div className="flex items-center justify-between">
          <EnergyModeToggle energyLevel={energyLevel} onToggle={cycleEnergyLevel} />
          {energyLevel !== "all" && (
            <span className="text-[11px] text-muted">
              {filteredTasks.length} מתוך {tasks.length} משימות
            </span>
          )}
        </div>

        {/* Today's Tasks */}
        {tasksLoading ? (
          <TaskListSkeleton count={5} />
        ) : (
          <TodayOverview tasks={filteredTasks} onToggle={handleToggle} />
        )}

        {/* Playlist Quick Action */}
        <Link
          href="/playlists"
          className="card-elevated flex items-center gap-3 px-4 py-3 active:scale-[0.98] transition-transform"
        >
          <span className="text-2xl">🎵</span>
          <div className="flex-1 text-right">
            <p className="font-semibold text-foreground text-sm">פלייליסטים</p>
            <p className="text-xs text-muted">שגרות ניקיון מודרכות עם טיימר</p>
          </div>
          <span className="text-muted text-xs">←</span>
        </Link>

        {/* Weekly Summary Cards */}
        <WeeklySummaryCards
          tasks={allDbTasks}
          completions={allCompletions}
          streak={streakCount}
          today={todayStr}
        />

        {/* Room Conditions */}
        <RoomConditions categoryHealthData={categoryHealthData} />

        {/* Partner Status */}
        <div>
          <h2 className="font-semibold text-foreground px-1 mb-2">ענבל</h2>
          <PartnerStatus
            name="ענבל"
            completedCount={3}
            totalCount={8}
            recentTasks={[
              "החלפת מצעים",
              "כביסה",
              "ניקוי כיור אמבטיה",
            ]}
          />
        </div>

        {/* Couple Rewards */}
        <CoupleRewards rewardsProgress={rewardsProgress} />

        {/* Emergency Toggle */}
        <EmergencyToggle
          active={emergencyMode}
          onToggle={() => setEmergencyMode((prev) => !prev)}
        />
      </div>

      {/* Celebration Overlay */}
      <CelebrationOverlay
        type={celebration.type}
        message={celebration.message}
        emoji={celebration.emoji}
        visible={celebration.visible}
        onDismiss={dismissCelebration}
      />

      {/* Coaching Bubble */}
      <CoachingBubble
        visible={coaching.visible}
        message={coaching.message}
        emoji={coaching.emoji}
        onDismiss={() => setCoaching((prev) => ({ ...prev, visible: false }))}
      />

      {/* Task Completion Feedback Modal */}
      <TaskCompletionModal
        taskTitle={completionModal.taskTitle}
        isOpen={completionModal.isOpen}
        onClose={() => setCompletionModal({ isOpen: false, taskId: "", taskTitle: "" })}
        onSubmit={handleCompletionFeedback}
      />
    </div>
  );
}
