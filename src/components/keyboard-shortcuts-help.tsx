"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { KEYBOARD_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { useTranslation } from "@/hooks/useTranslation";

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

function KeyChip({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1.5 rounded-md bg-surface border border-border text-xs font-mono font-medium text-foreground shadow-sm">
      {label}
    </kbd>
  );
}

/**
 * KeyboardShortcutsHelp — modal displaying all available keyboard shortcuts.
 * Triggered by the "?" key. Desktop-only content.
 */
export function KeyboardShortcutsHelp({
  isOpen,
  onClose,
}: KeyboardShortcutsHelpProps) {
  const { t } = useTranslation();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Detect Mac for key display
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="kb-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
            aria-hidden
          />
          {/* Modal */}
          <motion.div
            key="kb-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("shortcuts.modalTitle")}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            dir="rtl"
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Keyboard className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground flex-1">
                {t("shortcuts.modalTitle")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
                className="p-1.5 text-muted hover:text-foreground rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shortcuts list */}
            <div className="p-4 space-y-1">
              {KEYBOARD_SHORTCUTS.map((shortcut) => {
                const keys = isMac ? shortcut.macKeys : shortcut.keys;
                const description = t(shortcut.descriptionKey) === shortcut.descriptionKey
                  ? shortcut.description
                  : t(shortcut.descriptionKey);

                return (
                  <div
                    key={shortcut.descriptionKey}
                    className="flex items-center justify-between py-2.5 px-1 border-b border-border/50 last:border-0"
                  >
                    <span className="text-sm text-foreground">{description}</span>
                    <div className="flex items-center gap-1">
                      {keys.map((key, idx) => (
                        <span key={`${shortcut.descriptionKey}-key-${idx}`} className="flex items-center gap-1">
                          <KeyChip label={key} />
                          {idx < keys.length - 1 && (
                            <span className="text-xs text-muted">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-4 pb-4">
              <p className="text-[11px] text-muted text-center">
                {t("shortcuts.desktopOnly")}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
