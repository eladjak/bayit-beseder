"use client";

import { useState } from "react";
import {
  User,
  Home,
  Bell,
  AlertTriangle,
  Copy,
  Check,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [goldenTarget, setGoldenTarget] = useState(80);
  const [notifications, setNotifications] = useState({
    morning: true,
    midday: true,
    evening: true,
    partner: true,
  });

  function copyInviteCode() {
    navigator.clipboard.writeText("BAYIT-ABC123");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground">הגדרות</h1>

      {/* Profile */}
      <section className="bg-surface rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">פרופיל</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">אלעד</p>
            <p className="text-xs text-muted">elad@example.com</p>
          </div>
        </div>
      </section>

      {/* Household */}
      <section className="bg-surface rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">בית</h2>
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">שם הבית</label>
          <input
            type="text"
            defaultValue="הבית של אלעד ואינבל"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">קוד הזמנה</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono">
              BAYIT-ABC123
            </code>
            <button
              onClick={copyInviteCode}
              className="p-2 rounded-lg bg-background border border-border hover:bg-surface-hover"
            >
              {copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4 text-muted" />
              )}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted block mb-2">
            יעד כלל הזהב: {goldenTarget}%
          </label>
          <input
            type="range"
            min={50}
            max={100}
            value={goldenTarget}
            onChange={(e) => setGoldenTarget(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted mt-1">
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-surface rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">התראות</h2>
        </div>
        {[
          { key: "morning" as const, label: "תזכורת בוקר (08:00)" },
          { key: "midday" as const, label: "בדיקת צהריים (14:00)" },
          { key: "evening" as const, label: "סיכום ערב (20:00)" },
          { key: "partner" as const, label: "פעילות השותף/ה" },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{item.label}</span>
            <button
              onClick={() =>
                setNotifications((prev) => ({
                  ...prev,
                  [item.key]: !prev[item.key],
                }))
              }
              className={`w-10 h-6 rounded-full transition-colors relative ${
                notifications[item.key] ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  notifications[item.key]
                    ? "translate-x-0.5"
                    : "translate-x-[18px]"
                }`}
              />
            </button>
          </div>
        ))}
      </section>

      {/* Emergency */}
      <section className="bg-surface rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">מצב חירום</h2>
        </div>
        <p className="text-xs text-muted mb-3">
          במצב חירום, רק משימות קריטיות מוצגות (מטבח, שירותים, חתולים)
        </p>
        <button className="w-full py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-surface-hover transition-colors">
          הפעלת מצב חירום
        </button>
      </section>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 text-danger text-sm font-medium"
      >
        <LogOut className="w-4 h-4" />
        התנתקות
      </button>

      <p className="text-center text-[10px] text-muted">
        בית בסדר v1.0 • נבנה באהבה 🏠
      </p>
    </div>
  );
}
