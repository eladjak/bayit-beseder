"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
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
import { MembersSection } from "@/components/settings/members-section";
import { useSeasonalMode } from "@/hooks/useSeasonalMode";
import { useZoneConfig } from "@/hooks/useZoneConfig";
import { useTranslation } from "@/hooks/useTranslation";
import { exportTasksToCSV, exportCompletionsToCSV, downloadCSV, type ExportTask, type ExportCompletion } from "@/lib/export";
import { LayoutGrid, AlertTriangle, Keyboard, Download, FileDown } from "lucide-react";
import Link from "next/link";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const SetupWizard = dynamic(() => import("@/components/setup-wizard/setup-wizard").then(m => ({ default: m.SetupWizard })), { ssr: false });
const PrizeManager = dynamic(() => import("@/components/prizes/prize-manager").then(m => ({ default: m.PrizeManager })), { ssr: false });
// Alopik v2 Phase 2 #6 — 4-axis UX preferences (Theme/Haptics/Sounds/Night-mode)
const UxPreferencesPanel = dynamic(() => import("@/components/ux-preferences-panel").then(m => ({ default: m.UxPreferencesPanel })), { ssr: false });
// Alopik v2 Phase 3 #7 — Pet collection selector
const PetSelector = dynamic(() => import("@/components/pets/pet-selector").then(m => ({ default: m.PetSelector })), { ssr: false });
// Alopik v2 Phase 3 #8 — Background themes selector
const BackgroundSelector = dynamic(() => import("@/components/backgrounds/background-selector").then(m => ({ default: m.BackgroundSelector })), { ssr: false });

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
  const { t, setLocale: i18nSetLocale } = useTranslation();
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

  // PWA install
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const [deactivatingSeasonal, setDeactivatingSeasonal] = useState(false);

  // Setup wizard state
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  // Export state
  const [exportingTasks, setExportingTasks] = useState(false);
  const [exportingCompletions, setExportingCompletions] = useState(false);

  const handleExportTasks = async () => {
    if (!user) { toast.error(t("export.loginRequired")); return; }
    setExportingTasks(true);
    try {
      const supabase = (await import("@/lib/supabase")).createClient();
      const { data: tasks } = await supabase.from("tasks").select("id,title,category_id,recurring,status,due_date,created_at");
      const exportData: ExportTask[] = (tasks ?? []).map((task) => ({
        id: task.id,
        title: task.title,
        category: null,
        recurring: task.recurring,
        status: task.status,
        due_date: task.due_date,
        created_at: task.created_at,
      }));
      const csv = exportTasksToCSV(exportData);
      downloadCSV(csv, "tasks.csv");
      toast.success(t("export.tasksSuccess"));
    } catch {
      toast.error(t("export.error"));
    } finally {
      setExportingTasks(false);
    }
  };

  const handleExportCompletions = async () => {
    if (!user) { toast.error(t("export.loginRequired")); return; }
    setExportingCompletions(true);
    try {
      const supabase = (await import("@/lib/supabase")).createClient();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { data: completions } = await supabase
        .from("task_completions")
        .select("task_id, completed_at, tasks(title), profiles(display_name)")
        .gte("completed_at", startOfMonth.toISOString())
        .order("completed_at", { ascending: false });
      const exportData: ExportCompletion[] = (completions ?? []).map((c: Record<string, unknown>) => ({
        task_id: c.task_id as string,
        task_title: (c.tasks as Record<string, string> | null)?.title,
        completed_at: c.completed_at as string,
        user_name: (c.profiles as Record<string, string> | null)?.display_name,
      }));
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const csv = exportCompletionsToCSV(exportData);
      downloadCSV(csv, `completions-${monthStr}.csv`);
      toast.success(t("export.completionsSuccess"));
    } catch {
      toast.error(t("export.error"));
    } finally {
      setExportingCompletions(false);
    }
  };

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
      toast.success("הפרופיל עודכן 🙌");
    } else {
      toast.error("אופס, לא הצלחנו — נסו שוב");
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
      toast.success("מספר הטלפון נשמר 📱");
    } else {
      toast.error("לא הצלחנו לשמור — נסו שוב");
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
      toast.success("הגדרות הבית עודכנו 🏠");
    } else {
      toast.error("לא הצלחנו לשמור — נסו שוב");
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
      toast.success("התראות פעילות 🔔");
    } else if (result === "denied") {
      toast.error("ההתראות חסומות — שנו בהגדרות הדפדפן");
    }
  }

  async function togglePushSubscription() {
    if (!user?.id) return;
    if (pushSubscribed) {
      const ok = await unsubscribeFromPush(user.id);
      if (ok) {
        setPushSubscribed(false);
        toast.success("התראות בוטלו");
      }
    } else {
      const sub = await subscribeToPush(user.id);
      if (sub) {
        setPushSubscribed(true);
        toast.success("התראות הופעלו! 🔔");
      } else {
        toast.error("לא הצלחנו להפעיל — נסו שוב");
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
    if (confirm("בטוחים? זה ימחק את כל ההעדפות המקומיות.")) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("bayit-")) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      toast.success("נוקה 🧹");
      setTimeout(() => window.location.reload(), 500);
    }
  }

  const isDemo = !user;

  return (
    <div className="space-y-4 bg-background min-h-dvh" dir="rtl">
      {/* Header with gradient */}
      <div className="gradient-hero mesh-overlay rounded-b-[2rem] px-4 pt-6 pb-5 text-center overflow-hidden">
        <h1 className="text-xl font-bold text-white tracking-tight relative z-10">⚙️ {t("settings.title")}</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Demo Mode Indicator */}
        {isDemo && (
          <div className="bg-warning/10 border border-warning/20 text-warning rounded-xl px-4 py-3 text-sm text-center">
            👀 אתם מסתכלים בלבד.{" "}
            <button onClick={() => router.push("/login")} className="underline font-medium">
              היכנסו
            </button>{" "}
            כדי לשמור.
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

        {/* Room Setup Wizard */}
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-lg flex-shrink-0">
              🏠
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t("setupWizard.title")}</p>
              <p className="text-xs text-muted">{t("setupWizard.subtitle")}</p>
            </div>
            <button onClick={() => setShowSetupWizard(true)} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold">
              {t("setupWizard.next")}
            </button>
          </div>
        </div>

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

        <MembersSection onInviteClick={() => {
          // Scroll to invite partner section
          document.getElementById("invite-partner-section")?.scrollIntoView({ behavior: "smooth" });
        }} />

        <div id="invite-partner-section">
          <InvitePartner />
        </div>

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
            {t("settings.zones")}
          </h2>
          <p className="text-xs text-muted">
            {t("settings.zonesSection.description")}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{t("settings.zonesSection.zoneMode")}</span>
            <button
              onClick={zoneConfig.toggleZoneMode}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                zoneConfig.zoneMode ? "bg-primary" : "bg-border"
              }`}
              role="switch"
              aria-checked={zoneConfig.zoneMode}
              aria-label={t("settings.zonesSection.toggleLabel")}
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
              <div className="text-xs font-medium text-muted">{t("settings.zonesSection.currentConfig")}</div>
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
                {t("settings.zonesSection.resetDefault")}
              </button>
            </div>
          )}
        </div>

        {/* Emergency Page Link */}
        <Link href="/emergency" className="card-elevated p-4 flex items-center gap-3 hover:bg-surface-hover transition-colors">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{t("settings.emergencyPageTitle")}</p>
            <p className="text-xs text-muted mt-0.5">{t("settings.emergencyPageDesc")}</p>
          </div>
          <span className="text-muted text-lg leading-none">‹</span>
        </Link>

        {/* Seasonal Mode Section */}
        {seasonalMode.activeTemplate && (
          <div className="card-elevated p-4 space-y-3">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              {seasonalMode.activeTemplate.emoji} {t("settings.seasonal")}
            </h2>
            {seasonalMode.activation ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{t("settings.seasonalSection.status")}</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {seasonalMode.activeTemplate.nameHe} — {t("settings.seasonalSection.active")}
                  </span>
                </div>
                {seasonalMode.progress.total > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">{t("settings.seasonalSection.progress")}</span>
                    <span className="text-foreground font-medium">
                      {seasonalMode.progress.completed}/{seasonalMode.progress.total} {t("stats.tasksLabel")}
                    </span>
                  </div>
                )}
                <button
                  onClick={async () => {
                    if (!confirm(t("settings.seasonalSection.deactivateConfirm"))) return;
                    setDeactivatingSeasonal(true);
                    await seasonalMode.deactivate();
                    setDeactivatingSeasonal(false);
                    toast.success(t("settings.seasonalSection.deactivated"));
                  }}
                  disabled={deactivatingSeasonal}
                  className="w-full py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
                >
                  {deactivatingSeasonal ? t("settings.seasonalSection.cancelling") : t("settings.seasonalSection.cancelSeasonal")}
                </button>
              </>
            ) : (
              <p className="text-sm text-muted">
                {seasonalMode.activeTemplate.nameHe} {t("settings.seasonalSection.availableHint")}
              </p>
            )}
          </div>
        )}

        {/* PWA Install */}
        {!isInstalled && canInstall && (
          <div className="card-elevated p-4 space-y-3">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Download className="w-4 h-4" />
              {t("pwa.installTitle")}
            </h2>
            <p className="text-xs text-muted">{t("pwa.installSubtitle")}</p>
            <button
              type="button"
              onClick={promptInstall}
              className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold active:scale-[0.97] transition-transform"
            >
              {t("pwa.installButton")}
            </button>
          </div>
        )}

        {/* Data Export */}
        <div className="card-elevated p-4 space-y-3">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            {t("export.title")}
          </h2>
          <p className="text-xs text-muted">{t("export.description")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { void handleExportTasks(); }}
              disabled={exportingTasks || isDemo}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-background hover:bg-surface-hover transition-colors text-sm font-medium text-foreground disabled:opacity-40 active:scale-[0.97]"
            >
              {exportingTasks ? (
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-muted" />
              )}
              {t("export.tasks")}
            </button>
            <button
              onClick={() => { void handleExportCompletions(); }}
              disabled={exportingCompletions || isDemo}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-background hover:bg-surface-hover transition-colors text-sm font-medium text-foreground disabled:opacity-40 active:scale-[0.97]"
            >
              {exportingCompletions ? (
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-muted" />
              )}
              {t("export.completions")}
            </button>
          </div>
        </div>

        {/* Prize Manager */}
        <div id="prizes" className="space-y-2 scroll-mt-20">
          <h3 className="text-sm font-semibold text-foreground px-1">🏆 {t("prizes.title")}</h3>
          <PrizeManager />
        </div>

        {/* Print Tasks */}
        <Link href="/tasks/print" className="card-elevated p-4 block hover:scale-[0.99] active:scale-[0.97] transition-transform">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-lg flex-shrink-0">
              🖨️
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t("print.title")}</p>
              <p className="text-xs text-muted">{t("print.subtitle")}</p>
            </div>
          </div>
        </Link>

        {/* Keyboard Shortcuts */}
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{t("shortcuts.settingsLink")}</span>
            </div>
            <span className="text-[10px] text-muted bg-surface-hover px-2 py-0.5 rounded-md">
              {t("shortcuts.desktopOnly")}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {[
              { keys: "Ctrl+N", desc: t("shortcuts.newTask") },
              { keys: "Ctrl+/", desc: t("shortcuts.openAIChat") },
              { keys: "Esc", desc: t("shortcuts.closeModal") },
              { keys: "?", desc: t("shortcuts.showHelp") },
            ].map((s) => (
              <div key={s.keys} className="flex items-center gap-2 text-xs text-muted">
                <kbd className="px-1.5 py-0.5 rounded-md bg-surface border border-border font-mono text-[10px] shrink-0">
                  {s.keys}
                </kbd>
                <span className="truncate">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alopik v2 Phase 2 #6 — 4-axis UX preferences (independent of theme): Haptics / Sounds / Notifications / Night-mode */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 px-2">{t("settings.uxPreferencesTitle")}</h2>
          <UxPreferencesPanel />
        </div>

        {/* Alopik v2 Phase 3 #7 — Pet collection */}
        <div id="pets" className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 px-2">{t("settings.companionTitle")}</h2>
          <PetSelector currentStreak={profile?.streak ?? 0} />
        </div>

        {/* Alopik v2 Phase 3 #8 — Background themes */}
        <div id="backgrounds" className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 px-2">{t("settings.backgroundsTitle")}</h2>
          <BackgroundSelector currentStreak={profile?.streak ?? 0} />
        </div>

        <DangerZone
          isDemo={isDemo}
          onLogout={handleLogout}
          onClearLocalData={handleClearLocalData}
        />

        {/* About & Feedback Section */}
        <div className="card-elevated overflow-hidden">
          {/* App identity block */}
          <div className="gradient-hero mesh-overlay px-4 pt-6 pb-5 text-center relative">
            <div className="relative z-10 flex flex-col items-center gap-3">
              {/* App logo */}
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg ring-2 ring-white/30">
                <Image
                  src="/app-logo-120.jpg"
                  alt="בית בסדר"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">בית בסדר</h3>
                <p className="text-xs text-white/70 mt-0.5">
                  {t("common.login") === "Login" ? "Smart home maintenance for every home" : "ניהול הבית החכם לכל בית"}
                </p>
              </div>
              {/* Version badge */}
              <span className="text-[10px] font-medium text-white/60 bg-white/10 px-2.5 py-1 rounded-full border border-white/20">
                v1.0.0
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-border/50 rtl:divide-x-reverse border-b border-border/50">
            {[
              { value: "50+", label: t("common.login") === "Login" ? "Features" : "פיצ׳רים" },
              { value: "100%", label: t("common.login") === "Login" ? "Hebrew RTL" : "עברית RTL" },
              { value: "❤️", label: t("common.login") === "Login" ? "Made in IL" : "ישראל" },
            ].map((stat) => (
              <div key={stat.label} className="py-3 text-center">
                <p className="text-sm font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Feedback & links */}
          <div className="p-4 space-y-3">
            <p className="text-xs text-center text-muted leading-relaxed">
              {t("common.login") === "Login"
                ? "Found a bug? Missing a feature? Have an idea?"
                : "נתקלתם בבאג? חסר פיצ׳ר? יש רעיון? נשמח לשמוע!"}
            </p>
            <div className="flex gap-2">
              <a
                href="mailto:contact@bayitbeseder.com?subject=משוב על בית בסדר"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl gradient-primary text-white text-xs font-semibold shadow-md shadow-primary/20 active:scale-95 transition-transform"
              >
                ✉️ {t("common.login") === "Login" ? "Feedback" : "שלחו משוב"}
              </a>
              <a
                href="/contact"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-muted text-xs font-medium hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                💬 {t("common.login") === "Login" ? "Contact" : "צור קשר"}
              </a>
            </div>

            {/* GitHub Stars CTA — prominent */}
            <a
              href="https://github.com/eladjak/bayit-beseder"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#24292f] dark:bg-[#f0f0f0] text-white dark:text-[#24292f] text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              {t("common.login") === "Login" ? "Star on GitHub ⭐" : "תנו לנו כוכב ב-GitHub ⭐"}
            </a>

            {/* Made with love */}
            <p className="text-center text-[11px] text-muted/70">
              {t("common.login") === "Login"
                ? "Made with ❤️ in Israel by Elad Yakovovich"
                : "נבנה באהבה 🇮🇱 בישראל על ידי אלעד יעקובוביץ׳"}
            </p>
          </div>
        </div>

        <div className="pb-4" />
      </div>

      {/* Setup Wizard Modal */}
      {showSetupWizard && (
        <div className="fixed inset-0 z-50 bg-background">
          <SetupWizard
            onComplete={(_tasks) => {
              setShowSetupWizard(false);
              toast.success("המשימות נוצרו!");
            }}
            onClose={() => setShowSetupWizard(false)}
          />
        </div>
      )}
    </div>
  );
}
