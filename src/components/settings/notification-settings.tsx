"use client";

import { Bell } from "lucide-react";
import { isNotificationSupported } from "@/lib/notifications";
import type { NotificationPrefs } from "@/lib/notifications";

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
        className={`w-10 h-6 rounded-full transition-colors relative ${
          enabled ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-0.5" : "translate-x-[18px]"
          }`}
        />
      </button>
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
  return (
    <section className="card-elevated p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-muted" />
        <h2 className="font-semibold text-sm">התראות</h2>
      </div>

      {/* Permission status */}
      {isNotificationSupported() && notifPermission !== "granted" && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
          <p className="text-xs text-muted mb-2">
            {notifPermission === "denied"
              ? "ההתראות חסומות. שנו את ההגדרה בהגדרות הדפדפן."
              : "הפעילו התראות כדי לקבל תזכורות על משימות."}
          </p>
          {notifPermission === "default" && (
            <button
              onClick={onEnableNotifications}
              className="px-3 py-1.5 gradient-primary text-white rounded-lg text-xs font-medium shadow-sm shadow-primary/20"
            >
              הפעלת התראות
            </button>
          )}
        </div>
      )}

      {/* Master toggle */}
      <ToggleRow
        label="התראות מופעלות"
        enabled={notifPrefs.enabled}
        onToggle={() => onTogglePref("enabled")}
      />

      {/* Push subscription toggle */}
      {notifPrefs.enabled && notifPermission === "granted" && (
        <ToggleRow
          label="התראות Push (גם כשהאפליקציה סגורה)"
          enabled={pushSubscribed}
          onToggle={onTogglePushSubscription}
        />
      )}

      {notifPrefs.enabled && (
        <>
          <ToggleRow
            label="תזכורת בוקר (08:00)"
            enabled={notifPrefs.morning}
            onToggle={() => onTogglePref("morning")}
          />
          <ToggleRow
            label="בדיקת צהריים (14:00)"
            enabled={notifPrefs.midday}
            onToggle={() => onTogglePref("midday")}
          />
          <ToggleRow
            label="סיכום ערב (20:00)"
            enabled={notifPrefs.evening}
            onToggle={() => onTogglePref("evening")}
          />
          <ToggleRow
            label="פעילות השותף/ה"
            enabled={notifPrefs.partnerActivity}
            onToggle={() => onTogglePref("partnerActivity")}
          />
        </>
      )}
    </section>
  );
}
