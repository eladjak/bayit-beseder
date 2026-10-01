"use client";

import { useId, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Star, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const MAX_MESSAGE = 2000;

/**
 * In-app feedback: opens a dialog with a 1-5 star radio group and an optional
 * message, POSTs to /api/feedback. Focus trap + Escape come from useFocusTrap.
 */
export function FeedbackButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const titleId = useId();
  const ratingId = useId();
  const messageId = useId();

  const close = () => {
    if (!sending) setOpen(false);
  };
  const focusRef = useFocusTrap<HTMLDivElement>(open, close);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      toast.error(t("feedback.ratingRequired"));
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          message: message.trim() || undefined,
          page: pathname?.slice(0, 200),
        }),
      });
      if (res.status === 429) {
        toast.error(t("feedback.rateLimited"));
      } else if (!res.ok) {
        toast.error(t("feedback.error"));
      } else {
        toast.success(t("feedback.success"));
        setOpen(false);
        setRating(0);
        setMessage("");
      }
    } catch {
      toast.error(t("feedback.error"));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-foreground text-xs font-semibold hover:bg-surface-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        }
      >
        <Star className="w-3.5 h-3.5" aria-hidden /> {t("feedback.button")}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="fb-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={close}
              aria-hidden
            />
            <motion.div
              key="fb-modal"
              ref={focusRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.15 }}
              dir="rtl"
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden"
            >
              <form onSubmit={submit}>
                <div className="flex items-center gap-3 p-4 border-b border-border">
                  <h2 id={titleId} className="font-semibold text-foreground flex-1">
                    {t("feedback.title")}
                  </h2>
                  <button
                    type="button"
                    onClick={close}
                    aria-label={t("common.close")}
                    className="p-1.5 text-muted hover:text-foreground rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <fieldset>
                    <legend id={ratingId} className="text-sm font-medium text-foreground mb-2">
                      {t("feedback.ratingLabel")}
                    </legend>
                    <div role="radiogroup" aria-labelledby={ratingId} className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <label
                          key={n}
                          className="cursor-pointer p-1 rounded-lg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
                        >
                          <input
                            type="radio"
                            name="feedback-rating"
                            value={n}
                            checked={rating === n}
                            onChange={() => setRating(n)}
                            className="sr-only"
                            aria-label={t("feedback.star").replace("{n}", String(n))}
                          />
                          <Star
                            aria-hidden
                            className={`w-8 h-8 ${
                              n <= rating ? "fill-amber-400 text-amber-400" : "text-muted"
                            }`}
                          />
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor={messageId} className="block text-sm font-medium text-foreground mb-1">
                      {t("feedback.messageLabel")}
                    </label>
                    <textarea
                      id={messageId}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={MAX_MESSAGE}
                      rows={4}
                      placeholder={t("feedback.messagePlaceholder")}
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-2 p-4 border-t border-border">
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex-1 px-3 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {sending ? t("feedback.sending") : t("feedback.submit")}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="px-3 py-2.5 rounded-xl border border-border text-sm text-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {t("feedback.cancel")}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
