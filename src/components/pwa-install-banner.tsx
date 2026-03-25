"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

/**
 * PWA Install Banner — shows a subtle banner prompting users to install
 * the app on their home screen. Dismissible for 7 days.
 */
export function PWAInstallBanner() {
  const { canInstall, promptInstall, dismiss } = usePWAInstall();

  return (
    <AnimatePresence>
      {canInstall && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          role="complementary"
          aria-label="הצעת התקנה"
          className="mx-4 mt-2 mb-1"
          dir="rtl"
        >
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/10 border border-primary/20">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                התקינו את בית בסדר
              </p>
              <p className="text-[10px] text-muted leading-tight">
                גישה מהירה מהמסך הראשי
              </p>
            </div>
            <button
              type="button"
              onClick={promptInstall}
              aria-label="התקן את האפליקציה על המסך הראשי"
              className="px-3 py-1.5 rounded-xl gradient-primary text-white text-xs font-semibold shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              התקנה
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="p-1 text-muted hover:text-foreground transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              aria-label="סגור הצעת ההתקנה"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
