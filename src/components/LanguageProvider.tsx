"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Locale } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";

const STORAGE_KEY = "bayit-beseder-language";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "he",
  setLocale: () => undefined,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("he");

  // Hydrate from localStorage on mount (check both keys for backwards compat)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    const legacy = localStorage.getItem("bayit-language") as Locale | null;
    const value = stored ?? legacy;
    if (value === "he" || value === "en") {
      setLocaleState(value);
      // Ensure both keys are in sync
      localStorage.setItem(STORAGE_KEY, value);
      localStorage.setItem("bayit-language", value);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    // Also sync the legacy key used by the settings page
    localStorage.setItem("bayit-language", next);
    // Update document direction and lang immediately
    document.documentElement.dir = next === "he" ? "rtl" : "ltr";
    document.documentElement.lang = next;
    trackEvent("language_switch", { lang: next });
  }, []);

  // Sync dir/lang on mount and locale changes
  useEffect(() => {
    document.documentElement.dir = locale === "he" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
