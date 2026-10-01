"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/notifications";

/**
 * Invisible component that registers the service worker on mount.
 * Placed in the app layout so it runs once per session.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker();

    // An installed app is often resumed from the background without a reload, so the
    // browser's own "check sw.js on navigation" never happens. Check on every resume.
    const checkForUpdate = () => {
      if (document.visibilityState !== "visible") return;
      navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {});
    };
    document.addEventListener("visibilitychange", checkForUpdate);
    return () => document.removeEventListener("visibilitychange", checkForUpdate);
  }, []);

  return null;
}
