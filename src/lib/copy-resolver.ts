/**
 * Copy Resolver — Sprint 7.30+ Elad: adapt all microcopy by household type.
 *
 * Pattern: every user-facing string with "we/us/partner/family" gets variants
 * per household-type. Single source of truth.
 *
 * Usage: `t("dashboard.empty.tasks", household.type)` → correct variant.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md (multi-household-type)
 */

import { loadHousehold, type HouseholdType } from "@/lib/household-type";

export type CopyVariants = Partial<Record<HouseholdType, string>> & {
  readonly default: string;
};

/** Resolve a string variant based on current household type */
export function resolveCopy(variants: CopyVariants): string {
  const cfg = loadHousehold();
  return variants[cfg.type] ?? variants.default;
}

/** Key copy banks — extend over time */
export const COPY = {
  // Dashboard greeting
  greetingSuffix: {
    couple: "ההתייצבות שלנו היא הניצחון",
    family: "הבית מסודר ביחד — כל אחד תורם",
    roommates: "כי שותפים זה לחלק הוגן",
    solo: "אני בהובלה. בשקט. בלי דרמות",
    default: "ההתייצבות היא הניצחון",
  } satisfies CopyVariants,

  // Empty state CTA
  emptyTasksCta: {
    couple: "בואו נוסיף משימה אחת קטנה ביחד",
    family: "תוסיפו משימה — גם הילדים יראו אותה",
    roommates: "תוסיפו משימה ראשונה — כולם יראו",
    solo: "תוסיף משימה ראשונה",
    default: "תוסיפו משימה ראשונה",
  } satisfies CopyVariants,

  // Partner reference
  partnerNoun: {
    couple: "השותף/ה",
    family: "הצוות במשפחה",
    roommates: "השותפים",
    solo: "אתה",
    default: "השותף/ה",
  } satisfies CopyVariants,

  // Quick Love button label
  quickLoveAria: {
    couple: "שלח לב לשותף/ה",
    family: "שלח לב למישהו מהמשפחה",
    roommates: "שלח לב לאחד השותפים",
    solo: "שלח לב לעצמך 💖",
    default: "שלח לב",
  } satisfies CopyVariants,

  // Wheel of fortune description
  wheelDesc: {
    couple: "פעם בשבוע. בשבילכם.",
    family: "פעם בשבוע. כל המשפחה.",
    roommates: "פעם בשבוע. השותפים יחד.",
    solo: "פעם בשבוע. רק לך.",
    default: "פעם בשבוע. ביחד.",
  } satisfies CopyVariants,

  // Settings header "pets"
  petsHeader: {
    couple: "החבר/ה לדרך 🐾",
    family: "החבר/ה של המשפחה 🐾",
    roommates: "החבר/ה של הבית 🐾",
    solo: "החבר/ה שלך 🐾",
    default: "החבר/ה לדרך 🐾",
  } satisfies CopyVariants,
} as const;

/** Helper for one-shot resolution */
export function copy(key: keyof typeof COPY): string {
  return resolveCopy(COPY[key]);
}
