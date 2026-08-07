"use client";

/**
 * Welcome Gift Modal — Sprint 7.30 Loop L.
 *
 * Auto-pops after onboarding completion. One-shot via localStorage flag.
 * Tap → grants bonus + dismisses + sets flag.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  WELCOME_GIFT,
  markWelcomeGiftClaimed,
  shouldShowWelcomeGift,
  claimWelcomeGiftOnce,
} from "@/lib/welcome-gift";
import { playSparkle } from "@/lib/sound-effects";
import { tryHaptic } from "@/lib/ux-preferences";

export function WelcomeGiftModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Defer to next tick so onboarding-done flag (set on close) is read
    const id = window.setTimeout(() => {
      if (shouldShowWelcomeGift()) setOpen(true);
    }, 600);
    return () => clearTimeout(id);
  }, []);

  const handleClaim = () => {
    playSparkle();
    tryHaptic([10, 30, 10, 30, 50]);
    markWelcomeGiftClaimed();
    setOpen(false);
    // Grant AT MOST ONCE PER USER, enforced server-side (see claimWelcomeGiftOnce).
    // The localStorage flag above only stops the modal reappearing on THIS device;
    // it is not, and never was, sufficient to gate the points.
    void (async () => {
      try {
        const { createClient } = await import("@/lib/supabase");
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (!userId) return;
        const granted = await claimWelcomeGiftOnce(
          supabase as unknown as Parameters<typeof claimWelcomeGiftOnce>[0],
          userId,
          WELCOME_GIFT.bonusPoints,
        );
        if (granted) {
          toast.success(
            `🎁 קיבלתם ${WELCOME_GIFT.bonusPoints} נקודות בונוס + ${WELCOME_GIFT.freeSurpriseBoxes} קופסת הפתעה חינם!`,
          );
        } else {
          toast.success("ברוכים השבים! 🎁 את מתנת ההצטרפות כבר קיבלתם");
        }
      } catch {
        /* non-blocking */
      }
    })();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wg-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="alopik-settle w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex justify-end px-3 pt-3">
          <button
            type="button"
            onClick={handleClaim}
            aria-label="סגור"
            className="size-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 pb-6 text-center">
          <div
            className="text-7xl mb-4"
            aria-hidden="true"
            style={{ animation: "wgRise 500ms ease-out" }}
          >
            {WELCOME_GIFT.emoji}
          </div>
          <h2 id="wg-title" className="text-xl font-bold text-indigo-700 mb-2 text-balance">
            {WELCOME_GIFT.title}
          </h2>
          <p className="text-sm text-gray-600 mb-5 text-pretty">{WELCOME_GIFT.subtitle}</p>

          <div className="bg-violet-50 rounded-xl p-4 mb-5 border border-violet-200">
            <ul className="text-start space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Sparkles className="size-4 text-violet-600 shrink-0" aria-hidden="true" />
                <span>
                  <b>{WELCOME_GIFT.bonusPoints} נקודות בונוס</b> כדי שלא תתחילו מאפס
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="size-4 text-violet-600 shrink-0" aria-hidden="true" />
                <span>
                  <b>{WELCOME_GIFT.freeSurpriseBoxes} קופסת הפתעה</b> שאתם יכולים לפתוח עכשיו
                </span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleClaim}
            className="w-full py-3 rounded-xl alopik-brand-gradient text-white font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-transform"
          >
            🎉 פתחתי את המתנה!
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes wgRise {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.85) rotate(-5deg);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0);
          }
        }
      `}</style>
    </div>
  );
}
