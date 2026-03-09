"use client";

import { Moon, Sun, Globe, Volume2, MessageCircle, Save, Loader2 } from "lucide-react";

type Theme = "light" | "dark" | "system";
type Language = "he" | "en";

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

interface ThemeButtonProps {
  label: string;
  value: Theme;
  current: Theme;
  icon: React.ReactNode;
  onSelect: (theme: Theme) => void;
}

function ThemeButton({ label, value, current, icon, onSelect }: ThemeButtonProps) {
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

interface AppearanceSettingsProps {
  theme: Theme;
  language: Language;
  soundEnabled: boolean;
  onThemeChange: (theme: Theme) => void;
  onLanguageChange: (lang: Language) => void;
  onSoundToggle: () => void;
}

export function AppearanceSettings({
  theme,
  language,
  soundEnabled,
  onThemeChange,
  onLanguageChange,
  onSoundToggle,
}: AppearanceSettingsProps) {
  return (
    <>
      {/* Sounds */}
      <section className="card-elevated p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">צלילים</h2>
        </div>
        <ToggleRow
          label="צלילי אפליקציה"
          enabled={soundEnabled}
          onToggle={onSoundToggle}
        />
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
            onSelect={onThemeChange}
          />
          <ThemeButton
            label="כהה"
            value="dark"
            current={theme}
            icon={<Moon className="w-4 h-4" />}
            onSelect={onThemeChange}
          />
          <ThemeButton
            label="מערכת"
            value="system"
            current={theme}
            icon={<Globe className="w-4 h-4" />}
            onSelect={onThemeChange}
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
            onClick={() => onLanguageChange("he")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              language === "he"
                ? "gradient-primary text-white shadow-md shadow-primary/20"
                : "bg-surface border border-border text-foreground hover:bg-surface-hover"
            }`}
          >
            עברית
          </button>
          <button
            onClick={() => onLanguageChange("en")}
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
    </>
  );
}

interface WhatsAppSettingsProps {
  whatsappEnabled: boolean;
  whatsappPhone: string;
  whatsappPhoneSaving: boolean;
  isDemo: boolean;
  onToggle: () => void;
  onPhoneChange: (phone: string) => void;
  onSavePhone: () => void;
}

export function WhatsAppSettings({
  whatsappEnabled,
  whatsappPhone,
  whatsappPhoneSaving,
  isDemo,
  onToggle,
  onPhoneChange,
  onSavePhone,
}: WhatsAppSettingsProps) {
  return (
    <section className="card-elevated p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-muted" />
        <h2 className="font-semibold text-sm">WhatsApp</h2>
      </div>
      <p className="text-xs text-muted">
        קבלו סיכום יומי בוואטסאפ - תזכורת בוקר (08:00) וסיכום ערב (20:00)
      </p>
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">הודעות וואטסאפ</span>
        <button
          onClick={onToggle}
          role="switch"
          aria-checked={whatsappEnabled}
          className={`w-10 h-6 rounded-full transition-colors relative ${
            whatsappEnabled ? "bg-primary" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              whatsappEnabled ? "translate-x-0.5" : "translate-x-[18px]"
            }`}
          />
        </button>
      </div>
      {whatsappEnabled && (
        <div className="space-y-2">
          <label className="text-xs text-muted block mb-1">מספר טלפון</label>
          <input
            type="tel"
            value={whatsappPhone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="050-1234567"
            dir="ltr"
            className="w-full bg-background dark:bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
          <p className="text-[10px] text-muted">
            המספר ישמש לזיהוי בעת השלמת משימות דרך WhatsApp
          </p>
          <button
            onClick={onSavePhone}
            disabled={whatsappPhoneSaving || isDemo}
            className="flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
          >
            {whatsappPhoneSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {whatsappPhoneSaving ? "שומר..." : "שמירת מספר"}
          </button>
        </div>
      )}
    </section>
  );
}
