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
  }, []);

  return null;
}
