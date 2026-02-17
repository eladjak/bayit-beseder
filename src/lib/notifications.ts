"use client";

// ============================================
// Notification permission & subscription
// ============================================

export type NotificationPermissionState =
  | "granted"
  | "denied"
  | "default"
  | "unsupported";

/**
 * Check if push notifications are supported in the current browser.
 */
export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator;
}

/**
 * Get the current notification permission state.
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Request notification permission from the user.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

/**
 * Register the service worker and return the registration.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch {
    return null;
  }
}

// ============================================
// Local notification scheduling
// ============================================

interface ScheduledReminder {
  id: string;
  title: string;
  body: string;
  scheduledTime: Date;
  recurring: "daily" | "weekly" | "monthly" | "once";
  enabled: boolean;
}

const REMINDERS_KEY = "bayit-beseder-reminders";

/**
 * Get all scheduled reminders from localStorage.
 */
export function getScheduledReminders(): ScheduledReminder[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    if (!raw) return getDefaultReminders();
    return JSON.parse(raw) as ScheduledReminder[];
  } catch {
    return getDefaultReminders();
  }
}

/**
 * Save reminders to localStorage.
 */
export function saveScheduledReminders(reminders: ScheduledReminder[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
}

/**
 * Toggle a specific reminder on/off.
 */
export function toggleReminder(id: string): ScheduledReminder[] {
  const reminders = getScheduledReminders();
  const updated = reminders.map((r) =>
    r.id === id ? { ...r, enabled: !r.enabled } : r
  );
  saveScheduledReminders(updated);
  return updated;
}

/**
 * Default reminders for new users.
 */
function getDefaultReminders(): ScheduledReminder[] {
  const today = new Date();

  return [
    {
      id: "morning-reminder",
      title: "בוקר טוב! ☀️",
      body: "הנה המשימות שלכם להיום. בואו נתחיל!",
      scheduledTime: createTime(today, 8, 0),
      recurring: "daily",
      enabled: true,
    },
    {
      id: "midday-check",
      title: "בדיקת צהריים 🏠",
      body: "איך הולך היום? בדקו מה נשאר לעשות.",
      scheduledTime: createTime(today, 14, 0),
      recurring: "daily",
      enabled: true,
    },
    {
      id: "evening-summary",
      title: "סיכום יומי 🌙",
      body: "סיימתם יום מצוין! ראו את הסיכום.",
      scheduledTime: createTime(today, 20, 0),
      recurring: "daily",
      enabled: true,
    },
    {
      id: "weekly-sync",
      title: "סנכרון שבועי 📋",
      body: "הגיע הזמן לתכנן את השבוע הבא יחד!",
      scheduledTime: createTime(today, 18, 0),
      recurring: "weekly",
      enabled: true,
    },
  ];
}

function createTime(base: Date, hours: number, minutes: number): Date {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ============================================
// Show local notification
// ============================================

/**
 * Show a local notification immediately (requires permission).
 */
export async function showLocalNotification(
  title: string,
  body: string,
  options?: {
    tag?: string;
    url?: string;
  }
): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: options?.tag ?? "local-notification",
      dir: "rtl",
      lang: "he",
      data: { url: options?.url ?? "/dashboard" },
    } as NotificationOptions);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Notification preferences (stored in localStorage)
// ============================================

export interface NotificationPrefs {
  enabled: boolean;
  morning: boolean;
  midday: boolean;
  evening: boolean;
  partnerActivity: boolean;
}

const PREFS_KEY = "bayit-beseder-notification-prefs";

export function getNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") {
    return {
      enabled: true,
      morning: true,
      midday: true,
      evening: true,
      partnerActivity: true,
    };
  }

  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) {
      return {
        enabled: true,
        morning: true,
        midday: true,
        evening: true,
        partnerActivity: true,
      };
    }
    return JSON.parse(raw) as NotificationPrefs;
  } catch {
    return {
      enabled: true,
      morning: true,
      midday: true,
      evening: true,
      partnerActivity: true,
    };
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
