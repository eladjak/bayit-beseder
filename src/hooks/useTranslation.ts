"use client";

import { useCallback } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import heDict from "@/lib/i18n/dictionaries/he.json";
import enDict from "@/lib/i18n/dictionaries/en.json";
import type { Locale } from "@/lib/i18n";

type Dictionary = typeof heDict;

const dictionaries: Record<Locale, Dictionary> = {
  he: heDict,
  en: enDict,
};

/**
 * Resolve a dot-separated key path against a nested object.
 * e.g. getNestedValue(dict, "nav.home") → "ראשי"
 */
function getNestedValue(obj: unknown, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : path;
}

/**
 * useTranslation — returns a `t()` function that resolves translation keys
 * for the current locale.
 *
 * Usage:
 *   const { t, locale } = useTranslation();
 *   t("nav.home")        // "ראשי" (he) | "Home" (en)
 *   t("common.loading")  // "טוען..." (he) | "Loading..." (en)
 */
export function useTranslation() {
  const { locale, setLocale } = useLanguage();
  const dict = dictionaries[locale];

  const t = useCallback(
    (key: string): string => getNestedValue(dict, key),
    [dict],
  );

  return { t, locale, setLocale };
}
