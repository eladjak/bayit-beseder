"use client";

/**
 * Celebration Toast — Alopik v2 Phase 3.
 *
 * Stack of newly-unlocked pets/backgrounds. Emoji rises + fades.
 * Auto-dismisses after 3.5s per item. Stacked vertically if multiple.
 * Plays unlock chime via sound-effects.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

import { useEffect, useState } from "react";
import { playUnlockChime } from "@/lib/sound-effects";

type Item = {
  readonly id: string;
  readonly emoji: string;
  readonly title: string;
  readonly subtitle?: string;
};

type Props = {
  /** New items to celebrate. Adding to this array triggers a toast per item. */
  readonly items: readonly Item[];
};

export function CelebrationToast({ items }: Props) {
  const [visible, setVisible] = useState<readonly Item[]>([]);

  useEffect(() => {
    if (items.length === 0) return;
    setVisible((prev) => [...prev, ...items]);
    playUnlockChime();
    // Auto-dismiss each after 3.5s (staggered by 200ms per item)
    items.forEach((item, idx) => {
      window.setTimeout(() => {
        setVisible((cur) => cur.filter((i) => i.id !== item.id));
      }, 3500 + idx * 200);
    });
  }, [items]);

  if (visible.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {visible.map((item, idx) => (
        <div
          key={item.id}
          className="bg-white rounded-xl shadow-2xl border-2 border-violet-300 px-5 py-3 flex items-center gap-3 max-w-xs"
          style={{
            animation: `celebRise 400ms ease-out`,
            animationDelay: `${idx * 100}ms`,
            animationFillMode: "backwards",
          }}
        >
          <span className="text-3xl" aria-hidden="true">{item.emoji}</span>
          <div className="text-start">
            <p className="text-sm font-bold text-violet-900">פתחת: {item.title}</p>
            {item.subtitle && (
              <p className="text-[11px] text-violet-700">{item.subtitle}</p>
            )}
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes celebRise {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
