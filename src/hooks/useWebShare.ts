"use client";

import { useCallback } from "react";

interface ShareData {
  title: string;
  text: string;
  url?: string;
}

/**
 * useWebShare — uses the native Web Share API on mobile/supporting browsers,
 * falls back to clipboard copy on desktop.
 *
 * Returns:
 * - isSupported: true if navigator.share is available
 * - share: triggers share sheet (or clipboard fallback), returns true if native share used
 */
export function useWebShare() {
  const isSupported =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const share = useCallback(
    async (data: ShareData): Promise<boolean> => {
      if (typeof navigator === "undefined") return false;

      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: data.title,
            text: data.text,
            url: data.url,
          });
          return true;
        } catch (err) {
          // User cancelled or share failed — fall through to clipboard
          if (err instanceof Error && err.name === "AbortError") {
            return false;
          }
        }
      }

      // Clipboard fallback
      if (typeof navigator.clipboard?.writeText === "function") {
        try {
          const content = data.url
            ? `${data.text}\n${data.url}`
            : data.text;
          await navigator.clipboard.writeText(content);
          return false; // returns false = used clipboard, not native share
        } catch {
          // Silent fail
        }
      }

      return false;
    },
    []
  );

  return { isSupported, share };
}
