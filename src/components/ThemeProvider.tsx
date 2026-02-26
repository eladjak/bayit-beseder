"use client";

import { useEffect } from "react";

/**
 * ThemeProvider - applies the saved theme (or system preference) to <html>
 * before React hydration so there is no flash of un-themed content.
 *
 * Place this near the top of the root layout body so it runs as early
 * as possible on the client.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem("bayit-beseder-theme");
    const isDark =
      stored === "dark" ||
      (stored !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Listen for OS-level changes when in "system" mode
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const current = localStorage.getItem("bayit-beseder-theme");
      if (current === "light" || current === "dark") return; // user override
      if (e.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return <>{children}</>;
}

/**
 * Inline script injected into <head> to apply dark mode before any paint.
 * This prevents flash of light mode when user has dark preference saved.
 */
export function ThemeScript() {
  const script = `
(function(){
  try {
    var t = localStorage.getItem('bayit-beseder-theme');
    var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch(e){}
})();
`.trim();

  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional theme init script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
