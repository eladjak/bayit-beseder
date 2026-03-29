"use client";

import { useState, useCallback } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useWebShare } from "@/hooks/useWebShare";
import { useTranslation } from "@/hooks/useTranslation";

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
  /** Visual variant */
  variant?: "icon" | "text" | "full";
  className?: string;
}

/**
 * ShareButton — uses the Web Share API on mobile, clipboard on desktop.
 * Shows a checkmark feedback on success.
 *
 * On mobile: opens native share sheet.
 * On desktop: copies to clipboard and shows toast "הקישור הועתק".
 */
export function ShareButton({
  title,
  text,
  url,
  variant = "icon",
  className = "",
}: ShareButtonProps) {
  const { share } = useWebShare();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const usedNative = await share({ title, text, url });
    if (!usedNative) {
      // Clipboard fallback — show toast
      toast.success(t("share.copied"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [share, title, text, url, t]);

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label={t("share.label")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Check className="w-4 h-4" />
            </motion.span>
          ) : (
            <motion.span
              key="share"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Share2 className="w-4 h-4" />
            </motion.span>
          )}
        </AnimatePresence>
        {copied ? t("share.copied") : t("share.button")}
      </button>
    );
  }

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label={t("share.label")}
        className={`flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded ${className}`}
      >
        {copied ? (
          <Copy className="w-3.5 h-3.5" />
        ) : (
          <Share2 className="w-3.5 h-3.5" />
        )}
        {copied ? t("share.copied") : t("share.button")}
      </button>
    );
  }

  // Default: icon only
  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={t("share.label")}
      className={`w-9 h-9 flex items-center justify-center rounded-xl bg-surface-hover hover:bg-border/30 text-muted-foreground hover:text-foreground transition-colors active:scale-[0.90] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check className="w-4 h-4 text-green-500" />
          </motion.span>
        ) : (
          <motion.span
            key="share"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Share2 className="w-4 h-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
