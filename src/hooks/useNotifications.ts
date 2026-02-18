"use client";

import { useState, useCallback, useMemo } from "react";

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
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
  },
  {
    id: "n2",
    type: "partner_activity",
    title: "פעילות שותף/ה",
    message: "אינבל סיימה את הכביסה",
    icon: "👕",
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
  },
  {
    id: "n3",
    type: "achievement",
    title: "הישג חדש!",
    message: "פתחתם את ההישג 'שבוע מושלם' - 7 ימים ברצף!",
    icon: "⭐",
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: "n4",
    type: "streak",
    title: "רצף ימים",
    message: "5 ימים ברצף! המשיכו כך",
    icon: "🔥",
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
  },
  {
    id: "n5",
    type: "weekly_challenge",
    title: "אתגר שבועי",
    message: "השלמתם 3 מתוך 5 משימות באתגר השבועי",
    icon: "🎯",
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
  },
  {
    id: "n6",
    type: "partner_activity",
    title: "פעילות שותף/ה",
    message: "אינבל סיימה ניקוי אמבטיה",
    icon: "🚿",
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: "n7",
    type: "task_reminder",
    title: "תזכורת ערב",
    message: "נשארו 3 משימות להיום - בואו נסיים ביחד!",
    icon: "🌙",
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // ~1 day ago
  },
];

// ============================================
// Utility: generate unique ID
// ============================================

let idCounter = 100;
function generateId(): string {
  idCounter += 1;
  return `n${idCounter}`;
}

// ============================================
// Hook
// ============================================

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
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
    notifications,
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
