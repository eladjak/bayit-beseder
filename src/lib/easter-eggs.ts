/**
 * Easter Eggs — Sprint 7.30+ our differentiator vs Alopik.
 *
 * Konami code (↑↑↓↓←→←→BA) — unlocks epic dragon + epic background early.
 * 100-tap on logo — same.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

import { addToCollection } from "@/lib/pets";

const KONAMI: ReadonlyArray<string> = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const TAP_THRESHOLD = 100;
const TAP_WINDOW_MS = 30_000;
const STORAGE_KEY = "bayit-easter-eggs-fired-v1";
const TAP_KEY = "bayit-logo-tap-count-v1";

export type EasterEggKind = "konami" | "logo-100";

type FiredEggs = Record<EasterEggKind, boolean>;

const DEFAULT_FIRED: FiredEggs = { konami: false, "logo-100": false };

export function loadFired(): FiredEggs {
  if (typeof window === "undefined") return DEFAULT_FIRED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_FIRED, ...JSON.parse(raw) } : DEFAULT_FIRED;
  } catch {
    return DEFAULT_FIRED;
  }
}

function markFired(kind: EasterEggKind): void {
  if (typeof window === "undefined") return;
  const f = loadFired();
  f[kind] = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
  } catch {
    // quota
  }
}

/** Unlock epic-tier rewards (dragon + unicorn pets, sunset-desert + northern-lights bgs) */
function unlockEpicTier(): void {
  addToCollection("dragon");
  addToCollection("unicorn");
  // Note: backgrounds collection is a separate localStorage key — add there too
  if (typeof window === "undefined") return;
  try {
    const bgKey = "bayit-bg-collection-v1";
    const raw = localStorage.getItem(bgKey);
    const set = new Set(raw ? (JSON.parse(raw) as string[]) : []);
    set.add("sunset-desert");
    set.add("northern-lights");
    localStorage.setItem(bgKey, JSON.stringify([...set]));
  } catch {
    /* quota */
  }
}

/** Register Konami listener. Returns cleanup function. */
export function registerKonamiListener(onTrigger: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const fired = loadFired();
  if (fired.konami) return () => {};

  let buffer: string[] = [];
  const onKey = (e: KeyboardEvent) => {
    buffer = [...buffer, e.key].slice(-KONAMI.length);
    if (buffer.length !== KONAMI.length) return;
    const match = buffer.every((k, i) => k.toLowerCase() === (KONAMI[i] as string).toLowerCase());
    if (match) {
      unlockEpicTier();
      markFired("konami");
      onTrigger();
      buffer = [];
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}

/** Register tap-count on a DOM element. Returns cleanup. */
export function registerLogoTapListener(el: HTMLElement, onTrigger: () => void): () => void {
  if (typeof window === "undefined" || !el) return () => {};
  const fired = loadFired();
  if (fired["logo-100"]) return () => {};

  const onTap = () => {
    const now = Date.now();
    let count = 0;
    let windowStart = now;
    try {
      const raw = localStorage.getItem(TAP_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { count: number; windowStart: number };
        if (now - parsed.windowStart < TAP_WINDOW_MS) {
          count = parsed.count;
          windowStart = parsed.windowStart;
        }
      }
    } catch {
      /* corrupt */
    }
    count += 1;
    try {
      localStorage.setItem(TAP_KEY, JSON.stringify({ count, windowStart }));
    } catch {
      /* quota */
    }
    if (count >= TAP_THRESHOLD) {
      unlockEpicTier();
      markFired("logo-100");
      onTrigger();
      try {
        localStorage.removeItem(TAP_KEY);
      } catch {
        /* */
      }
    }
  };
  el.addEventListener("click", onTap);
  return () => el.removeEventListener("click", onTap);
}
