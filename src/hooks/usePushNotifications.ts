"use client";

import { useState, useEffect, useCallback } from "react";

// ============================================
// usePushNotifications
// Manages push subscription state and
// subscribe/unsubscribe actions.
// ============================================

export type PushPermission = "granted" | "denied" | "default" | "unsupported";

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: PushPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: (userId: string) => Promise<boolean>;
  unsubscribe: (userId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const PUSH_SUBSCRIBED_KEY = "bayit-push-subscribed";

function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function getPermission(): PushPermission {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PushPermission;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer as ArrayBuffer;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState<PushPermission>(() =>
    typeof window !== "undefined" ? getPermission() : "unsupported"
  );
  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(PUSH_SUBSCRIBED_KEY) === "true";
  });
  const [isLoading, setIsLoading] = useState(false);

  // Check real subscription state from ServiceWorker on mount
  const refresh = useCallback(async () => {
    if (!isPushSupported()) return;

    setPermission(getPermission());

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const subscribed = sub !== null;
      setIsSubscribed(subscribed);
      localStorage.setItem(PUSH_SUBSCRIBED_KEY, subscribed ? "true" : "false");
    } catch {
      setIsSubscribed(false);
      localStorage.setItem(PUSH_SUBSCRIBED_KEY, "false");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!isPushSupported()) return false;

      setIsLoading(true);
      try {
        // Request permission first if not yet granted
        if (Notification.permission !== "granted") {
          const result = await Notification.requestPermission();
          setPermission(result as PushPermission);
          if (result !== "granted") {
            return false;
          }
        }

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.warn("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
          return false;
        }

        const reg = await navigator.serviceWorker.ready;

        // Return existing subscription if already subscribed
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as ArrayBuffer,
          });
        }

        // Save to server
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, subscription: sub.toJSON() }),
        });

        if (!res.ok) {
          console.error("[push] Server save failed:", res.status);
          return false;
        }

        setIsSubscribed(true);
        localStorage.setItem(PUSH_SUBSCRIBED_KEY, "true");
        return true;
      } catch (error) {
        console.error("[push] Subscribe error:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const unsubscribe = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!isPushSupported()) return false;

      setIsLoading(true);
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();

        if (sub) {
          await sub.unsubscribe();
        }

        // Remove from server
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        setIsSubscribed(false);
        localStorage.setItem(PUSH_SUBSCRIBED_KEY, "false");
        return true;
      } catch (error) {
        console.error("[push] Unsubscribe error:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    refresh,
  };
}
