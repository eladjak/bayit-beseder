"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User,
  Home,
  Bell,
  AlertTriangle,
  Copy,
  Check,
  LogOut,
  Moon,
  Sun,
  Globe,
  Save,
  Loader2,
  Camera,
  Volume2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { signOut } from "@/lib/auth";
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  getNotificationPermission,
  requestNotificationPermission,
  isNotificationSupported,
  type NotificationPrefs,
} from "@/lib/notifications";
import { toast } from "sonner";
import { setSoundEnabled } from "@/hooks/useAppSound";

// ============================================
// Theme helpers
// ============================================
type Theme = "light" | "dark" | "system";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem("bayit-theme") as Theme) ?? "light";
}

function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  localStorage.setItem("bayit-theme", theme);
}

// ============================================
// Language helpers
// ============================================
type Language = "he" | "en";

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "he";
  return (localStorage.getItem("bayit-language") as Language) ?? "he";
}

function setStoredLanguage(lang: Language) {
  if (typeof window === "undefined") return;
  localStorage.setItem("bayit-language", lang);
}

// ============================================
// Settings Page
// ============================================
export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Notification state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    enabled: true,
    morning: true,
    midday: true,
    evening: true,
    partnerActivity: true,
  });
  const [notifPermission, setNotifPermission] = useState<string>("default");

  // Household state
  const [copied, setCopied] = useState(false);
  const [goldenTarget, setGoldenTarget] = useState(80);

  // Sound state
  const [soundEnabled, setSoundEnabledState] = useState(true);

  // Theme & Language
  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguage] = useState<Language>("he");

  // Initialize from profile and localStorage
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.name);
      setAvatarUrl(profile.avatar_url ?? "");
    } else if (user) {
      setDisplayName(
        user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? ""
      );
      setAvatarUrl(user.user_metadata?.avatar_url ?? "");
    }
  }, [profile, user]);

  useEffect(() => {
    setNotifPrefs(getNotificationPrefs());
    setNotifPermission(getNotificationPermission());
    setTheme(getStoredTheme());
    setLanguage(getStoredLanguage());
    setSoundEnabledState(
      typeof window !== "undefined"
        ? localStorage.getItem("bayit-sound-enabled") !== "false"
        : true
    );
  }, []);

  // Save profile
  const handleSaveProfile = useCallback(async () => {
    setProfileSaving(true);
    const success = await updateProfile({
      name: displayName,
      avatar_url: avatarUrl || null,
    });
    setProfileSaving(false);

    if (success) {
      toast.success("הפרופיל עודכן בהצלחה!");
    } else {
      toast.error("שגיאה בעדכון הפרופיל.");
    }
  }, [displayName, avatarUrl, updateProfile]);

  // Avatar upload placeholder
  const handleAvatarChange = useCallback(async () => {
    // In a full implementation, this would open a file picker
    // and upload to Supabase Storage. For now, show a toast.
    toast.info("העלאת תמונה תהיה זמינה בקרוב!");
  }, []);

  // Copy invite code
  function copyInviteCode() {
    navigator.clipboard.writeText("BAYIT-ABC123");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Toggle notification preference
  function toggleNotifPref(key: keyof NotificationPrefs) {
    setNotifPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      saveNotificationPrefs(updated);
      return updated;
    });
  }

  // Enable notifications
  async function enableNotifications() {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") {
      toast.success("התראות הופעלו!");
    } else if (result === "denied") {
      toast.error("ההתראות נחסמו. שנו את ההגדרה בדפדפן.");
    }
  }

  // Theme toggle
  function handleThemeChange(newTheme: Theme) {
    setTheme(newTheme);
    applyTheme(newTheme);
  }

  // Language change
  function handleLanguageChange(newLang: Language) {
    setLanguage(newLang);
    setStoredLanguage(newLang);
    toast.info(
      newLang === "en"
        ? "English will be available soon!"
        : "השפה עודכנה לעברית."
    );
  }

  // Logout
  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  const isDemo = !user;
  const emailDisplay = user?.email ?? "demo@example.com";

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground">הגדרות</h1>

      {/* Demo Mode Indicator */}
      {isDemo && (
        <div className="bg-warning/10 border border-warning/20 text-warning rounded-xl px-4 py-3 text-sm text-center">
          אתם במצב דמו.{" "}
          <button
            onClick={() => router.push("/login")}
            className="underline font-medium"
          >
            התחברו
          </button>{" "}
          כדי לשמור נתונים.
        </div>
      )}

      {/* Profile */}
      <section className="bg-surface rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">פרופיל</h2>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleAvatarChange}
            className="relative w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden group"
            aria-label="שינוי תמונת פרופיל"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="תמונת פרופיל"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-7 h-7 text-primary" />
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {displayName || "משתמש"}
            </p>
            <p className="text-xs text-muted truncate">{emailDisplay}</p>
          </div>
        </div>

        {/* Name edit */}
        <div>
          <label className="text-xs text-muted block mb-1">שם תצוגה</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="השם שלכם"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSaveProfile}
          disabled={profileSaving || isDemo}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {profileSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {profileSaving ? "שומר..." : "שמירת שינויים"}
        </button>
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
              aria-label="העתקת קוד הזמנה"
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
                onClick={enableNotifications}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium"
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
          onToggle={() => toggleNotifPref("enabled")}
        />

        {notifPrefs.enabled && (
          <>
            <ToggleRow
              label="תזכורת בוקר (08:00)"
              enabled={notifPrefs.morning}
              onToggle={() => toggleNotifPref("morning")}
            />
            <ToggleRow
              label="בדיקת צהריים (14:00)"
              enabled={notifPrefs.midday}
              onToggle={() => toggleNotifPref("midday")}
            />
            <ToggleRow
              label="סיכום ערב (20:00)"
              enabled={notifPrefs.evening}
              onToggle={() => toggleNotifPref("evening")}
            />
            <ToggleRow
              label="פעילות השותף/ה"
              enabled={notifPrefs.partnerActivity}
              onToggle={() => toggleNotifPref("partnerActivity")}
            />
          </>
        )}
      </section>

      {/* Sounds */}
      <section className="bg-surface rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">צלילים</h2>
        </div>
        <ToggleRow
          label="צלילי אפליקציה"
          enabled={soundEnabled}
          onToggle={() => {
            const next = !soundEnabled;
            setSoundEnabledState(next);
            setSoundEnabled(next);
          }}
        />
      </section>

      {/* Theme */}
      <section className="bg-surface rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          {theme === "dark" ? (
            <Moon className="w-4 h-4 text-muted" />
          ) : (
            <Sun className="w-4 h-4 text-muted" />
          )}
          <h2 className="font-semibold text-sm">מראה</h2>
        </div>
        <div className="flex gap-2">
          <ThemeButton
            label="בהיר"
            value="light"
            current={theme}
            icon={<Sun className="w-4 h-4" />}
            onSelect={handleThemeChange}
          />
          <ThemeButton
            label="כהה"
            value="dark"
            current={theme}
            icon={<Moon className="w-4 h-4" />}
            onSelect={handleThemeChange}
          />
          <ThemeButton
            label="מערכת"
            value="system"
            current={theme}
            icon={<Globe className="w-4 h-4" />}
            onSelect={handleThemeChange}
          />
        </div>
      </section>

      {/* Language */}
      <section className="bg-surface rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">שפה</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleLanguageChange("he")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              language === "he"
                ? "bg-primary text-white"
                : "bg-background border border-border text-foreground hover:bg-surface-hover"
            }`}
          >
            עברית
          </button>
          <button
            onClick={() => handleLanguageChange("en")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              language === "en"
                ? "bg-primary text-white"
                : "bg-background border border-border text-foreground hover:bg-surface-hover"
            }`}
          >
            English
          </button>
        </div>
        {language === "en" && (
          <p className="text-xs text-muted">
            English translation is coming soon. The app will remain in Hebrew
            for now.
          </p>
        )}
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
        {isDemo ? "חזרה לדף ההתחברות" : "התנתקות"}
      </button>

      <p className="text-center text-[10px] text-muted pb-4">
        בית בסדר v1.0
      </p>
    </div>
  );
}

// ============================================
// Reusable toggle row component
// ============================================
function ToggleRow({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
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

// ============================================
// Theme button component
// ============================================
function ThemeButton({
  label,
  value,
  current,
  icon,
  onSelect,
}: {
  label: string;
  value: Theme;
  current: Theme;
  icon: React.ReactNode;
  onSelect: (theme: Theme) => void;
}) {
  const isActive = current === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary text-white"
          : "bg-background border border-border text-foreground hover:bg-surface-hover"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
