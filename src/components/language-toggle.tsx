"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * LanguageToggle — a small fixed-position pill that lets the user switch
 * between Hebrew and English on any app page.
 *
 * Placement: top-left corner (the less-trafficked corner in an RTL layout).
 * z-index 30 keeps it above page content but below modals/drawers.
 */
export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  const isHebrew = locale === "he";
  // Label shown = the language you'll switch TO (so you know what you're clicking)
  const label = isHebrew ? "EN" : "עב";

  return (
    <motion.button
      key={locale}
      onClick={() => setLocale(isHebrew ? "en" : "he")}
      aria-label={isHebrew ? "Switch to English" : "עבור לעברית"}
      className={[
        "fixed top-3 left-3 z-30",
        "h-7 min-w-[28px] px-2",
        "rounded-full",
        "bg-background/70 backdrop-blur-sm",
        "border border-border/60",
        "text-xs font-semibold text-muted-foreground",
        "shadow-sm",
        "flex items-center justify-center",
        "select-none cursor-pointer",
        "transition-colors hover:bg-background hover:text-foreground hover:border-border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      ].join(" ")}
      whileTap={{ scale: 0.88 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.12 }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
