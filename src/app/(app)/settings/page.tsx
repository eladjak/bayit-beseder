"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useHousehold } from "@/hooks/useHousehold";
import { signOut } from "@/lib/auth";
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  getNotificationPermission,
  requestNotificationPermission,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  type NotificationPrefs,
} from "@/lib/notifications";
import { toast } from "sonner";
import { setSoundEnabled } from "@/hooks/useAppSound";
import { InvitePartner } from "@/components/invite-partner";
import { CalendarSettings } from "@/components/calendar-settings";
import { ProfileSection } from "@/components/settings/profile-section";
import { HouseholdSection } from "@/components/settings/household-section";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { AppearanceSettings, WhatsAppSettings } from "@/components/settings/appearance-settings";
import { DangerZone } from "@/components/settings/danger-zone";
import { useSeasonalMode } from "@/hooks/useSeasonalMode";
import { useZoneConfig } from "@/hooks/useZoneConfig";
import { useTranslation } from "@/hooks/useTranslation";
import { LayoutGrid } from "lucide-react";

// ============================================
// Theme helpers
// ============================================
type Theme = "light" | "dark" | "system";
type Language = "he" | "en";

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
  const { setLocale: i18nSetLocale } = useTranslation();
  const { household, updateHousehold } = useHousehold(profile?.household_id ?? null);

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
  const [householdName, setHouseholdName] = useState("הבית שלנו");
  const [householdSaving, setHouseholdSaving] = useState(false);

  // Sound state
  const [soundEnabled, setSoundEnabledState] = useState(true);

  // Push state
  const [pushSubscribed, setPushSubscribed] = useState(false);

  // Seasonal mode
  const seasonalMode = useSeasonalMode();

  // Zone config
  const zoneConfig = useZoneConfig();
  const [deactivatingSeasonal, setDeactivatingSeasonal] = useState(false);

  // WhatsApp state
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappPhoneSaving, setWhatsappPhoneSaving] = useState(false);

  // Theme & Language
  const [theme, setTheme] = useState<Theme>("system");
  const [language, setLanguage] = useState<Language>("he");

  // Initialize from profile and localStorage
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.name);
      setAvatarUrl(profile.avatar_url ?? "");
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
      if (profile.whatsapp_phone) {
        setWhatsappPhone(profile.whatsapp_phone);
        localStorage.setItem("bayit-whatsapp-phone", profile.whatsapp_phone);
      }
    } else if (user) {
      setDisplayName(
        user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? ""
      );
      setAvatarUrl(user.user_metadata?.avatar_url ?? "");
    }
  }, [profile, user]);

  useEffect(() => {
    if (household) {
      setHouseholdName(household.name);
      setGoldenTarget(household.goldenRuleTarget);
      localStorage.setItem("bayit-household-name", household.name);
      localStorage.setItem("bayit-golden-target", String(household.goldenRuleTarget));
    }
  }, [household]);

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
      const savedTarget = localStorage.getItem("bayit-golden-target");
      if (savedTarget) setGoldenTarget(Number(savedTarget));
      const savedHouseholdName = localStorage.getItem("bayit-household-name");
      if (savedHouseholdName) setHouseholdName(savedHouseholdName);
    }
    isPushSubscribed().then(setPushSubscribed);
  }, []);

  const handleSaveProfile = useCallback(async () => {
    setProfileSaving(true);
    const success = await updateProfile({ name: displayName, avatar_url: avatarUrl || null });
    setProfileSaving(false);
    if (success) {
      toast.success("הפרופיל עודכן בהצלחה!");
    } else {
      toast.error("שגיאה בעדכון הפרופיל.");
    }
  }, [displayName, avatarUrl, updateProfile]);

  const handleSaveWhatsappPhone = useCallback(async () => {
    localStorage.setItem("bayit-whatsapp-phone", whatsappPhone);
    if (!user) {
      toast.success("מספר הטלפון נשמר מקומית");
      return;
    }
    setWhatsappPhoneSaving(true);
    const success = await updateProfile({ whatsapp_phone: whatsappPhone || null });
    setWhatsappPhoneSaving(false);
    if (success) {
      toast.success("מספר הטלפון עודכן!");
    } else {
      toast.error("שגיאה בשמירת מספר הטלפון");
    }
  }, [whatsappPhone, user, updateProfile]);

  const handleAvatarUploaded = useCallback(
    async (url: string) => {
      setAvatarUrl(url);
      await updateProfile({ avatar_url: url });
    },
    [updateProfile]
  );

  function copyInviteCode() {
    void navigator.clipboard.writeText(household.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const handleSaveHousehold = useCallback(async () => {
    localStorage.setItem("bayit-household-name", householdName);
    localStorage.setItem("bayit-golden-target", String(goldenTarget));
    if (!profile?.household_id) {
      toast.success("ההגדרות נשמרו מקומית");
      return;
    }
    setHouseholdSaving(true);
    const success = await updateHousehold({ name: householdName, goldenRuleTarget: goldenTarget });
    setHouseholdSaving(false);
    if (success) {
      toast.success("הגדרות הבית עודכנו!");
    } else {
      toast.error("שגיאה בשמירת הגדרות הבית");
    }
  }, [householdName, goldenTarget, profile?.household_id, updateHousehold]);

  const supabaseNotifKeys = new Set<string>(["morning", "midday", "evening", "partnerActivity"]);

  function toggleNotifPref(key: keyof NotificationPrefs) {
    setNotifPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      saveNotificationPrefs(updated);
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

  async function enableNotifications() {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") {
      if (user?.id) {
        const sub = await subscribeToPush(user.id);
        setPushSubscribed(sub !== null);
      }
      toast.success("התראות הופעלו!");
    } else if (result === "denied") {
      toast.error("ההתראות נחסמו. שנו את ההגדרה בדפדפן.");
    }
  }

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

  function handleThemeChange(newTheme: Theme) {
    setTheme(newTheme);
    applyTheme(newTheme);
  }

  function handleLanguageChange(newLang: Language) {
    setLanguage(newLang);
    setStoredLanguage(newLang);
    // Sync with i18n context
    i18nSetLocale(newLang === "en" ? "en" : "he");
    toast.info(
      newLang === "en"
        ? "Language switched to English"
        : "השפה עודכנה לעברית."
    );
  }

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  function handleClearLocalData() {
    if (confirm("האם אתם בטוחים? פעולה זו תמחק את כל הנתונים המקומיים (העדפות, הגדרות).")) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("bayit-")) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      toast.success("הנתונים המקומיים נמחקו");
      setTimeout(() => window.location.reload(), 500);
    }
  }

  const isDemo = !user;

  return (
    <div className="space-y-5 bg-background min-h-dvh" dir="rtl">
      {/* Header with gradient */}
      <div className="gradient-hero mesh-overlay rounded-b-[2rem] px-4 pt-6 pb-5 text-center overflow-hidden">
        <h1 className="text-xl font-bold text-white tracking-tight relative z-10">הגדרות</h1>
      </div>

      <div className="px-4 space-y-5">
        {/* Demo Mode Indicator */}
        {isDemo && (
          <div className="bg-warning/10 border border-warning/20 text-warning rounded-xl px-4 py-3 text-sm text-center">
            אתם במצב דמו.{" "}
            <button onClick={() => router.push("/login")} className="underline font-medium">
              התחברו
            </button>{" "}
            כדי לשמור נתונים.
          </div>
        )}

        <ProfileSection
          displayName={displayName}
          avatarUrl={avatarUrl}
          profileSaving={profileSaving}
          isDemo={isDemo}
          userId={user?.id ?? null}
          onNameChange={setDisplayName}
          onAvatarUploaded={handleAvatarUploaded}
          onSave={handleSaveProfile}
        />

        <HouseholdSection
          householdName={householdName}
          goldenTarget={goldenTarget}
          inviteCode={household.inviteCode}
          copied={copied}
          householdSaving={householdSaving}
          onNameChange={setHouseholdName}
          onTargetChange={setGoldenTarget}
          onCopyInviteCode={copyInviteCode}
          onSave={handleSaveHousehold}
        />

        <InvitePartner />

        <Suspense fallback={null}>
          <CalendarSettings />
        </Suspense>

        <NotificationSettings
          notifPrefs={notifPrefs}
          notifPermission={notifPermission}
          pushSubscribed={pushSubscribed}
          onTogglePref={toggleNotifPref}
          onEnableNotifications={enableNotifications}
          onTogglePushSubscription={togglePushSubscription}
        />

        <AppearanceSettings
          theme={theme}
          language={language}
          soundEnabled={soundEnabled}
          onThemeChange={handleThemeChange}
          onLanguageChange={handleLanguageChange}
          onSoundToggle={() => {
            const next = !soundEnabled;
            setSoundEnabledState(next);
            setSoundEnabled(next);
          }}
        />

        <WhatsAppSettings
          whatsappEnabled={whatsappEnabled}
          whatsappPhone={whatsappPhone}
          whatsappPhoneSaving={whatsappPhoneSaving}
          isDemo={isDemo}
          onToggle={() => {
            const next = !whatsappEnabled;
            setWhatsappEnabled(next);
            localStorage.setItem("bayit-whatsapp-enabled", next ? "true" : "false");
            if (next && !whatsappPhone) {
              toast.info("הזינו מספר טלפון כדי להתחיל לקבל הודעות");
            }
          }}
          onPhoneChange={setWhatsappPhone}
          onSavePhone={handleSaveWhatsappPhone}
        />

        {/* Zone-Based Scheduling */}
        <div className="card-elevated p-4 space-y-3">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            תזמון לפי אזורים
          </h2>
          <p className="text-xs text-muted">
            ארגון המשימות השבועיות לפי חדרים ואזורים בבית
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">מצב אזורים</span>
            <button
              onClick={zoneConfig.toggleZoneMode}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                zoneConfig.zoneMode ? "bg-primary" : "bg-border"
              }`}
              role="switch"
              aria-checked={zoneConfig.zoneMode}
              aria-label="הפעלת מצב אזורים"
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  zoneConfig.zoneMode ? "translate-x-0.5" : "translate-x-5"
                }`}
              />
            </button>
          </div>
          {zoneConfig.zoneMode && (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-medium text-muted">סידור ברירת מחדל:</div>
              {zoneConfig.zoneDaySummary
                .filter((d) => d.zones.length > 0)
                .map((day) => (
                  <div key={day.dayIndex} className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-foreground w-16">{day.dayName}</span>
                    <span className="flex gap-1">
                      {day.zones.map((z) => (
                        <span
                          key={z.zone}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-surface-hover"
                        >
                          {z.icon} {z.label}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              <button
                onClick={zoneConfig.resetMappings}
                className="text-xs text-primary hover:text-primary-dark font-medium"
              >
                איפוס לברירת מחדל
              </button>
            </div>
          )}
        </div>

        {/* Seasonal Mode Section */}
        {seasonalMode.activeTemplate && (
          <div className="card-elevated p-4 space-y-3">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              {seasonalMode.activeTemplate.emoji} מצב עונתי
            </h2>
            {seasonalMode.activation ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">סטטוס</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {seasonalMode.activeTemplate.nameHe} — פעיל
                  </span>
                </div>
                {seasonalMode.progress.total > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">התקדמות</span>
                    <span className="text-foreground font-medium">
                      {seasonalMode.progress.completed}/{seasonalMode.progress.total} משימות
                    </span>
                  </div>
                )}
                <button
                  onClick={async () => {
                    if (!confirm("האם לבטל את מצב הפסח? כל המשימות העונתיות יסומנו כהושלמו.")) return;
                    setDeactivatingSeasonal(true);
                    await seasonalMode.deactivate();
                    setDeactivatingSeasonal(false);
                    toast.success("מצב פסח בוטל");
                  }}
                  disabled={deactivatingSeasonal}
                  className="w-full py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
                >
                  {deactivatingSeasonal ? "מבטל..." : "ביטול מצב פסח"}
                </button>
              </>
            ) : (
              <p className="text-sm text-muted">
                מצב {seasonalMode.activeTemplate.nameHe} זמין — הפעילו מהדשבורד
              </p>
            )}
          </div>
        )}

        <DangerZone
          isDemo={isDemo}
          onLogout={handleLogout}
          onClearLocalData={handleClearLocalData}
        />

        <div className="pb-4" />
      </div>
    </div>
  );
}
