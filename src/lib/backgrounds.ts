/**
 * Background Themes — Alopik v2 Phase 3 #8.
 *
 * 10 ambient backgrounds. Unlock by streak milestones.
 * Applied via CSS gradient on body/main wrapper.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

export type Background = {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly gradient: string;
  readonly unlockStreak: number;
};

export const BACKGROUNDS: ReadonlyArray<Background> = [
  // Starters (3)
  { id: "default", name: "ברירת מחדל", emoji: "🏡", gradient: "linear-gradient(180deg, #fafaf9 0%, #fef2f2 100%)", unlockStreak: 0 },
  { id: "warm-rose", name: "ורד חם", emoji: "🌹", gradient: "linear-gradient(180deg, #fff1f2 0%, #ffe4e6 100%)", unlockStreak: 0 },
  { id: "soft-cream", name: "קרם רך", emoji: "🍦", gradient: "linear-gradient(180deg, #fefce8 0%, #fef3c7 100%)", unlockStreak: 0 },

  // Streak 7+ (3)
  { id: "sunrise", name: "זריחה", emoji: "🌅", gradient: "linear-gradient(180deg, #fed7aa 0%, #fbbf24 50%, #f97316 100%)", unlockStreak: 7 },
  { id: "ocean", name: "ים", emoji: "🌊", gradient: "linear-gradient(180deg, #cffafe 0%, #67e8f9 50%, #0891b2 100%)", unlockStreak: 7 },
  { id: "forest", name: "יער", emoji: "🌲", gradient: "linear-gradient(180deg, #d1fae5 0%, #6ee7b7 50%, #047857 100%)", unlockStreak: 7 },

  // Streak 21+ (2)
  { id: "mediterranean", name: "ים תיכון", emoji: "🌴", gradient: "linear-gradient(180deg, #fef3c7 0%, #fde68a 30%, #67e8f9 100%)", unlockStreak: 21 },
  { id: "jerusalem-stone", name: "אבן ירושלמית", emoji: "🏛️", gradient: "linear-gradient(180deg, #f5f5f4 0%, #d6d3d1 50%, #a8a29e 100%)", unlockStreak: 21 },

  // Streak 45+ (2 — epic)
  { id: "sunset-desert", name: "שקיעה במדבר", emoji: "🏜️", gradient: "linear-gradient(180deg, #fef3c7 0%, #fb923c 30%, #be185d 70%, #4c1d95 100%)", unlockStreak: 45 },
  { id: "northern-lights", name: "אורות הצפון", emoji: "🌌", gradient: "linear-gradient(180deg, #0c0a09 0%, #1e1b4b 30%, #14b8a6 60%, #34d399 100%)", unlockStreak: 45 },
];

const ACTIVE_KEY = "bayit-bg-active-v1";
const COLLECTION_KEY = "bayit-bg-collection-v1";

export function getActiveBackground(): Background {
  if (typeof window === "undefined") return BACKGROUNDS[0] as Background;
  const id = localStorage.getItem(ACTIVE_KEY);
  return BACKGROUNDS.find((b) => b.id === id) ?? (BACKGROUNDS[0] as Background);
}

export function setActiveBackground(bgId: string): void {
  if (typeof window === "undefined") return;
  const bg = BACKGROUNDS.find((b) => b.id === bgId);
  if (!bg) return;
  localStorage.setItem(ACTIVE_KEY, bgId);
  applyBackgroundToDom(bg);
}

export function applyBackgroundToDom(bg: Background): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--alopik-bg-gradient", bg.gradient);
}

export function getBackgroundCollection(): ReadonlySet<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(COLLECTION_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function syncBackgroundCollectionWithStreak(currentStreak: number): readonly Background[] {
  if (typeof window === "undefined") return [];
  const collected = new Set(getBackgroundCollection());
  const newlyUnlocked: Background[] = [];
  for (const bg of BACKGROUNDS) {
    if (bg.unlockStreak <= currentStreak && !collected.has(bg.id)) {
      collected.add(bg.id);
      newlyUnlocked.push(bg);
    }
  }
  if (newlyUnlocked.length > 0) {
    try {
      localStorage.setItem(COLLECTION_KEY, JSON.stringify([...collected]));
    } catch {
      /* quota */
    }
  }
  return newlyUnlocked;
}
