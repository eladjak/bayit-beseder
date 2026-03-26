"use client";

import Link from "next/link";
import { AlertTriangle, LogOut, ExternalLink } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface DangerZoneProps {
  isDemo: boolean;
  onLogout: () => void;
  onClearLocalData: () => void;
}

export function DangerZone({ isDemo, onLogout, onClearLocalData }: DangerZoneProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Emergency */}
      <section className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">
            {t("settings.dangerSection.emergencyTitle")}
          </h2>
        </div>
        <p className="text-xs text-muted mb-3">
          {t("settings.dangerSection.emergencyDesc")}
        </p>
        <button className="w-full py-2.5 rounded-xl border border-border bg-surface text-sm font-medium text-foreground hover:bg-surface-hover transition-all duration-100 active:scale-[0.98]">
          {t("settings.dangerSection.activateEmergency")}
        </button>
      </section>

      {/* About & Data Management */}
      <section className="card-elevated p-4 space-y-4">
        <div>
          <h2 className="font-semibold text-sm mb-2">
            {t("settings.dangerSection.aboutTitle")}
          </h2>
          <div className="space-y-2 text-xs text-muted">
            <div className="flex justify-between">
              <span>{t("settings.version")}</span>
              <span className="text-foreground font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>{t("settings.developer")}</span>
              <span className="text-foreground font-medium">אלעד</span>
            </div>
            <div className="flex justify-between">
              <span>{t("settings.dangerSection.builtWith")}</span>
              <span className="text-foreground font-medium">
                {t("settings.dangerSection.appName")}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {t("settings.dangerSection.homePage")}
            </Link>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {t("settings.dangerSection.privacyPolicy")}
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {t("settings.dangerSection.terms")}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {t("settings.dangerSection.contact")}
            </Link>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h2 className="font-semibold text-sm mb-2">
            {t("settings.dangerSection.dataTitle")}
          </h2>
          <p className="text-xs text-muted mb-3">
            {t("settings.dangerSection.dataDesc")}
          </p>
          <button
            onClick={onClearLocalData}
            className="w-full py-2.5 rounded-xl border border-danger/30 text-sm font-medium text-danger hover:bg-danger/5 transition-all duration-100 active:scale-[0.97]"
          >
            {t("settings.dangerSection.clearData")}
          </button>
        </div>
      </section>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 text-danger text-sm font-medium transition-all duration-100 active:scale-[0.97] hover:opacity-80"
      >
        <LogOut className="w-4 h-4" />
        {isDemo
          ? t("settings.dangerSection.backToLogin")
          : t("settings.dangerSection.logout")}
      </button>
    </>
  );
}
