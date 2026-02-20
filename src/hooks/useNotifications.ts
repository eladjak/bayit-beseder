"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

// ============================================
// Types
// ============================================

export type NotificationType =
  | "task_reminder"
  | "partner_activity"
  | "achievement"
  | "streak"
  | "weekly_challenge";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon: string;
  read: boolean;
  timestamp: string;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  addNotification: (notification: Omit<Notification, "id" | "read" | "timestamp">) => void;
}

// ============================================
// Mock notifications (Hebrew, fallback data)
// ============================================

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "task_reminder",
    title: "תזכורת משימה",
    message: "שטיפת כלים עדיין ממתינה להיום",
    icon: "🍽️",
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "n2",
    type: "partner_activity",
    title: "פעילות שותף/ה",
    message: "אינבל סיימה את הכביסה",
    icon: "👕",
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "n3",
    type: "achievement",
    title: "הישג חדש!",
    message: "פתחתם את ההישג 'שבוע מושלם' - 7 ימים ברצף!",
    icon: "⭐",
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "n4",
    type: "streak",
    title: "רצף ימים",
    message: "5 ימים ברצף! המשיכו כך",
    icon: "🔥",
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "n5",
    type: "weekly_challenge",
    title: "אתגר שבועי",
    message: "השלמתם 3 מתוך 5 משימות באתגר השבועי",
    icon: "🎯",
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: "n6",
    type: "partner_activity",
    title: "פעילות שותף/ה",
    message: "אינבל סיימה ניקוי אמבטיה",
    icon: "🚿",
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "n7",
    type: "task_reminder",
    title: "תזכורת ערב",
    message: "נשארו 3 משימות להיום - בואו נסיים ביחד!",
    icon: "🌙",
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
];

// ============================================
// localStorage helpers for read/dismissed state
// ============================================

const STORAGE_KEY_READ = "bayit-notifications-read";
const STORAGE_KEY_DISMISSED = "bayit-notifications-dismissed";

function loadStorageSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed as string[]);
    return new Set();
  } catch {
    return new Set();
  }
}

function saveStorageSet(key: string, set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // localStorage full or unavailable - silently ignore
  }
}

// ============================================
// Category icon mapping for task reminders
// ============================================

const CATEGORY_ICONS: Record<string, string> = {
  kitchen: "🍽️",
  bathroom: "🚿",
  living: "🛋️",
  bedroom: "🛏️",
  laundry: "👕",
  outdoor: "🌿",
  pets: "🐾",
  general: "🏠",
};

// ============================================
// Utility: generate unique ID
// ============================================

let idCounter = 100;
function generateId(): string {
  idCounter += 1;
  return `n${idCounter}`;
}

// ============================================
// Supabase data fetcher
// ============================================

interface SupabaseNotificationData {
  partnerCompletions: Notification[];
  streakNotifications: Notification[];
  achievementNotifications: Notification[];
  taskReminders: Notification[];
}

