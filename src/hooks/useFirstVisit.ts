"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_PREFIX = "bayit-first-visit-";
const AUTO_DISMISS_MS = 8000;

interface UseFirstVisitReturn {
  isFirstVisit: boolean;
  dismiss: () => void;
}

export function useFirstVisit(pageKey: string): UseFirstVisitReturn {
  const storageKey = `${STORAGE_PREFIX}${pageKey}`;

  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setIsFirstVisit(true);
    }
  }, [storageKey]);

  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "1");
    }
    setIsFirstVisit(false);
  }, [storageKey]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!isFirstVisit) return;
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [isFirstVisit, dismiss]);

  return { isFirstVisit, dismiss };
}
