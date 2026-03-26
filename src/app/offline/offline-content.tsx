"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = useCallback(() => {
    setRetrying(true);
    // Try to navigate to root — if online, it will succeed.
    // Small delay so the "retrying" state is visible.
    setTimeout(() => {
      window.location.href = "/";
    }, 800);
  }, []);

  return (
    <div
      dir="rtl"
      className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6 text-center bg-background"
    >
      {/* Icon */}
      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
        <span className="text-5xl" role="img" aria-label="בית">
          🏠
        </span>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          {t("offline.title")}
        </h1>
        <p className="text-base text-muted-foreground font-medium">
          {t("offline.subtitle")}
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {t("offline.description")}
        </p>
      </div>

      {/* Wifi off icon */}
      <WifiOff className="w-8 h-8 text-muted-foreground/50" />

      {/* Retry button */}
      <button
        type="button"
        onClick={handleRetry}
        disabled={retrying}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow transition-opacity disabled:opacity-60"
      >
        {retrying ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
            {t("offline.retrying")}
          </>
        ) : (
          t("offline.retry")
        )}
      </button>
    </div>
  );
}
