"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function isConfirmedCompletion(result: { id: string } | null): boolean {
  return !!result && !result.id.startsWith("offline-");
}

/** A brief, non-blocking acknowledgement only after the server confirms completion. */
export function JoyCompletion({ confirmation, message }: { confirmation: number; message: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!confirmation) return;
    const show = window.setTimeout(() => setVisible(true), 0);
    const hide = window.setTimeout(() => setVisible(false), 2800);
    let active = true;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void import("canvas-confetti").then(({ default: confetti }) => {
        if (!active) return;
        void confetti({ particleCount: 24, spread: 55, origin: { y: 0.65 }, colors: ["#4F46E5", "#FBBF24", "#FB7185", "#34D399"], disableForReducedMotion: true });
      }).catch(() => { /* The text acknowledgement remains available. */ });
    }
    return () => { active = false; window.clearTimeout(show); window.clearTimeout(hide); };
  }, [confirmation]);
  if (!visible) return null;
  return <div data-joy-restore="completion" className="joy-completion pointer-events-none fixed inset-x-4 top-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-lg" role="status">
    <Image src="/illustrations/tasks-done.jpg" alt="" width={72} height={72} className="h-16 w-16 rounded-xl object-cover" />
    <p className="font-bold text-foreground">{message}</p>
  </div>;
}
