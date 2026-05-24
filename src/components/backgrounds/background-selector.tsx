"use client";

/**
 * Background Selector — Alopik v2 Phase 3 #8.
 *
 * Grid of 10 backgrounds. Active = rose ring. Locked = dim + lock icon.
 * Tap → applies gradient to <html> via CSS var --alopik-bg-gradient.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import {
  BACKGROUNDS,
  getActiveBackground,
  setActiveBackground,
  getBackgroundCollection,
  type Background,
} from "@/lib/backgrounds";

type Props = {
  readonly currentStreak: number;
};

export function BackgroundSelector({ currentStreak }: Props) {
  const [activeId, setActiveId] = useState<string>("default");
  const [collected, setCollected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActiveId(getActiveBackground().id);
    setCollected(new Set(getBackgroundCollection()));
  }, []);

  const handleSelect = (bg: Background) => {
    if (bg.unlockStreak > currentStreak && !collected.has(bg.id)) return;
    setActiveBackground(bg.id);
    setActiveId(bg.id);
  };

  return (
    <div className="alopik-card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">רקע האפליקציה</h3>
        <span className="text-[11px] text-gray-500 tabular-nums">
          {collected.size}/{BACKGROUNDS.length} פתוחים
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {BACKGROUNDS.map((bg) => {
          const unlocked = bg.unlockStreak <= currentStreak || collected.has(bg.id);
          const isActive = activeId === bg.id;
          return (
            <button
              key={bg.id}
              type="button"
              onClick={() => handleSelect(bg)}
              disabled={!unlocked}
              aria-label={`${bg.name}${unlocked ? "" : ` — נפתח בstreak ${bg.unlockStreak}`}`}
              aria-pressed={isActive}
              className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-transform duration-150 ${
                unlocked
                  ? "border-gray-200 hover:scale-105 active:scale-95 cursor-pointer"
                  : "border-gray-100 opacity-40 cursor-not-allowed"
              } ${isActive ? "!border-indigo-600 ring-2 ring-indigo-200" : ""}`}
              style={{ background: bg.gradient }}
            >
              <span
                className="absolute inset-0 flex items-end justify-center pb-1.5 text-xl drop-shadow"
                aria-hidden="true"
              >
                {bg.emoji}
              </span>
              {isActive && (
                <Check
                  className="absolute -top-1 -end-1 size-4 text-white bg-indigo-600 rounded-full p-0.5"
                  aria-hidden="true"
                />
              )}
              {!unlocked && (
                <Lock
                  className="absolute bottom-1 end-1 size-3 text-white drop-shadow"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-500 mt-3 text-center">
        רקעים חדשים נפתחים בstreak 7 / 21 / 45 ימים.
      </p>
    </div>
  );
}
