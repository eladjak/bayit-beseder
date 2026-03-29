"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { useShoppingShare } from "@/hooks/useShoppingShare";
import type { ShoppingItem } from "@/hooks/useShoppingList";

interface ShoppingShareSheetProps {
  open: boolean;
  onClose: () => void;
  items: ShoppingItem[];
}

export function ShoppingShareSheet({ open, onClose, items }: ShoppingShareSheetProps) {
  const { t } = useTranslation();
  const { formatShoppingList, shareViaWhatsApp, shareNative, copyToClipboard } =
    useShoppingShare();

  const text = formatShoppingList(items);
  const hasItems = text.length > 0;

  async function handleWhatsApp() {
    if (!hasItems) return;
    shareViaWhatsApp(text);
    onClose();
  }

  async function handleNativeShare() {
    if (!hasItems) return;
    const shared = await shareNative(text);
    if (!shared) {
      // Fallback to copy if native share not supported
      await handleCopy();
      return;
    }
    onClose();
  }

  async function handleCopy() {
    if (!hasItems) return;
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(t("shopping.share.copied"));
    } else {
      toast.error(t("shopping.share.copyFailed"));
    }
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          {/* Bottom sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-background border-t border-border shadow-2xl pb-safe"
            role="dialog"
            aria-modal="true"
            aria-label={t("shopping.share.title")}
            dir="rtl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="px-5 pb-8 space-y-4">
              {/* Title row */}
              <div className="flex items-center justify-between py-1">
                <h2 className="text-base font-bold text-foreground">
                  {t("shopping.share.title")}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-surface transition-colors"
                  aria-label={t("common.close")}
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>

              {!hasItems ? (
                <p className="text-sm text-muted text-center py-4">
                  {t("shopping.share.emptyList")}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {/* WhatsApp */}
                  <button
                    onClick={handleWhatsApp}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 text-sm font-semibold text-[#1a9e4d] dark:text-[#25D366] hover:bg-[#25D366]/15 transition-colors active:scale-[0.98]"
                  >
                    <span className="text-xl">📱</span>
                    {t("shopping.share.whatsapp")}
                  </button>

                  {/* Native share (only on supporting devices) */}
                  {typeof navigator !== "undefined" && !!navigator.share && (
                    <button
                      onClick={handleNativeShare}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 text-sm font-semibold text-primary hover:bg-primary/15 transition-colors active:scale-[0.98]"
                    >
                      <Share2 className="w-5 h-5" />
                      {t("shopping.share.native")}
                    </button>
                  )}

                  {/* Copy to clipboard */}
                  <button
                    onClick={handleCopy}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-surface border border-border text-sm font-semibold text-foreground hover:bg-surface-hover transition-colors active:scale-[0.98]"
                  >
                    <Copy className="w-5 h-5 text-muted" />
                    {t("shopping.share.copy")}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
