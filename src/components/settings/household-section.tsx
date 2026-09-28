"use client";

import { Save, Loader2, Copy, Check } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { InlineHelp } from "@/components/ui/inline-help";

interface HouseholdSectionProps {
  householdName: string;
  city: string;
  cityError: string | null;
  goldenTarget: number;
  inviteCode: string;
  copied: boolean;
  householdSaving: boolean;
  onNameChange: (name: string) => void;
  onCityChange: (city: string) => void;
  onTargetChange: (target: number) => void;
  onCopyInviteCode: () => void;
  onSave: () => void;
}

export function HouseholdSection({
  householdName,
  city,
  cityError,
  goldenTarget,
  inviteCode,
  copied,
  householdSaving,
  onNameChange,
  onCityChange,
  onTargetChange,
  onCopyInviteCode,
  onSave,
}: HouseholdSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted block mb-1">
          {t("settings.householdSection.householdNameLabel")}
        </label>
        <input
          type="text"
          value={householdName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full bg-background dark:bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
        />
      </div>
      <div>
        <label htmlFor="household-city" className="text-xs text-muted block mb-1">
          {t("settings.householdSection.cityLabel")}
        </label>
        <input
          id="household-city"
          type="text"
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder={t("settings.householdSection.cityPlaceholder")}
          maxLength={100}
          aria-invalid={cityError ? true : undefined}
          aria-describedby={cityError ? "household-city-error" : undefined}
          className="w-full bg-background dark:bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
        />
        {cityError ? (
          <p id="household-city-error" className="text-[11px] text-danger mt-1">
            {cityError}
          </p>
        ) : null}
      </div>
      <div>
        <label className="text-xs text-muted block mb-1">
          {t("settings.householdSection.inviteCodeLabel")}
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground">
            {inviteCode}
          </code>
          <button
            onClick={onCopyInviteCode}
            className="p-2 rounded-lg bg-background border border-border hover:bg-surface-hover text-muted"
            aria-label={t("settings.householdSection.copyInviteCode")}
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
        <label className="text-xs text-muted mb-2 flex items-center gap-1">
          {t("settings.householdSection.goldenTargetLabel")}: {goldenTarget}%
          <InlineHelp
            text={t("settings.householdSection.goldenTargetHelp")}
            label={t("settings.householdSection.goldenTargetHelpLabel")}
          />
        </label>
        <input
          type="range"
          min={50}
          max={100}
          value={goldenTarget}
          onChange={(e) => onTargetChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted mt-1">
          <span>50%</span>
          <span>100%</span>
        </div>
        <p className="text-[10px] text-muted mt-2">
          {goldenTarget === 50
            ? t("settings.householdSection.splitEqual")
            : goldenTarget >= 80
              ? t("settings.householdSection.highTarget")
              : t("settings.householdSection.balancedTarget")}
        </p>
      </div>
      {/* Save household button */}
      <button
        onClick={onSave}
        disabled={householdSaving}
        className="flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-2xl text-sm font-semibold transition-all duration-100 active:scale-[0.97] disabled:opacity-50 shadow-md shadow-primary/20"
      >
        {householdSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {householdSaving
          ? t("settings.householdSection.saving")
          : t("settings.householdSection.saveHousehold")}
      </button>
    </div>
  );
}
