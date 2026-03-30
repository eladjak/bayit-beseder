"use client";

import { useState, useCallback } from "react";

// ============================================
// Types
// ============================================

export interface NotificationPrefs {
  taskReminders: boolean;
  dailyDigest: boolean;
  achievements: boolean;
  weeklyChallenges: boolean;
  partnerUpdates: boolean;
  quietStart: string; // "HH:MM" e.g. "22:00"
  quietEnd: string;   // "HH:MM" e.g. "07:00"
}

const STORAGE_KEY = "bayit-notification-prefs";

const DEFAULT_PREFS: NotificationPrefs = {
  taskReminders: true,
  dailyDigest: true,
  achievements: true,
  weeklyChallenges: true,
  partnerUpdates: true,
  quietStart: "22:00",
  quietEnd: "07:00",
};

// ============================================
// Storage helpers
// ============================================

function loadPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotificationPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: NotificationPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

// ============================================
// Quiet hours helper
// ============================================

/**
 * Returns true if the given time (or now) falls within the quiet hours window.
 * Handles overnight windows (e.g. 22:00–07:00).
 */
export function checkIsQuietHours(
  quietStart: string,
  quietEnd: string,
  now: Date = new Date()
): boolean {
  const [startH, startM] = quietStart.split(":").map(Number);
  const [endH, endM] = quietEnd.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Same-day window (e.g. 09:00–17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  // Overnight window (e.g. 22:00–07:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

// ============================================
// Hook
// ============================================

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => loadPrefs());

  const updatePref = useCallback(
    <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
      setPrefs((prev) => {
        const updated = { ...prev, [key]: value };
        savePrefs(updated);
        return updated;
      });
    },
    []
  );

  const isQuietHours = useCallback(
    (now?: Date): boolean => checkIsQuietHours(prefs.quietStart, prefs.quietEnd, now),
    [prefs.quietStart, prefs.quietEnd]
  );

  return { prefs, updatePref, isQuietHours };
}
