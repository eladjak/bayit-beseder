"use client";

import { useEffect } from "react";

export function isConfirmedCompletion(result: { id: string } | null): boolean {
  return !!result && !result.id.startsWith("offline-");
}

/** Confetti accompanies the existing success toast after server confirmation. */
export function JoyCompletion({ confirmation }: { confirmation: number }) {
  useEffect(() => {
    if (!confirmation) return;
    let active = true;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void import("canvas-confetti").then(({ default: confetti }) => {
        if (!active) return;
        void confetti({ particleCount: 24, spread: 55, origin: { y: 0.65 }, colors: ["#4F46E5", "#FBBF24", "#FB7185", "#34D399"], disableForReducedMotion: true });
      }).catch(() => { /* The text acknowledgement remains available. */ });
    }
    return () => { active = false; };
  }, [confirmation]);
  return null;
}
