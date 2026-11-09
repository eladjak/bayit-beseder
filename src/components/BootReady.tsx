"use client";

import { useEffect } from "react";

/**
 * Signals to the inline boot guard (see src/lib/boot-guard.ts) that the app
 * hydrated: removes any recovery fallback and resets the reload-once guard.
 */
export function BootReady() {
  useEffect(() => {
    document.documentElement.setAttribute("data-hydrated", "1");
    document.getElementById("bbs-fallback")?.remove();
    try {
      sessionStorage.removeItem("bbs-recover-at");
    } catch {
      // storage unavailable — nothing to reset
    }
  }, []);
  return null;
}
