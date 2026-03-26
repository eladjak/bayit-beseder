"use client";

import { useTranslation } from "@/hooks/useTranslation";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div dir="rtl" className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <div className="card-elevated p-8 text-center max-w-sm w-full">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-lg font-bold text-foreground mb-2">{t("common.error")}</h2>
        <p className="text-sm text-muted mb-6">
          {t("common.error")}. {t("common.retry")}.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="w-full px-6 py-2.5 rounded-2xl gradient-primary text-white font-semibold text-sm shadow-md shadow-primary/20 active:scale-95 transition-transform"
          >
            {t("common.retry")}
          </button>
          <a
            href="/dashboard"
            className="w-full inline-block px-6 py-2.5 rounded-xl border border-border text-muted font-medium text-sm hover:text-foreground transition-colors"
          >
            {t("notFound.toDashboard")}
          </a>
        </div>
        <p className="text-[10px] text-muted/60 mt-4">
          🧪 <a href="mailto:eladjak@gmail.com?subject=Bug Report — Bayit BeSeder" className="underline hover:text-primary">
            {t("common.login") === "Login" ? "Report this bug" : "דווחו על הבאג"}
          </a>
        </p>
      </div>
    </div>
  );
}
