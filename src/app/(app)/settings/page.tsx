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
  MessageCircle,
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
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
  type NotificationPrefs,
} from "@/lib/notifications";
import { toast } from "sonner";
import { setSoundEnabled } from "@/hooks/useAppSound";
import { InvitePartner } from "@/components/invite-partner";

// ============================================
// Theme helpers
// ============================================
type Theme = "light" | "dark" | "system";

const THEME_KEY = "bayit-beseder-theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(THEME_KEY) as Theme) ?? "system";
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

  localStorage.setItem(THEME_KEY, theme);
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
  const [householdName, setHouseholdName] = useState("הבית של אלעד וענבל");

  // Sound state
  const [soundEnabled, setSoundEnabledState] = useState(true);

  // Push state
  const [pushSubscribed, setPushSubscribed] = useState(false);

  // WhatsApp state
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");

  // Theme & Language
  const [theme, setTheme] = useState<Theme>("system");
  const [language, setLanguage] = useState<Language>("he");

  // Initialize from profile and localStorage
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.name);
      setAvatarUrl(profile.avatar_url ?? "");

      // Seed notification toggles from Supabase profile if available
      if (profile.notification_preferences) {
        const np = profile.notification_preferences;
        setNotifPrefs((prev) => ({
          ...prev,
          morning: np.morning,
          midday: np.midday,
          evening: np.evening,
          partnerActivity: np.partner_activity,
        }));
      }
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
    if (typeof window !== "undefined") {
      setWhatsappEnabled(localStorage.getItem("bayit-whatsapp-enabled") === "true");
      setWhatsappPhone(localStorage.getItem("bayit-whatsapp-phone") ?? "");

      // Load golden rule target from localStorage
      const savedTarget = localStorage.getItem("bayit-golden-target");
      if (savedTarget) {
        setGoldenTarget(Number(savedTarget));
      }

      // Load household name from localStorage
      const savedHouseholdName = localStorage.getItem("bayit-household-name");
      if (savedHouseholdName) {
        setHouseholdName(savedHouseholdName);
      }
    }
    // Check push subscription status
    isPushSubscribed().then(setPushSubscribed);
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

  // Keys that map to the Supabase notification_preferences JSON column
  const supabaseNotifKeys = new Set<string>(["morning", "midday", "evening", "partnerActivity"]);

  // Toggle notification preference
  function toggleNotifPref(key: keyof NotificationPrefs) {
    setNotifPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };

      // Always persist to localStorage (offline fallback)
      saveNotificationPrefs(updated);

      // Sync the four schedule/partner toggles to Supabase profile
      if (supabaseNotifKeys.has(key)) {
        updateProfile({
          notification_preferences: {
            morning: updated.morning,
            midday: updated.midday,
            evening: updated.evening,
            partner_activity: updated.partnerActivity,
          },
        });
      }

      return updated;
    });
  }

  // Enable notifications
  async function enableNotifications() {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") {
      // Subscribe to push
      if (user?.id) {
        const sub = await subscribeToPush(user.id);
        setPushSubscribed(sub !== null);
      }
      toast.success("התראות הופעלו!");
    } else if (result === "denied") {
      toast.error("ההתראות נחסמו. שנו את ההגדרה בדפדפן.");
    }
  }

  // Toggle push subscription
  async function togglePushSubscription() {
    if (!user?.id) return;
    if (pushSubscribed) {
      const ok = await unsubscribeFromPush(user.id);
      if (ok) {
        setPushSubscribed(false);
        toast.success("התראות Push בוטלו");
      }
    } else {
      const sub = await subscribeToPush(user.id);
      if (sub) {
        setPushSubscribed(true);
        toast.success("התראות Push הופעלו!");
      } else {
        toast.error("לא ניתן להפעיל התראות Push");
      }
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

  // Clear local data
  function handleClearLocalData() {
    if (
      confirm(
        "האם אתם בטוחים? פעולה זו תמחק את כל הנתונים המקומיים (העדפות, הגדרות)."
      )
    ) {
      // Clear all bayit-* localStorage keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("bayit-")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      toast.success("הנתונים המקומיים נמחקו");
      // Reload to reset state
      setTimeout(() => window.location.reload(), 500);
    }
  }

  const isDemo = !user;
  const emailDisplay = user?.email ?? "demo@example.com";

  return (
    <div className="space-y-5 bg-background min-h-dvh" dir="rtl">
      {/* Header with gradient */}
      <div className="gradient-primary rounded-b-3xl px-4 pt-6 pb-5 text-center">
        <h1 className="text-xl font-bold text-white">הגדרות</h1>
      </div>

      <div className="px-4 space-y-5">

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
      <section className="card-elevated p-4 space-y-4">
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
            className="w-full bg-background dark:bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSaveProfile}
          disabled={profileSaving || isDemo}
          className="flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
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
      <section className="card-elevated p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">בית</h2>
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">שם הבית</label>
          <input
            type="text"
            value={householdName}
            onChange={(e) => {
              setHouseholdName(e.target.value);
              localStorage.setItem("bayit-household-name", e.target.value);
            }}
            className="w-full bg-background dark:bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">קוד הזמנה</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground">
              BAYIT-ABC123
            </code>
            <button
              onClick={copyInviteCode}
              className="p-2 rounded-lg bg-background border border-border hover:bg-surface-hover text-muted"
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
            onChange={(e) => {
              const newTarget = Number(e.target.value);
              setGoldenTarget(newTarget);
              localStorage.setItem("bayit-golden-target", String(newTarget));
            }}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted mt-1">
            <span>50%</span>
            <span>100%</span>
          </div>
          <p className="text-[10px] text-muted mt-2">
            {goldenTarget === 50
              ? "חלוקה שווה לחלוטין"
              : goldenTarget >= 80
                ? "יעד גבוה לשיתוף פעולה"
                : "יעד מאוזן"}
          </p>
        </div>
      </section>

      {/* Invite Partner */}
      <InvitePartner />

      {/* Notifications */}
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
                onClick={enableNotifications}
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
          onToggle={() => toggleNotifPref("enabled")}
        />

        {/* Push subscription toggle */}
        {notifPrefs.enabled && notifPermission === "granted" && (
          <ToggleRow
            label="התראות Push (גם כשהאפליקציה סגורה)"
            enabled={pushSubscribed}
            onToggle={togglePushSubscription}
          />
        )}

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
      <section className="card-elevated p-4 space-y-3">
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

      {/* WhatsApp */}
      <section className="card-elevated p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">WhatsApp</h2>
        </div>
        <p className="text-xs text-muted">
          קבלו סיכום יומי בוואטסאפ - תזכורת בוקר (08:00) וסיכום ערב (20:00)
        </p>
        <ToggleRow
          label="הודעות וואטסאפ"
          enabled={whatsappEnabled}
          onToggle={() => {
            const next = !whatsappEnabled;
            setWhatsappEnabled(next);
            localStorage.setItem("bayit-whatsapp-enabled", next ? "true" : "false");
            if (next && !whatsappPhone) {
              toast.info("הזינו מספר טלפון כדי להתחיל לקבל הודעות");
            }
          }}
        />
        {whatsappEnabled && (
          <div>
            <label className="text-xs text-muted block mb-1">מספר טלפון</label>
            <input
              type="tel"
              value={whatsappPhone}
              onChange={(e) => {
                setWhatsappPhone(e.target.value);
                localStorage.setItem("bayit-whatsapp-phone", e.target.value);
              }}
              placeholder="050-1234567"
              dir="ltr"
              className="w-full bg-background dark:bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            />
            <p className="text-[10px] text-muted mt-1">
              המספר ישמש לשליחת סיכומים יומיים בלבד
            </p>
          </div>
        )}
      </section>

      {/* Theme */}
      <section className="card-elevated p-4 space-y-3">
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
      <section className="card-elevated p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">שפה</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleLanguageChange("he")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              language === "he"
                ? "gradient-primary text-white shadow-md shadow-primary/20"
                : "bg-surface border border-border text-foreground hover:bg-surface-hover"
            }`}
          >
            עברית
          </button>
          <button
            onClick={() => handleLanguageChange("en")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              language === "en"
                ? "gradient-primary text-white shadow-md shadow-primary/20"
                : "bg-surface border border-border text-foreground hover:bg-surface-hover"
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
      <section className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">מצב חירום</h2>
        </div>
        <p className="text-xs text-muted mb-3">
          במצב חירום, רק משימות קריטיות מוצגות (מטבח, שירותים, חתולים)
        </p>
        <button className="w-full py-2.5 rounded-xl border border-border bg-surface text-sm font-medium text-foreground hover:bg-surface-hover transition-colors">
          הפעלת מצב חירום
        </button>
      </section>

      {/* About & Data Management */}
      <section className="card-elevated p-4 space-y-4">
        <div>
          <h2 className="font-semibold text-sm mb-2">אודות</h2>
          <div className="space-y-2 text-xs text-muted">
            <div className="flex justify-between">
              <span>גרסה</span>
              <span className="text-foreground font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>פותח על ידי</span>
              <span className="text-foreground font-medium">אלעד</span>
            </div>
            <div className="flex justify-between">
              <span>עם ❤️ ו-Claude</span>
              <span className="text-foreground font-medium">בית בסדר</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h2 className="font-semibold text-sm mb-2">ניהול נתונים</h2>
          <p className="text-xs text-muted mb-3">
            מחיקת נתונים מקומיים תאפס את כל ההעדפות וההגדרות שלכם
          </p>
          <button
            onClick={handleClearLocalData}
            className="w-full py-2.5 rounded-xl border border-danger/30 text-sm font-medium text-danger hover:bg-danger/5 transition-colors"
          >
            מחיקת נתונים מקומיים
          </button>
        </div>
      </section>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 text-danger text-sm font-medium"
      >
        <LogOut className="w-4 h-4" />
        {isDemo ? "חזרה לדף ההתחברות" : "התנתקות"}
      </button>

      <div className="pb-4" />
      </div>
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
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? "gradient-primary text-white shadow-md shadow-primary/20"
          : "bg-surface border border-border text-foreground hover:bg-surface-hover"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
