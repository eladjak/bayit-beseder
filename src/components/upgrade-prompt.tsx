"use client";

import { Lock, Sparkles } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import type { GatedFeature } from "@/hooks/useSubscription";

interface UpgradePromptProps {
  feature: GatedFeature;
  /** Override the displayed feature name (falls back to i18n key) */
  featureLabel?: string;
  /** Short description of the benefit */
  description?: string;
  /** Render a compact inline version instead of the full card */
  compact?: boolean;
  /** Extra CSS classes */
  className?: string;
}

const FEATURE_I18N_KEYS: Record<GatedFeature, string> = {
  wizard: "upgrade.features.wizard",
  stats_full: "upgrade.features.stats",
  coaching: "upgrade.features.coaching",
  seasonal: "upgrade.features.seasonal",
  zone_scheduling: "upgrade.features.zone_scheduling",
  custom_categories: "upgrade.features.categories",
  whatsapp: "upgrade.features.whatsapp",
  unlimited_tasks: "upgrade.features.unlimited_tasks",
  achievements_full: "upgrade.features.achievements_full",
  weekly_challenges: "upgrade.features.weekly_challenges",
  leaderboard: "upgrade.features.leaderboard",
  export: "upgrade.features.export",
  family_members: "upgrade.features.family_members",
  child_profiles: "upgrade.features.child_profiles",
  parent_approval: "upgrade.features.parent_approval",
};

export function UpgradePrompt({
  feature,
  featureLabel,
  description,
  compact = false,
  className = "",
}: UpgradePromptProps) {
  const { t } = useTranslation();

  const label = featureLabel ?? t(FEATURE_I18N_KEYS[feature]);
  const title = t("upgrade.title");
  const cta = t("upgrade.cta");

  if (compact) {
    return (
      <div
        dir="rtl"
        className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 ${className}`}
      >
        <Lock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
        <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium flex-1">
          {label}
        </span>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex-shrink-0">
          {t("upgrade.comingSoon")}
        </span>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className={`rounded-2xl overflow-hidden shadow-sm border border-indigo-200/50 dark:border-indigo-800/30 ${className}`}
    >
      {/* Gradient header */}
      <div className="bg-gradient-to-l from-indigo-600 to-violet-600 px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-white/70">{label}</p>
            <h3 className="text-base font-bold text-white leading-tight">{title}</h3>
          </div>
        </div>

        {description && (
          <p className="text-sm text-white/80 leading-relaxed mt-1">{description}</p>
        )}
      </div>

      {/* CTA footer — Sprint 7.30+ Elad: real upgrade CTA, not "comingSoon" dead-end */}
      <div className="bg-white dark:bg-zinc-900 px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{t("upgrade.fromPrice")}</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-0.5">בחינם ל-30 יום · ביטול בכל רגע</span>
        </div>
        <a
          href="/upgrade"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-l from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-md hover:shadow-lg active:scale-95 transition-transform"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {cta}
        </a>
      </div>
    </div>
  );
}
