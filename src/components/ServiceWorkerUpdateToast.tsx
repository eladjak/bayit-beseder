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

    let pollId: number | undefined;

    const showToast = () => {
      toast(t("common.newVersionAvailable"), {
        duration: Infinity,
        id: "sw-update",
        action: {
          label: t("common.refresh"),
          onClick: () => window.location.reload(),
        },
      });
    };

    // Hold the toast back while a modal dialog is open.
    //
    // WHY — this toast is `duration: Infinity` and renders top-center. On a
    // 390px phone it is ~352px wide and sits at y=16, directly on top of the
    // onboarding dialogs' "דלג"/"סגור" controls. Verified on production: a
    // first-run user could not dismiss the setup wizard, because the one
    // notice they could not dismiss was covering the button that dismisses it.
    const modalOpen = () => !!document.querySelector('[aria-modal="true"]');

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== "SW_UPDATED") return;
      if (!modalOpen()) {
        showToast();
        return;
      }
      window.clearInterval(pollId);
      pollId = window.setInterval(() => {
        if (modalOpen()) return;
        window.clearInterval(pollId);
        showToast();
      }, 400);
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      window.clearInterval(pollId);
    };
  }, [t]);

  return null;
}
