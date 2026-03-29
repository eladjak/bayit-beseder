"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";

// ============================================
// PushNotificationToggle
// Self-contained toggle for push subscription.
// Can be dropped into Settings or any page.
// ============================================

export function PushNotificationToggle() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) return null;

  async function handleToggle() {
    if (!user?.id) {
      toast.error(t("common.loginRequired") ?? "יש להתחבר תחילה");
      return;
    }

    if (isSubscribed) {
      const ok = await unsubscribe(user.id);
      if (ok) {
        toast.success(t("settings.notificationSection.statusInactive") === "Inactive"
          ? "Push notifications disabled"
          : "התראות Push בוטלו");
      } else {
        toast.error(t("common.error") ?? "שגיאה — נסו שוב");
      }
    } else {
      if (permission === "denied") {
        toast.error(
          t("settings.notificationSection.permissionDenied") ===
          "Notifications are blocked. Change the setting in browser settings."
            ? "Notifications are blocked. Change the setting in browser settings."
            : "ההתראות חסומות. שנו את ההגדרה בהגדרות הדפדפן."
        );
        return;
      }

      const ok = await subscribe(user.id);
      if (ok) {
        toast.success(t("settings.notificationSection.statusActive") === "Active"
          ? "Push notifications enabled! 🔔"
          : "התראות Push הופעלו! 🔔");
      } else if (permission !== "granted") {
        toast.error(
          t("settings.notificationSection.permissionDenied") ===
          "Notifications are blocked. Change the setting in browser settings."
            ? "Permission was not granted"
            : "הרשאה לא ניתנה"
        );
      } else {
        toast.error(t("common.error") ?? "שגיאה — נסו שוב");
      }
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isSubscribed ? (
          <Bell className="w-4 h-4 text-primary" />
        ) : (
          <BellOff className="w-4 h-4 text-muted" />
        )}
        <span className="text-sm text-foreground">
          {t("settings.notificationSection.pushToggle")}
        </span>
      </div>

      <button
        onClick={handleToggle}
        disabled={isLoading || !user}
        aria-label={isSubscribed ? "ביטול התראות Push" : "הפעלת התראות Push"}
        className={`relative w-11 h-6 rounded-full transition-colors duration-150 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed ${
          isSubscribed ? "bg-primary" : "bg-border"
        }`}
        role="switch"
        aria-checked={isSubscribed}
      >
        {isLoading ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
          </span>
        ) : (
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-150 ${
              isSubscribed ? "translate-x-0.5" : "translate-x-5"
            }`}
          />
        )}
      </button>
    </div>
  );
}