async function fetchNotificationsFromSupabase(): Promise<SupabaseNotificationData | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const todayStr = now.toISOString().slice(0, 10);

    // Fetch all data sources in parallel
    const [completionsResult, streaksResult, achievementsResult, tasksResult, profileResult] =
      await Promise.all([
        // Partner completions in last 24h (task_instances completed by others)
        supabase
          .from("task_instances")
          .select("id, template_id, completed_at, completed_by, task_templates(title, category)")
          .eq("status", "completed")
          .neq("completed_by", user.id)
          .gte("completed_at", twentyFourHoursAgo)
          .order("completed_at", { ascending: false })
          .limit(10),

        // Current user streaks
        supabase
          .from("streaks")
          .select("*")
          .eq("user_id", user.id),

        // Recent user achievements (last 7 days)
        supabase
          .from("user_achievements")
          .select("id, unlocked_at, achievements(title, icon, description)")
          .eq("user_id", user.id)
          .gte("unlocked_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("unlocked_at", { ascending: false })
          .limit(5),

        // Today's pending tasks for reminders
        supabase
          .from("tasks")
          .select("id, title, category_id, due_date")
          .eq("status", "pending")
          .eq("due_date", todayStr)
          .limit(10),

        // Get partner display name
        supabase
          .from("profiles")
          .select("display_name, partner_id")
          .eq("id", user.id)
          .single(),
      ]);

    // Determine partner name
    let partnerName = "השותף/ה";
    if (profileResult.data?.partner_id) {
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", profileResult.data.partner_id)
        .single();
      if (partnerProfile?.display_name) {
        partnerName = partnerProfile.display_name;
      }
    }

    // Build partner completion notifications
    const partnerCompletions: Notification[] = (completionsResult.data ?? []).map((c) => {
      const template = c.task_templates as unknown as { title: string; category: string } | null;
      const category = template?.category ?? "general";
      return {
        id: `partner-${c.id}`,
        type: "partner_activity" as NotificationType,
        title: "פעילות שותף/ה",
        message: `${partnerName} סיימ/ה ${template?.title ?? "משימה"}`,
        icon: CATEGORY_ICONS[category] ?? "✅",
        read: false,
        timestamp: c.completed_at ?? now.toISOString(),
      };
    });

    // Build streak notifications (milestones: 3, 5, 7, 10, 14, 21, 30...)
    const STREAK_MILESTONES = [3, 5, 7, 10, 14, 21, 30, 50, 100];
    const streakNotifications: Notification[] = (streaksResult.data ?? [])
      .filter((s) => STREAK_MILESTONES.includes(s.current_count))
      .map((s) => ({
        id: `streak-${s.id}-${s.current_count}`,
        type: "streak" as NotificationType,
        title: "רצף ימים",
        message:
          s.current_count === s.best_count
            ? `שיא חדש! ${s.current_count} ימים ברצף!`
            : `${s.current_count} ימים ברצף! המשיכו כך`,
        icon: "🔥",
        read: false,
        timestamp: s.updated_at,
      }));

    // Build achievement notifications
    const achievementNotifications: Notification[] = (achievementsResult.data ?? []).map((ua) => {
      const achievement = ua.achievements as unknown as {
        title: string;
        icon: string;
        description: string;
      } | null;
      return {
        id: `achievement-${ua.id}`,
        type: "achievement" as NotificationType,
        title: "הישג חדש!",
        message: achievement
          ? `פתחתם את ההישג '${achievement.title}' - ${achievement.description}`
          : "פתחתם הישג חדש!",
        icon: achievement?.icon ?? "⭐",
        read: false,
        timestamp: ua.unlocked_at,
      };
    });

    // Build task reminder notifications for today's pending tasks
    const pendingCount = tasksResult.data?.length ?? 0;
    const taskReminders: Notification[] = [];
    if (pendingCount > 0) {
      taskReminders.push({
        id: `reminder-today-${todayStr}`,
        type: "task_reminder" as NotificationType,
        title: "תזכורת משימה",
        message:
          pendingCount === 1
            ? `${tasksResult.data![0].title} ממתינה להיום`
            : `${pendingCount} משימות ממתינות להיום`,
        icon: pendingCount === 1 ? "📋" : "📝",
        read: false,
        timestamp: now.toISOString(),
      });
    }

    return {
      partnerCompletions,
      streakNotifications,
      achievementNotifications,
      taskReminders,
    };
  } catch {
    // Supabase not available or tables don't exist - return null for fallback
    return null;
  }
}

