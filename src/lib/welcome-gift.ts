/**
 * Welcome Gift — Sprint 7.30 Loop L (Alopik final review backlog).
 *
 * Post-onboarding instant gratification: 50 bonus points + 1 free Surprise Box redeem.
 * Triggered once per user via localStorage flag.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

const STORAGE_KEY = "bayit-welcome-gift-claimed-v1";

export type WelcomeGift = {
  readonly bonusPoints: number;
  readonly freeSurpriseBoxes: number;
  readonly title: string;
  readonly subtitle: string;
  readonly emoji: string;
};

export const WELCOME_GIFT: WelcomeGift = {
  bonusPoints: 50,
  freeSurpriseBoxes: 1,
  title: "מתנת ברוכים הבאים 🎁",
  subtitle: "50 נקודות בונוס + קופסת הפתעה חינם — לפתיחה מצוינת",
  emoji: "🎁",
};

export function hasClaimedWelcomeGift(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function markWelcomeGiftClaimed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // quota
  }
}

export function shouldShowWelcomeGift(): boolean {
  if (typeof window === "undefined") return false;
  // Show only after onboarding finished AND not yet claimed
  const onboardingDone = localStorage.getItem("bayit-onboarding-done-v1") === "1";
  return onboardingDone && !hasClaimedWelcomeGift();
}
