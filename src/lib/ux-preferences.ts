/**
 * UX Preferences — Alopik v2 Phase 2 #5.
 *
 * 4 independent toggles: Theme / Haptics / Sounds / Night-mode.
 * Night-mode ≠ Dark-theme — mutes sounds + reduces brightness + reduces motion.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

export type Theme = "light" | "dark" | "auto";
export type Toggle = boolean;

export type UxPreferences = {
  readonly theme: Theme;
  readonly haptics: Toggle;
  readonly sounds: Toggle;
  readonly notifications: Toggle;
  readonly nightMode: Toggle;
};

export const DEFAULT_PREFS: UxPreferences = {
  theme: "auto",
  haptics: true,
  sounds: true,
  notifications: true,
  nightMode: false,
};

const STORAGE_KEY = "bayit-ux-preferences-v1";

export function loadPreferences(): UxPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<UxPreferences>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePreferences(prefs: UxPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage quota / disabled — silently ignore
  }
}

/** Trigger short device haptic — only if user enabled */
export function tryHaptic(pattern: number | number[] = 10): void {
  if (typeof navigator === "undefined") return;
  const prefs = loadPreferences();
  if (!prefs.haptics) return;
  // Night mode suppresses haptics for "not waking partner"
  if (prefs.nightMode) return;
  try {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    // No-op
  }
}

/** Should sounds play? Respects both Sounds toggle + Night-mode */
export function shouldPlaySound(): boolean {
  const prefs = loadPreferences();
  if (!prefs.sounds) return false;
  if (prefs.nightMode) return false;
  return true;
}

/** Should animations be reduced? Respects Night-mode + OS prefers-reduced-motion */
export function shouldReduceMotion(): boolean {
  const prefs = loadPreferences();
  if (prefs.nightMode) return true;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return false;
}
