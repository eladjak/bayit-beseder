"use client";

/**
 * Daily Surprise Box — Alopik v2 #2.
 *
 * Floating animated box icon appearing when first task of day completes.
 * Click → opens with confetti + reveals reward (70% small / 25% medium / 5% large).
 * Time-aware greeting (morning/afternoon/evening).
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md (commits 93c53b0, b0f7561)
 */

import { useEffect, useState, useTransition } from "react";
import { Gift, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  openTodayBox,
  isBoxAvailableToday,
  getTimeAwareGreeting,
  type Reward,
} from "@/lib/surprise-box";
import { playSparkle } from "@/lib/sound-effects";
import { tryHaptic } from "@/lib/ux-preferences";

type Props = {
  /** Trigger: parent calls onAvailable() when first task completed today */
  readonly trigger?: number;
};

export function SurpriseBox({ trigger = 0 }: Props) {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [reward, setReward] = useState<Reward | null>(null);
  const [pending, startTransition] = useTransition();

  // Check availability on mount + when trigger fires
  useEffect(() => {
    let cancelled = false;
    void isBoxAvailableToday().then((avail) => {
      if (!cancelled) setAvailable(avail);
    });
    return () => {
      cancelled = true;
    };
  }, [trigger]);

  const handleOpen = () => {
    startTransition(async () => {
      const result = await openTodayBox();
      if (!result.ok) {
        toast.error("שגיאה בפתיחת הקופסה");
        return;
      }
      if (result.alreadyOpened) {
        setAvailable(false);
        toast.info("כבר פתחת היום את הקופסה ✨");
        return;
      }
      playSparkle();
      tryHaptic([10, 20, 10, 20, 30]);
      setReward(result.reward);
      setOpen(true);
      setAvailable(false);
    });
  };

  if (!available && !open) return null;

  const greeting = getTimeAwareGreeting();

  return (
    <>
      {/* Floating box icon (available, not yet opened) */}
      {available && !open && (
        <button
          type="button"
          onClick={handleOpen}
          disabled={pending}
          aria-label="פתח את קופסת ההפתעה היומית"
          className="fixed bottom-44 end-4 z-40 size-14 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <Gift className="size-7" aria-hidden="true" />
          <Sparkles
            className="absolute -top-1 -end-1 size-4 text-yellow-200 animate-pulse"
            aria-hidden="true"
          />
        </button>
      )}

      {/* Reveal sheet */}
      {open && reward && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sb-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-[min(360px,90vw)] rounded-2xl bg-white p-6 shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="סגור"
              className="absolute top-4 end-4 size-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            >
              <X className="size-4" aria-hidden="true" />
            </button>

            <div
              className="text-6xl mb-3 animate-bounce"
              aria-hidden="true"
              style={{ animationDuration: "0.6s", animationIterationCount: 3 }}
            >
              {reward.emoji}
            </div>

            <h2 id="sb-title" className="text-xl font-bold text-rose-700 mb-2">
              {greeting.greeting}
            </h2>
            <p className="text-sm text-gray-600 mb-4">{greeting.ctaPrefix}</p>

            <div className="bg-amber-50 rounded-lg p-4 mb-4 border border-amber-200">
              <p className="text-xs text-amber-700 mb-1">קיבלת:</p>
              <p className="text-lg font-bold text-amber-900">{reward.displayLabel}</p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-3 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors duration-200"
            >
              איזה כיף! 💖
            </button>
          </div>
        </div>
      )}
    </>
  );
}
