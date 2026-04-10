"use client";

import {
  Calendar,
  Wand2,
  Plus,
  LayoutGrid,
  List,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { ShareButton } from "@/components/share-button";
import { useFirstVisit } from "@/hooks/useFirstVisit";
import { FeatureTooltip } from "@/components/feature-tooltip";

interface WeeklyHeaderStats {
  total: number;
  completionRate: number;
  myTasks: number;
  partnerTasks: number;
}

interface WeeklyHeaderProps {
  weekRange: string;
  stats: WeeklyHeaderStats;
  zoneMode: boolean;
  calendarConnected: boolean;
  calendarEventsCount: number;
  partnerName?: string;
  onOpenWizard: () => void;
  onToggleZoneMode: () => void;
  onOpenZonePicker: () => void;
}

export function WeeklyHeader({
  weekRange,
  stats,
  zoneMode,
  calendarConnected,
  calendarEventsCount,
  partnerName,
  onOpenWizard,
  onToggleZoneMode,
  onOpenZonePicker,
}: WeeklyHeaderProps) {
  const { t } = useTranslation();
  const { isFirstVisit: showWizardTip, dismiss: dismissWizardTip } = useFirstVisit("weekly");

  function handleWizardClick() {
    dismissWizardTip();
    onOpenWizard();
  }

  return (
    <div className="gradient-hero mesh-overlay rounded-b-[2rem] px-4 pt-6 pb-5 overflow-hidden">
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {t("weekly.title")} 🗓️
            </h1>
            <ShareButton
              title={t("share.weeklyPlan")}
              text={t("share.weeklyText")}
              url={
                typeof window !== "undefined"
                  ? window.location.href
                  : "https://www.bayitbeseder.com"
              }
              className="!bg-white/20 !text-white border border-white/20 hover:!bg-white/30"
            />
          </div>
          <p className="text-sm text-white/60 mt-0.5">{weekRange}</p>
          <p className="text-xs text-white/70 mt-1">{t("weekly.subtitle")}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Primary CTA: wizard OR manual */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={handleWizardClick}
                className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-primary text-sm font-bold shadow-lg active:scale-95 transition-transform"
                title={t("weekly.wizardCreateTitle")}
              >
                <Wand2 className="w-4 h-4" />
                <span>{t("weekly.wizardCta")}</span>
              </button>
              <FeatureTooltip
                visible={showWizardTip}
                text="לחצו כאן כדי ליצור תוכנית שבועית אוטומטית!"
                onDismiss={dismissWizardTip}
                position="below"
              />
            </div>
            <button
              onClick={() => toast.info(t("weekly.manualModeToast"))}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 text-white text-xs font-medium border border-white/20 active:scale-95 transition-transform"
              title={t("weekly.manualModeTitle")}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("weekly.manualMode")}</span>
            </button>
          </div>

          {/* Secondary controls row */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleZoneMode}
              className={`flex items-center gap-1 px-2.5 py-1.5 backdrop-blur-sm rounded-xl border transition-colors active:scale-95 ${
                zoneMode
                  ? "bg-white/30 border-white/30"
                  : "bg-white/12 border-white/10 hover:bg-white/20"
              }`}
              title={t("weekly.zoneMode")}
            >
              {zoneMode ? (
                <LayoutGrid className="w-3.5 h-3.5 text-white" />
              ) : (
                <List className="w-3.5 h-3.5 text-white" />
              )}
              <span className="text-[11px] font-medium text-white">
                {zoneMode ? t("weekly.viewZones") : t("weekly.viewList")}
              </span>
            </button>
            {zoneMode && (
              <button
                onClick={onOpenZonePicker}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/30 transition-colors active:scale-95"
                title={t("weekly.configureZonesTitle")}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] font-medium text-white">
                  {t("weekly.viewZones")}
                </span>
              </button>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/12 backdrop-blur-sm rounded-xl border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-white" />
              <span className="text-[11px] font-medium text-white">
                {stats.total} {t("weekly.taskCount")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Week summary stats */}
      <div className={`grid gap-2 ${calendarConnected ? "grid-cols-4" : "grid-cols-3"}`}>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
          <div className="text-xs text-white/70 mb-0.5">{t("weekly.statCompleted")}</div>
          <div className="text-lg font-bold text-white">{stats.completionRate}%</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
          <div className="text-xs text-white/70 mb-0.5">{t("weekly.statMine")}</div>
          <div className="text-lg font-bold text-white">{stats.myTasks}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
          <div className="text-xs text-white/70 mb-0.5">
            {partnerName || t("weekly.statPartnerFallback")}
          </div>
          <div className="text-lg font-bold text-white">{stats.partnerTasks}</div>
        </div>
        {calendarConnected && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
            <div className="text-xs text-white/70 mb-0.5">{t("weekly.statCalendar")}</div>
            <div className="text-lg font-bold text-white">{calendarEventsCount}</div>
          </div>
        )}
      </div>
    </div>
  );
}
