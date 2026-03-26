"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Listens for SW_UPDATED messages from the service worker and shows a
 * "new version available" toast with a reload button.
 *
 * The service worker broadcasts this message after it activates and takes
 * control of all clients, signalling that stale chunks have been replaced.
 */
export function ServiceWorkerUpdateToast() {
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        toast(t("common.newVersionAvailable"), {
          duration: Infinity,
          id: "sw-update",
          action: {
            label: t("common.refresh"),
            onClick: () => window.location.reload(),
          },
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [t]);

  return null;
}
