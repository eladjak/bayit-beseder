"use client";

import { useState, useEffect, useCallback } from "react";
import { trackEvent } from "@/lib/analytics";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "bayit-beseder-pwa-install-dismissed";
const DISMISSED_COUNT_KEY = "bayit-beseder-pwa-install-dismissed-count";
const DISMISSED_UNTIL_KEY = "bayit-beseder-pwa-install-dismissed-until";

// After 3 dismissals, suppress for 30 days
const MAX_DISMISSALS = 3;
const LONG_SUPPRESS_DAYS = 30;
const SHORT_SUPPRESS_DAYS = 7;

function isDismissedLongTerm(): boolean {
  if (typeof window === "undefined") return false;
  const until = localStorage.getItem(DISMISSED_UNTIL_KEY);
  if (until) {
    return Date.now() < Number(until);
  }
  return false;
}

function isRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const dismissedAt = localStorage.getItem(DISMISSED_KEY);
  if (!dismissedAt) return false;
  const sevenDays = SHORT_SUPPRESS_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - Number(dismissedAt) < sevenDays;
}

/**
 * usePWAInstall — captures the beforeinstallprompt event and provides
 * a way to trigger the native install prompt.
 *
 * Enhanced dismissal logic:
 * - After 3 dismissals → suppress for 30 days
 * - Otherwise → suppress for 7 days
 *
 * Returns:
 * - canInstall: true if the browser supports PWA install and user hasn't dismissed
 * - isInstalled: true if already running as a standalone PWA
 * - promptInstall: triggers the native install dialog
 * - dismiss: hide the prompt (tracks dismissal count)
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed as standalone
    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check dismissal state
    if (isDismissedLongTerm() || isRecentlyDismissed()) {
      setIsDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      setIsInstalled(true);
      trackEvent("pwa_install");
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);

    const countStr = localStorage.getItem(DISMISSED_COUNT_KEY) ?? "0";
    const newCount = Number(countStr) + 1;
    localStorage.setItem(DISMISSED_COUNT_KEY, String(newCount));

    if (newCount >= MAX_DISMISSALS) {
      // Suppress for 30 days after repeated dismissals
      const until = Date.now() + LONG_SUPPRESS_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(DISMISSED_UNTIL_KEY, String(until));
    } else {
      // Short-term suppression
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    }
  }, []);

  return {
    canInstall: !!deferredPrompt && !isInstalled && !isDismissed,
    isInstalled,
    promptInstall,
    dismiss,
  };
}
