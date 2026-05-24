"use client";

/**
 * UX Preferences Panel — Alopik v2 Phase 2 #5.
 *
 * 4-axis settings: Theme / Haptics / Sounds / Night-mode.
 * Drop-in section for the existing settings page.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

import { useEffect, useState } from "react";
import { Moon, Sun, Volume2, Vibrate, Bell, MonitorSmartphone } from "lucide-react";
import {
  DEFAULT_PREFS,
  loadPreferences,
  savePreferences,
  type Theme,
  type UxPreferences,
} from "@/lib/ux-preferences";

type ToggleRowProps = {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly checked: boolean;
  readonly onChange: (next: boolean) => void;
  readonly id: string;
};

function ToggleRow({ icon, title, description, checked, onChange, id }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start gap-3 min-w-0">
        <div className="size-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0" aria-hidden="true">
          {icon}
        </div>
        <div className="min-w-0">
          <label htmlFor={id} className="text-sm font-medium text-gray-900 cursor-pointer block">
            {title}
          </label>
          {description && <p className="text-xs text-gray-500 mt-0.5 text-pretty">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 ${
          checked ? "bg-rose-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 start-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function UxPreferencesPanel() {
  const [prefs, setPrefs] = useState<UxPreferences>(DEFAULT_PREFS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPrefs(loadPreferences());
    setMounted(true);
  }, []);

  const update = (patch: Partial<UxPreferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePreferences(next);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      {/* Theme */}
      <div className="rounded-xl bg-white border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <MonitorSmartphone className="size-4 text-rose-500" aria-hidden="true" />
          תצוגה
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {(["light", "auto", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update({ theme: t as Theme })}
              className={`py-2 rounded-lg text-xs font-medium border ${
                prefs.theme === t ? "border-rose-500 bg-rose-50 text-rose-700" : "border-gray-200 text-gray-600"
              }`}
            >
              {t === "light" ? "בהיר" : t === "dark" ? "כהה" : "אוטו"}
            </button>
          ))}
        </div>
      </div>

      {/* Experience toggles */}
      <div className="rounded-xl bg-white border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-1">חוויה</h3>
        <p className="text-xs text-gray-500 mb-3">ארבעה צירים נפרדים. כל אחד עצמאי.</p>

        <ToggleRow
          id="pref-haptics"
          icon={<Vibrate className="size-4" />}
          title="רטט (Haptics)"
          description="פידבק קל לכל פעולה. מושתק במצב לילה אוטומטית."
          checked={prefs.haptics}
          onChange={(v) => update({ haptics: v })}
        />

        <ToggleRow
          id="pref-sounds"
          icon={<Volume2 className="size-4" />}
          title="צלילים"
          description="צלצולים על השלמת משימה, התראות. מושתק במצב לילה."
          checked={prefs.sounds}
          onChange={(v) => update({ sounds: v })}
        />

        <ToggleRow
          id="pref-notifications"
          icon={<Bell className="size-4" />}
          title="התראות"
          description="התראות push מהאפליקציה. נדרשת הסכמת המכשיר."
          checked={prefs.notifications}
          onChange={(v) => update({ notifications: v })}
        />

        <ToggleRow
          id="pref-night-mode"
          icon={prefs.nightMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
          title="מצב לילה"
          description="שונה מתצוגה כהה: משתיק צלילים+רטט, מצמצם בהירות+אנימציות. למשכים לא מעירים."
          checked={prefs.nightMode}
          onChange={(v) => update({ nightMode: v })}
        />
      </div>

      {/* Onboarding re-trigger */}
      <div className="rounded-xl bg-white border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3">הסבר מקדים</h3>
        <button
          type="button"
          onClick={() => {
            if (typeof window === "undefined") return;
            localStorage.removeItem("bayit-onboarding-done-v1");
            window.location.reload();
          }}
          className="w-full py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
        >
          הצג שוב את ההסבר המקדים
        </button>
      </div>
    </div>
  );
}
