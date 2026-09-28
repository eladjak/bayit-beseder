"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface DangerZoneProps {
  onClearLocalData: () => void;
}

// Note: this used to also render its own "activate emergency" card and its
// own logout button. The emergency card was a straight duplicate of the
// emergency-page link the settings page already shows near the top (same
// destination, same copy) — removed. Logout moved out to settings/page.tsx
// directly, since it now lives inside a collapsible section here and must
// stay reachable without opening that section first.
export function DangerZone({ onClearLocalData }: DangerZoneProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* About & Data Management */}
      <div className="space-y-4">
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
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {t("common.login") === "Login" ? "Blog" : "בלוג"}
            </Link>
            <a
              href="https://github.com/eladjak/bayit-beseder"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              GitHub
            </a>
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
      </div>
    </>
  );
}
