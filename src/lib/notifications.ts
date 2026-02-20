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
// Push subscription management
// ============================================

/**
 * Convert a base64 VAPID key to Uint8Array for PushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

/**
 * Subscribe the browser to push notifications and save to server.
 * Returns the PushSubscription on success, null on failure.
 */
export async function subscribeToPush(
  userId: string
): Promise<PushSubscription | null> {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    // Save subscription to server
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      console.error("[push] Failed to save subscription to server");
      return null;
    }

    return subscription;
  } catch (error) {
    console.error("[push] Subscribe error:", error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications and remove from server.
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove from server
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    return true;
  } catch (error) {
    console.error("[push] Unsubscribe error:", error);
    return false;
  }
}

/**
 * Check if the browser is currently subscribed to push.
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
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
