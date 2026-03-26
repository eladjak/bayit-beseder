"use client";

import { Bell, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { isNotificationSupported } from "@/lib/notifications";
import type { NotificationPrefs } from "@/lib/notifications";
import { useTranslation } from "@/hooks/useTranslation";

interface ToggleRowProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}

function ToggleRow({ label, enabled, onToggle }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={enabled}
        className={`w-10 h-6 rounded-full transition-all duration-150 active:scale-90 relative ${
          enabled ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-150 ${
            enabled ? "translate-x-0.5" : "translate-x-[18px]"
          }`}
        />
      </button>
    </div>
  );
}

function StatusRow({ label, status, detail }: { label: string; status: "active" | "inactive" | "error"; detail: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted">{label}</span>
      <div className="flex items-center gap-1">
        {status === "active" ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
        ) : status === "error" ? (
          <XCircle className="w-3.5 h-3.5 text-danger" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 text-muted" />
        )}
        <span className={status === "active" ? "text-success" : status === "error" ? "text-danger" : "text-muted"}>
          {detail}
        </span>
      </div>
    </div>
  );
}

interface NotificationSettingsProps {
  notifPrefs: NotificationPrefs;
  notifPermission: string;
  pushSubscribed: boolean;
  onTogglePref: (key: keyof NotificationPrefs) => void;
  onEnableNotifications: () => void;
  onTogglePushSubscription: () => void;
}

export function NotificationSettings({
  notifPrefs,
  notifPermission,
  pushSubscribed,
  onTogglePref,
  onEnableNotifications,
  onTogglePushSubscription,
}: NotificationSettingsProps) {
  const { t } = useTranslation();

  return (
    <section className="card-elevated p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-muted" />
        <h2 className="font-semibold text-sm">{t("settings.notifications")}</h2>
      </div>

      {/* Permission status */}
      {isNotificationSupported() && notifPermission !== "granted" && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
          <p className="text-xs text-muted mb-2">
            {notifPermission === "denied"
              ? t("settings.notificationSection.permissionDenied")
              : t("settings.notificationSection.permissionPrompt")}
          </p>
          {notifPermission === "default" && (
            <button
              onClick={onEnableNotifications}
              className="px-3 py-1.5 gradient-primary text-white rounded-xl text-xs font-semibold shadow-sm shadow-primary/20 transition-transform duration-100 active:scale-[0.95]"
            >
              {t("settings.notificationSection.enableNotifications")}
            </button>
          )}
        </div>
      )}

      {/* Master toggle */}
      <ToggleRow
        label={t("settings.notificationSection.masterToggle")}
        enabled={notifPrefs.enabled}
        onToggle={() => onTogglePref("enabled")}
      />

      {/* Push subscription toggle */}
      {notifPrefs.enabled && notifPermission === "granted" && (
        <ToggleRow
          label={t("settings.notificationSection.pushToggle")}
          enabled={pushSubscribed}
          onToggle={onTogglePushSubscription}
        />
      )}

      {notifPrefs.enabled && (
        <>
          <ToggleRow
            label={t("settings.notificationSection.morningToggle")}
            enabled={notifPrefs.morning}
            onToggle={() => onTogglePref("morning")}
          />
          <ToggleRow
            label={t("settings.notificationSection.middayToggle")}
            enabled={notifPrefs.midday}
            onToggle={() => onTogglePref("midday")}
          />
          <ToggleRow
            label={t("settings.notificationSection.eveningToggle")}
            enabled={notifPrefs.evening}
            onToggle={() => onTogglePref("evening")}
          />
          <ToggleRow
            label={t("settings.notificationSection.partnerActivityToggle")}
            enabled={notifPrefs.partnerActivity}
            onToggle={() => onTogglePref("partnerActivity")}
          />
        </>
      )}

      {/* Notification Status Indicators */}
      <div className="border-t border-border pt-3 mt-3 space-y-2">
        <p className="text-xs text-muted font-medium">
          {t("settings.notificationSection.statusTitle")}
        </p>
        <div className="space-y-1.5">
          <StatusRow
            label={t("settings.notificationSection.browserPermission")}
            status={
              notifPermission === "granted" ? "active" :
              notifPermission === "denied" ? "error" : "inactive"
            }
            detail={
              notifPermission === "granted"
                ? t("settings.notificationSection.statusGranted")
                : notifPermission === "denied"
                  ? t("settings.notificationSection.statusDenied")
                  : t("settings.notificationSection.statusDefault")
            }
          />
          <StatusRow
            label={t("settings.notificationSection.pushBackground")}
            status={pushSubscribed ? "active" : "inactive"}
            detail={
              pushSubscribed
                ? t("settings.notificationSection.statusActive")
                : t("settings.notificationSection.statusInactive")
            }
          />
        </div>
      </div>
    </section>
  );
}
