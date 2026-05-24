/**
 * Sound Effects — Alopik v2 Phase 3.5.
 *
 * Tiny WebAudio synth tones (no asset files needed). Gated by ux-preferences:
 * disabled if `sounds=false` or `nightMode=true`.
 *
 * Designed for: Quick Love send (heart-pop), Surprise Box open (sparkle),
 * Wheel spin (spinning chime), Onboarding finish (success chord).
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

import { shouldPlaySound } from "@/lib/ux-preferences";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioCtx = new Ctor();
  } catch {
    return null;
  }
  return audioCtx;
}

type Note = { freq: number; duration: number; delay?: number; type?: OscillatorType };

function playSequence(notes: readonly Note[], gainPeak = 0.08): void {
  if (!shouldPlaySound()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const start = t0 + (n.delay ?? 0);
    const end = start + n.duration;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(gainPeak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

/** Heart pop — Quick Love send */
export function playHeartPop(): void {
  playSequence([
    { freq: 880, duration: 0.08, type: "sine" },
    { freq: 1320, duration: 0.12, delay: 0.06, type: "sine" },
  ]);
}

/** Sparkle — Surprise Box reveal */
export function playSparkle(): void {
  playSequence(
    [
      { freq: 1568, duration: 0.05, type: "triangle" },
      { freq: 2093, duration: 0.05, delay: 0.05, type: "triangle" },
      { freq: 2637, duration: 0.08, delay: 0.1, type: "triangle" },
      { freq: 3136, duration: 0.12, delay: 0.18, type: "sine" },
    ],
    0.06,
  );
}

/** Spinning chime — Weekly Wheel motion */
export function playSpinChime(): void {
  playSequence(
    [
      { freq: 523, duration: 0.06, type: "sine" },
      { freq: 659, duration: 0.06, delay: 0.08, type: "sine" },
      { freq: 784, duration: 0.06, delay: 0.16, type: "sine" },
      { freq: 1047, duration: 0.18, delay: 0.24, type: "sine" },
    ],
    0.05,
  );
}

/** Success chord — Onboarding complete / milestone */
export function playSuccessChord(): void {
  playSequence(
    [
      { freq: 523, duration: 0.18, type: "sine" }, // C5
      { freq: 659, duration: 0.18, delay: 0.04, type: "sine" }, // E5
      { freq: 784, duration: 0.22, delay: 0.08, type: "sine" }, // G5
    ],
    0.07,
  );
}

/** Soft chime — pet/background unlock */
export function playUnlockChime(): void {
  playSequence(
    [
      { freq: 1175, duration: 0.1, type: "sine" }, // D6
      { freq: 1568, duration: 0.18, delay: 0.08, type: "sine" }, // G6
    ],
    0.06,
  );
}
