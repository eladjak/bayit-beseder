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
    message: "השותף/ה סיימ/ה את הכביסה",
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
    message: "השותף/ה סיימ/ה ניקוי אמבטיה",
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

function generateId(): string {
  return crypto.randomUUID();
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
        // Partner completions in last 24h (task_completions completed by others)
        supabase
          .from("task_completions")
          .select("id, task_id, completed_at, completed_by, tasks(title, category_id)")
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

        // Task reminders - TODO: implement
        Promise.resolve({ data: null }),

