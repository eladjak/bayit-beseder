"use client";

import { useState, useEffect, useCallback } from "react";

export type ThemeColorKey = "indigo" | "blue" | "purple" | "pink" | "green" | "orange";

export interface ThemeColor {
  primary: string;
  nameHe: string;
  nameEn: string;
}

export const THEME_COLORS: Record<ThemeColorKey, ThemeColor> = {
  indigo: { primary: "#4F46E5", nameHe: "אינדיגו", nameEn: "Indigo" },
  blue: { primary: "#2563EB", nameHe: "כחול", nameEn: "Blue" },
  purple: { primary: "#7C3AED", nameHe: "סגול", nameEn: "Purple" },
  pink: { primary: "#DB2777", nameHe: "ורוד", nameEn: "Pink" },
  green: { primary: "#059669", nameHe: "ירוק", nameEn: "Green" },
  orange: { primary: "#EA580C", nameHe: "כתום", nameEn: "Orange" },
};

const STORAGE_KEY = "bayit-theme-color";
const DEFAULT_COLOR: ThemeColorKey = "indigo";

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyThemeColor(colorKey: ThemeColorKey): void {
  if (typeof window === "undefined") return;
  const color = THEME_COLORS[colorKey];
  const hsl = hexToHsl(color.primary);
  document.documentElement.style.setProperty("--color-primary", hsl);
}

export function getStoredThemeColor(): ThemeColorKey {
  if (typeof window === "undefined") return DEFAULT_COLOR;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in THEME_COLORS) return stored as ThemeColorKey;
  return DEFAULT_COLOR;
}

export function useThemeColor() {
  const [currentColor, setCurrentColorState] = useState<ThemeColorKey>(DEFAULT_COLOR);

  useEffect(() => {
    const stored = getStoredThemeColor();
    setCurrentColorState(stored);
    applyThemeColor(stored);
  }, []);

  const setColor = useCallback((colorKey: ThemeColorKey) => {
    setCurrentColorState(colorKey);
    applyThemeColor(colorKey);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, colorKey);
    }
  }, []);

  return {
    currentColor,
    setColor,
    colors: THEME_COLORS,
  };
}
