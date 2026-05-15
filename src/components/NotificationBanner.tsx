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
import { useTranslation } from "@/hooks/useTranslation";
import { usePWAInstall } from "@/hooks/usePWAInstall";

/**
 * In-app banner that asks the user to enable push notifications.
 * Shows only once on first login (if notifications not yet granted).
 * Persists dismissal in localStorage.
 *
 * Banner-queue rule (added 2026-05-15 Sprint 7.25e): yields to PWAInstallBanner
 * when both are eligible — install prompt is higher priority on first visit.
 * NotificationBanner appears 30s after page load (was 2s) AND only if PWA
 * banner isn't currently shown. This eliminates the triple-popup pileup.
 */
export function NotificationBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const { user } = useAuth();
  const { canInstall: pwaCanInstall } = usePWAInstall();

  useEffect(() => {
    // Don't show if not supported or already granted/denied
    if (!isNotificationSupported()) return;

    const permission = getNotificationPermission();
    if (permission !== "default") return;

    // Check if user dismissed this banner
    const dismissedAt = localStorage.getItem("bayit-notification-banner-dismissed");
    if (dismissedAt === "never") return; // permanent dismiss
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (!isNaN(dismissedTime) && Date.now() - dismissedTime < sevenDays) return;
    }

    // Yield to PWA install banner — it's higher priority on first visit
    if (pwaCanInstall) return;

    // Show the banner after a longer delay so it doesn't stack with PWA on first paint
    const timer = setTimeout(() => setVisible(true), 30_000);
    return () => clearTimeout(timer);
  }, [pwaCanInstall]);

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
      localStorage.setItem("bayit-notification-banner-dismissed", String(Date.now()));
    } else {
      // User denied - dismiss the banner
      setVisible(false);
      localStorage.setItem("bayit-notification-banner-dismissed", String(Date.now()));
    }
  }, [user]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem("bayit-notification-banner-dismissed", String(Date.now()));
  }, []);

  const handleNeverShow = useCallback(() => {
    setVisible(false);
    localStorage.setItem("bayit-notification-banner-dismissed", "never");
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 p-3 pointer-events-none">
      <div className="max-w-lg mx-auto bg-primary text-white rounded-2xl p-4 shadow-lg pointer-events-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{t("notifications.enableTitle")}</h3>
            <p className="text-xs text-white/80 mt-0.5">
              {t("notifications.enableSubtitle")}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={requesting}
                className="px-4 py-1.5 bg-white text-primary rounded-lg text-xs font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {requesting ? t("notifications.enabling") : t("notifications.enableButton")}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-1.5 bg-white/20 text-white rounded-lg text-xs font-medium hover:bg-white/30 transition-colors"
              >
                {t("notifications.notNow")}
              </button>
              <button
                onClick={handleNeverShow}
                className="px-3 py-1.5 text-white/50 text-xs hover:text-white/80 transition-colors"
              >
                {t("notifications.neverShow")}
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/60 hover:text-white p-1"
            aria-label={t("notifications.closeLabel")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
