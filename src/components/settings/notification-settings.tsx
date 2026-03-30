"use client";

import { Bell, CheckCircle2, XCircle, AlertCircle, Moon } from "lucide-react";
import { isNotificationSupported } from "@/lib/notifications";
import type { NotificationPrefs } from "@/lib/notifications";
import { useTranslation } from "@/hooks/useTranslation";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";

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
  const { prefs: granularPrefs, updatePref, isQuietHours } = useNotificationPrefs();

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

          {/* Granular notification type toggles */}
          <div className="border-t border-border pt-3 mt-1 space-y-2.5">
            <p className="text-xs text-muted font-medium">
              {t("settings.notificationSection.granularTitle")}
            </p>
            <ToggleRow
              label={t("settings.notificationSection.taskReminders")}
              enabled={granularPrefs.taskReminders}
              onToggle={() => updatePref("taskReminders", !granularPrefs.taskReminders)}
            />
            <ToggleRow
              label={t("settings.notificationSection.dailyDigest")}
              enabled={granularPrefs.dailyDigest}
              onToggle={() => updatePref("dailyDigest", !granularPrefs.dailyDigest)}
            />
            <ToggleRow
              label={t("settings.notificationSection.achievements")}
              enabled={granularPrefs.achievements}
              onToggle={() => updatePref("achievements", !granularPrefs.achievements)}
            />
            <ToggleRow
              label={t("settings.notificationSection.weeklyChallenges")}
              enabled={granularPrefs.weeklyChallenges}
              onToggle={() => updatePref("weeklyChallenges", !granularPrefs.weeklyChallenges)}
            />
            <ToggleRow
              label={t("settings.notificationSection.partnerUpdates")}
              enabled={granularPrefs.partnerUpdates}
              onToggle={() => updatePref("partnerUpdates", !granularPrefs.partnerUpdates)}
            />
          </div>

          {/* Quiet hours */}
          <div className="border-t border-border pt-3 mt-1 space-y-2">
            <div className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-muted" />
              <p className="text-xs text-muted font-medium">
                {t("settings.notificationSection.quietHoursTitle")}
                {isQuietHours() && (
                  <span className="mr-1.5 text-primary text-[10px] font-semibold">● פעיל כעת</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted block mb-1">
                  {t("settings.notificationSection.quietStart")}
                </label>
                <input
                  type="time"
                  value={granularPrefs.quietStart}
                  onChange={(e) => updatePref("quietStart", e.target.value)}
                  className="w-full text-sm bg-surface-hover border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  dir="ltr"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted block mb-1">
                  {t("settings.notificationSection.quietEnd")}
                </label>
                <input
                  type="time"
                  value={granularPrefs.quietEnd}
                  onChange={(e) => updatePref("quietEnd", e.target.value)}
                  className="w-full text-sm bg-surface-hover border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  dir="ltr"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted">
              {t("settings.notificationSection.quietHoursHint")}
            </p>
          </div>
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