// ============================================
// Hook
// ============================================

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const readSetRef = useRef<Set<string>>(new Set());
  const dismissedSetRef = useRef<Set<string>>(new Set());

  // Load persisted read/dismissed state and fetch from Supabase on mount
  useEffect(() => {
    readSetRef.current = loadStorageSet(STORAGE_KEY_READ);
    dismissedSetRef.current = loadStorageSet(STORAGE_KEY_DISMISSED);

    let cancelled = false;

    async function loadNotifications() {
      const supabaseData = await fetchNotificationsFromSupabase();

      if (cancelled) return;

      const readIds = readSetRef.current;
      const dismissedIds = dismissedSetRef.current;

      if (supabaseData) {
        // Merge all Supabase-sourced notifications
        const allSupabase = [
          ...supabaseData.taskReminders,
          ...supabaseData.partnerCompletions,
          ...supabaseData.achievementNotifications,
          ...supabaseData.streakNotifications,
        ];

        // Apply persisted read/dismissed state immutably
        const withState = allSupabase
          .filter((n) => !dismissedIds.has(n.id))
          .map((n) => (readIds.has(n.id) ? { ...n, read: true } : n));

        // Sort by timestamp descending
        const sorted = [...withState].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setNotifications(sorted);
      } else {
        // Fallback to mock data with persisted state
        const withState = MOCK_NOTIFICATIONS.filter((n) => !dismissedIds.has(n.id)).map((n) =>
          readIds.has(n.id) ? { ...n, read: true } : n
        );
        setNotifications(withState);
      }

      setLoaded(true);
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  // Set up Supabase Realtime subscription for live partner completions
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    try {
      const supabase = createClient();
      const channel = supabase
        .channel("notifications-task-instances")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "task_instances",
            filter: "status=eq.completed",
          },
          async (payload) => {
            const updated = payload.new as {
              id: string;
              completed_by: string | null;
              completed_at: string | null;
              template_id: string;
            };

            // Only notify for partner completions
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user || updated.completed_by === user.id) return;

            // Fetch template info for the notification message
            const { data: template } = await supabase
              .from("task_templates")
              .select("title, category")
              .eq("id", updated.template_id)
              .single();

            // Fetch partner name
            let partnerName = "השותף/ה";
            if (updated.completed_by) {
              const { data: partnerProfile } = await supabase
                .from("profiles")
                .select("display_name")
                .eq("id", updated.completed_by)
                .single();
              if (partnerProfile?.display_name) {
                partnerName = partnerProfile.display_name;
              }
            }

            const category = template?.category ?? "general";
            const newNotification: Notification = {
              id: `partner-${updated.id}`,
              type: "partner_activity",
              title: "פעילות שותף/ה",
              message: `${partnerName} סיימ/ה ${template?.title ?? "משימה"}`,
              icon: CATEGORY_ICONS[category] ?? "✅",
              read: false,
              timestamp: updated.completed_at ?? new Date().toISOString(),
            };

            setNotifications((prev) => [newNotification, ...prev.filter((n) => n.id !== newNotification.id)]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Realtime not available - silently ignore
    }
  }, []);

  // Show mock data immediately if Supabase fetch hasn't completed yet
  // (prevents blank notification panel on first render)
  const displayNotifications = loaded ? notifications : MOCK_NOTIFICATIONS;

  const unreadCount = useMemo(
    () => displayNotifications.filter((n) => !n.read).length,
    [displayNotifications]
  );

  const markAsRead = useCallback((id: string) => {
    readSetRef.current = new Set([...readSetRef.current, id]);
    saveStorageSet(STORAGE_KEY_READ, readSetRef.current);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const allIds = prev.map((n) => n.id);
      readSetRef.current = new Set([...readSetRef.current, ...allIds]);
      saveStorageSet(STORAGE_KEY_READ, readSetRef.current);
      return prev.map((n) => ({ ...n, read: true }));
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    dismissedSetRef.current = new Set([...dismissedSetRef.current, id]);
    saveStorageSet(STORAGE_KEY_DISMISSED, dismissedSetRef.current);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "read" | "timestamp">) => {
      const newNotification: Notification = {
        ...notification,
        id: generateId(),
        read: false,
        timestamp: new Date().toISOString(),
      };
      setNotifications((prev) => [newNotification, ...prev]);
    },
    []
  );

  return {
    notifications: displayNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    addNotification,
  };
}

// ============================================
// Pure utility functions (for testing)
// ============================================

/**
 * Format a timestamp into a human-readable Hebrew relative time string.
 */
export function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "עכשיו";
  if (diffMinutes < 60) return `לפני ${diffMinutes} דקות`;
  if (diffHours < 24) return diffHours === 1 ? "לפני שעה" : `לפני ${diffHours} שעות`;
  if (diffDays === 1) return "אתמול";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return `לפני ${Math.floor(diffDays / 7)} שבועות`;
}

/**
 * Compute the number of consecutive days with at least one completion,
 * counting backwards from today.
 */
export function computeConsecutiveStreak(
  completionDates: string[],
  today: string
): number {
  const dateSet = new Set(completionDates.map((d) => d.slice(0, 10)));
  let streak = 0;
  let currentDate = today;

  while (dateSet.has(currentDate)) {
    streak += 1;
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    currentDate = d.toISOString().slice(0, 10);
  }

  return streak;
}

/**
 * Compute weekly challenge progress: how many tasks were completed
 * in the current week (Sunday to Saturday).
 */
export function computeWeeklyChallengeProgress(
  completionDates: string[],
  today: string,
  target: number
): { completed: number; target: number; percentage: number } {
  const todayDate = new Date(today);
  const dayOfWeek = todayDate.getDay(); // 0=Sun
  const sundayDate = new Date(todayDate);
  sundayDate.setDate(sundayDate.getDate() - dayOfWeek);
  const sundayStr = sundayDate.toISOString().slice(0, 10);

  const completed = completionDates.filter((d) => {
    const dateStr = d.slice(0, 10);
    return dateStr >= sundayStr && dateStr <= today;
  }).length;

  const percentage = target > 0 ? Math.min(Math.round((completed / target) * 100), 100) : 0;

  return { completed, target, percentage };
}
