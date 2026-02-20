"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPush,
} from "@/lib/notifications";
import { useAuth } from "@/hooks/useAuth";

/**
 * In-app banner that asks the user to enable push notifications.
 * Shows only once on first login (if notifications not yet granted).
 * Persists dismissal in localStorage.
 */
export function NotificationBanner() {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Don't show if not supported or already granted/denied
    if (!isNotificationSupported()) return;

    const permission = getNotificationPermission();
    if (permission !== "default") return;

    // Check if user already dismissed this banner
    const dismissed = localStorage.getItem("bayit-notification-banner-dismissed");
    if (dismissed === "true") return;

    // Show the banner after a short delay (let the page load first)
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = useCallback(async () => {
    setRequesting(true);

    // Register service worker first
    await registerServiceWorker();

    // Request permission
    const result = await requestNotificationPermission();
    setRequesting(false);

    if (result === "granted") {
      // Subscribe to push notifications if user is logged in
      if (user?.id) {
        subscribeToPush(user.id);
      }
      setVisible(false);
      localStorage.setItem("bayit-notification-banner-dismissed", "true");
    } else {
      // User denied - dismiss the banner
      setVisible(false);
      localStorage.setItem("bayit-notification-banner-dismissed", "true");
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem("bayit-notification-banner-dismissed", "true");
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-3">
      <div className="max-w-lg mx-auto bg-primary text-white rounded-2xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">הפעלת התראות</h3>
            <p className="text-xs text-white/80 mt-0.5">
              קבלו תזכורות על משימות, סיכומים יומיים וסטטוס השותף/ה
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={requesting}
                className="px-4 py-1.5 bg-white text-primary rounded-lg text-xs font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {requesting ? "מפעיל..." : "הפעלה"}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-1.5 bg-white/20 text-white rounded-lg text-xs font-medium hover:bg-white/30 transition-colors"
              >
                לא עכשיו
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/60 hover:text-white p-1"
            aria-label="סגירה"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
